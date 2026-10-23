<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { RotateCcw, SendHorizontal, TriangleAlert, RefreshCw } from 'lucide-vue-next';
import BottomSheet from './BottomSheet.vue';
import chatGPTService from '../services/chatgpt';
import { apiFetch } from '../services/api';
import { renderChatMarkdown } from '../utils/chatMarkdown';
import { trimHistory, quickRepliesMessageId, sanitizeQuickReplies } from '../utils/chatHelpers';
import { loadPending, savePending, clearPending, createPollGuard, chatErrorMessage } from '../services/chatPending';

// Props
interface Props {
  entrenoId?: number;
  entrenoData?: any;
  series?: any[];
  ejercicios?: any[];
}

const props = withDefaults(defineProps<Props>(), {
  entrenoId: undefined,
  entrenoData: undefined,
  series: () => [],
  ejercicios: () => []
});

// Definir emits
const emit = defineEmits(['refresh']);

// Estados reactivos
const route = useRoute();
const router = useRouter();
// El chat vive en una hoja inferior que se abre con ?chat=1 (lo pone la pantalla del entreno o la navegación)
const isOpen = computed(() => route.query.chat === '1');
const closeChat = () => {
  const { chat: _chat, ...rest } = route.query;
  void router.replace({ query: rest });
};
const openChat = () => {
  void router.replace({ query: { ...route.query, chat: '1' } });
};
const messages = ref<Array<{id: number, text: string, isUser: boolean, timestamp: Date, quickReplies?: string[], isError?: boolean}>>([]);
const newMessage = ref('');
const isLoading = ref(false);
const isFirstMessage = ref(true);
const messagesContainer = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLTextAreaElement | null>(null);
const mounted = ref(true);


// Mensaje de bienvenida
const welcomeMessage = computed(() => {
  return 'Conozco tu historial, tus récords y qué músculos llevan más tiempo sin trabajar. Pídeme el entreno de hoy o elige una sugerencia.';
});

const QUICK_PROMPTS = [
  'Propón el entreno de hoy',
  'Dame 2 opciones distintas',
  '¿Qué músculo me toca?',
  '¿En qué ejercicio estoy estancado?',
  'Hoy estoy cansado, algo ligero',
];

// Las sugerencias solo se muestran mientras no haya conversación
const showQuickPrompts = computed(() => !isLoading.value && !messages.value.some(m => m.isUser));

const sendQuickPrompt = (text: string) => {
  newMessage.value = text;
  sendMessage();
};

const autoResize = () => {
  const el = inputRef.value;
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
};

// Al abrir: bienvenida si no hay conversación, scroll al final y foco en el campo de texto
const onOpened = () => {
  if (messages.value.length === 0) {
    messages.value.push({ id: Date.now(), text: welcomeMessage.value, isUser: false, timestamp: new Date() });
  }
  // BottomSheet enfoca su panel tras el nextTick; el foco al campo va después
  nextTick(() => {
    scrollToBottom();
    setTimeout(() => inputRef.value?.focus(), 60);
  });
};

watch(isOpen, (open) => {
  if (open) onOpened();
  keyboardInset(open);
});

// Mantiene el compositor sobre el teclado móvil: reduce la hoja según el viewport visual
let vv: VisualViewport | null = null;
const updateKeyboard = () => {
  if (!vv) return;
  const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
  document.documentElement.style.setProperty('--chat-kb', `${Math.round(inset)}px`);
  nextTick(scrollToBottom);
};
const keyboardInset = (open: boolean) => {
  if (typeof window === 'undefined' || !window.visualViewport) return;
  if (open && !vv) {
    vv = window.visualViewport;
    vv.addEventListener('resize', updateKeyboard);
    vv.addEventListener('scroll', updateKeyboard);
    updateKeyboard();
  } else if (!open && vv) {
    vv.removeEventListener('resize', updateKeyboard);
    vv.removeEventListener('scroll', updateKeyboard);
    vv = null;
    document.documentElement.style.removeProperty('--chat-kb');
  }
};

// Consulta frecuente para que el texto aparezca casi en tiempo real (lecturas D1 baratas)
const POLL_INTERVAL_MS = 600;
const MAX_POLL_FAILURES = 5;

type ChatStatus = {
  status: string; fullText: string;
  workoutUpdated: boolean; error?: string;
  phase?: string | null;
  quickReplies?: string[] | null;
};

// Fase visible (Pensando…, Añadiendo 3 series…); vacía cuando no hay respuesta en curso
const phase = ref('');
// Mientras se escribe el texto ya es la señal de progreso: la línea de estado solo sirve para pensar y herramientas
const statusLine = computed(() => (isLoading.value && phase.value && phase.value !== 'Escribiendo…') ? phase.value : '');
// Mensaje bajo el que se muestran las respuestas rápidas (solo el último del bot)
const chipsMessageId = computed(() => quickRepliesMessageId(messages.value, isLoading.value));
// El texto de la última burbuja del bot todavía está vacío (indicador de escritura en lugar de línea de estado)
const awaitingFirstText = computed(() => isLoading.value && (!messages.value.length || messages.value[messages.value.length - 1]?.text === ''));

// Un solo bucle de polling a la vez (enviar y retomar nunca lo duplican)
const pollGuard = createPollGuard();
// Despierta al bucle pausado mientras la página está oculta
let wakeWaiters: Array<() => void> = [];
const waitUntilVisible = () => new Promise<void>(resolve => {
  if (!document.hidden) return resolve();
  wakeWaiters.push(resolve);
});
const wakePoller = () => {
  const waiters = wakeWaiters;
  wakeWaiters = [];
  waiters.forEach(w => w());
};

// Último mensaje del bot que recibe el texto de la respuesta; lo recrea si se perdió el marcador
const ensureBotMessage = (botMessageId: number) => {
  let botMsg = messages.value.find(m => m.id === botMessageId);
  if (!botMsg) {
    messages.value.push({ id: botMessageId, text: '', isUser: false, timestamp: new Date() });
    botMsg = messages.value.find(m => m.id === botMessageId)!;
  }
  return botMsg;
};

/**
 * Sondea el job hasta que termine (done/error). Mientras la página está oculta se pausa (el servidor
 * sigue trabajando en la cola) y se reanuda al volver. Lanza Error con el texto para el usuario si falla.
 */
const pollJob = async (jobId: string, botMessageId: number): Promise<void> => {
  const token = pollGuard.start();
  if (token === null) return; // ya hay otro bucle sondeando
  let pollFailures = 0;
  try {
    while (mounted.value && pollGuard.isCurrent(token)) {
      if (document.hidden) {
        await waitUntilVisible();
        continue;
      }
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
      if (!mounted.value || !pollGuard.isCurrent(token)) break;
      if (document.hidden) continue;

      let status: ChatStatus;
      try {
        status = await apiFetch<ChatStatus>('/api/chatStatus', { jobId });
        pollFailures = 0;
      } catch (pollError: any) {
        // Errores de red puntuales se reintentan; un job perdido o fallos repetidos no
        if (pollError.message?.includes('Job no encontrado') || ++pollFailures >= MAX_POLL_FAILURES) {
          clearPending(props.entrenoId);
          // Puede que el plan ya se haya aplicado: refrescar para mostrar lo guardado
          emit('refresh');
          throw new Error('Se perdió la conexión con el entrenador. Inténtalo de nuevo.');
        }
        console.warn('Poll retry:', pollError);
        continue;
      }
      if (!mounted.value || !pollGuard.isCurrent(token)) break;

      phase.value = status.phase || '';
      // El backend devuelve el texto acumulado hasta el momento
      if (status.fullText) {
        const botMsg = ensureBotMessage(botMessageId);
        if (botMsg.text !== status.fullText) {
          botMsg.text = status.fullText;
          nextTick(() => scrollToBottom());
        }
      }

      if (status.status === 'done') {
        const botMsg = ensureBotMessage(botMessageId);
        botMsg.text = status.fullText;
        botMsg.quickReplies = sanitizeQuickReplies(status.quickReplies);
        clearPending(props.entrenoId);
        // Siempre se refresca: es barato y evita páginas desfasadas
        emit('refresh');
        break;
      }
      if (status.status === 'error') {
        console.error('Error del entrenador:', status.error);
        clearPending(props.entrenoId);
        // Un plan parcial pudo aplicarse antes del fallo
        emit('refresh');
        throw new Error(chatErrorMessage(status.error));
      }
    }
  } finally {
    pollGuard.stop(token);
    phase.value = '';
  }
};

// Envuelve el polling: estado de carga y mensaje de error en la burbuja del bot
const followJob = async (jobId: string, botMessageId: number) => {
  isLoading.value = true;
  try {
    await pollJob(jobId, botMessageId);
    if (isFirstMessage.value) {
      isFirstMessage.value = false;
    }
  } catch (error: any) {
    const botMsg = ensureBotMessage(botMessageId);
    botMsg.text = error.message || 'Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta de nuevo.';
    botMsg.isError = true;
  } finally {
    // Si otro bucle sigue activo (no debería) no se baja el estado de carga
    if (!pollGuard.busy) isLoading.value = false;
  }
};

// Retoma un job en curso de este entreno (al montar o al volver a la pestaña)
const resumePending = () => {
  if (pollGuard.busy) return;
  const pending = loadPending(props.entrenoId);
  if (!pending) return;
  ensureBotMessage(pending.botMessageId);
  void followJob(pending.jobId, pending.botMessageId);
};

const handleVisibility = () => {
  if (document.hidden) return;
  wakePoller();
  resumePending();
};

const sendMessage = () => sendText(newMessage.value);

const sendText = async (raw: string) => {
  const userMessage = raw.trim();
  if (!userMessage || isLoading.value) return;

  // Al enviar cualquier cosa desaparecen las respuestas rápidas anteriores
  messages.value.forEach(m => { if (m.quickReplies) m.quickReplies = undefined; });
  messages.value.push({ id: Date.now(), text: userMessage, isUser: true, timestamp: new Date() });
  newMessage.value = '';
  nextTick(autoResize);
  isLoading.value = true;

  const botMessageId = Date.now() + 1;
  messages.value.push({ id: botMessageId, text: '', isUser: false, timestamp: new Date() });

  try {
    if (!props.entrenoData) {
      throw new Error('Los datos del entrenamiento no están disponibles. Por favor, espera un momento.');
    }

    const currentTraining = {
      entreno: props.entrenoData,
      series: props.series || [],
      ejercicios: props.ejercicios || []
    };

    const rawHistory = messages.value.slice(0, -2);
    const firstUserIndex = rawHistory.findIndex(msg => msg.isUser);
    const validHistory = firstUserIndex !== -1 ? rawHistory.slice(firstUserIndex) : [];

    // Solo los últimos mensajes: el historial largo encarece y ralentiza la respuesta
    const history = trimHistory(validHistory.map(msg => ({
      role: msg.isUser ? 'user' as const : 'assistant' as const,
      content: msg.text
    })));

    // 1) Lanzar trabajo. El requestId hace el envío idempotente: si la petición se repite,
    // el backend devuelve el mismo job en vez de duplicar las series.
    const requestId = crypto.randomUUID();
    const launch = await apiFetch<{ jobId: string }>('/api/coach', {
      message: userMessage, currentTraining, chatId: null, history, requestId
    });

    // Se guarda el job en curso: si se bloquea la pantalla o se cierra la app, se retoma al volver
    savePending(props.entrenoId, { jobId: launch.jobId, botMessageId, requestId, startedAt: Date.now() });
  } catch (error: any) {
    const botMsg = ensureBotMessage(botMessageId);
    botMsg.text = error.message || 'Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta de nuevo.';
    botMsg.isError = true;
    isLoading.value = false;
    return;
  }

  // 2) Polling hasta que termine
  const pending = loadPending(props.entrenoId);
  if (pending && pending.botMessageId === botMessageId) {
    await followJob(pending.jobId, botMessageId);
  } else {
    isLoading.value = false;
  }
};

const sendQuickReply = (text: string) => {
  void sendText(text);
};

// Reintentar: quita el error y el mensaje del usuario que lo provocó, y lo envía de nuevo
const retryLast = (errorId: number) => {
  if (isLoading.value) return;
  const idx = messages.value.findIndex(m => m.id === errorId);
  const prev = idx > 0 ? messages.value[idx - 1] : undefined;
  if (idx === -1 || !prev?.isUser) return;
  const text = prev.text;
  messages.value.splice(idx - 1, 2);
  void sendText(text);
};
const lastErrorId = computed(() => {
  if (isLoading.value) return null;
  const last = messages.value[messages.value.length - 1];
  return last?.isError ? last.id : null;
});

// Función para manejar Enter
const handleKeyPress = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    sendMessage();
  }
};

const scrollToBottom = () => {
  const scroller = messagesContainer.value?.closest('.sheet-body') as HTMLElement | null;
  if (scroller) scroller.scrollTop = scroller.scrollHeight;
};

// Cargar mensajes al montar el componente
onMounted(() => {
  // Limpia la clave global antigua (antes el historial se compartía entre entrenos)
  ['chatHistory', 'isFirstMessage', 'chatHistoryTimestamp', 'responseId'].forEach(k => localStorage.removeItem(k));
  const { messages: savedMessages, isFirstMessage: savedIsFirstMessage } = chatGPTService.loadMessages(props.entrenoId);
  messages.value = savedMessages;
  isFirstMessage.value = savedIsFirstMessage;
  
  document.addEventListener('visibilitychange', handleVisibility);
  if (isOpen.value) {
    onOpened();
    keyboardInset(true);
  }

  // Si había una respuesta en curso (pantalla bloqueada, app cerrada), se retoma
  resumePending();
});

onUnmounted(() => {
  mounted.value = false;
  pollGuard.cancel();
  wakePoller();
  document.removeEventListener('visibilitychange', handleVisibility);
  keyboardInset(false);
});

// Modificar el watch de messages
watch([messages, isFirstMessage], () => {
  chatGPTService.saveMessages(messages.value, isFirstMessage.value, props.entrenoId);
}, { deep: true });

// Modificar toggleChat
watch(messages, () => {
  nextTick(() => {
    scrollToBottom();
  });
}, { deep: true });

const resetConversation = () => {
  messages.value = [];
  isFirstMessage.value = true;
  chatGPTService.clearMessages(props.entrenoId);
  
  // Añadir mensaje de bienvenida
  messages.value.push({
    id: Date.now(),
    text: welcomeMessage.value,
    isUser: false,
    timestamp: new Date()
  });
  nextTick(() => inputRef.value?.focus());
};

</script>

<template>
  <div class="chatbot-root">
    <BottomSheet :open="isOpen" title="Entrenador" height="full" @close="closeChat">
      <template #header>
        <div class="chat-head">
          <h2 class="chat-title">Entrenador</h2>
          <span v-if="entrenoData?.Nom" class="chat-subtitle">{{ entrenoData.Nom }}</span>
        </div>
        <button type="button" class="chat-icon-btn" aria-label="Nueva conversación" title="Nueva conversación" @click="resetConversation">
          <RotateCcw :size="20" aria-hidden="true" />
        </button>
      </template>

      <div ref="messagesContainer" class="chat-messages" aria-live="polite" aria-relevant="additions text">
        <template v-for="message in messages" :key="message.id">
          <div
            v-show="message.text || message.isUser"
            class="message"
            :class="{ 'user-message': message.isUser, 'bot-message': !message.isUser, 'is-error': message.isError }"
          >
            <div class="message-content">
              <div v-if="message.isError" class="error-line">
                <TriangleAlert :size="16" aria-hidden="true" />
                <span class="message-text">{{ message.text }}</span>
              </div>
              <div v-else-if="message.isUser" class="message-text">{{ message.text }}</div>
              <!-- renderChatMarkdown escapa el HTML antes de aplicar formato -->
              <div v-else class="message-text md" v-html="renderChatMarkdown(message.text)"></div>
              <div class="message-foot">
                <button
                  v-if="message.id === lastErrorId"
                  type="button"
                  class="retry-btn"
                  @click="retryLast(message.id)"
                ><RefreshCw :size="14" aria-hidden="true" />Reintentar</button>
                <time class="message-time">{{ message.timestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) }}</time>
              </div>
              <!-- Línea de estado bajo el texto en streaming mientras corren herramientas -->
              <div v-if="statusLine && !awaitingFirstText && message.id === messages[messages.length - 1]?.id" class="phase-status" role="status"><span class="led-dot" aria-hidden="true"></span>{{ statusLine }}</div>
            </div>
          </div>
        </template>

        <!-- Respuestas rápidas del coach: solo bajo el último mensaje del bot -->
        <div v-if="chipsMessageId !== null" class="chips quick-replies" role="group" aria-label="Respuestas rápidas">
          <button
            v-for="(reply, i) in messages[messages.length - 1].quickReplies"
            :key="reply"
            type="button"
            class="chip"
            :class="{ 'chip--primary': i === 0 }"
            @click="sendQuickReply(reply)"
          >{{ reply }}</button>
        </div>

        <!-- Estado en curso hasta que llega el primer texto -->
        <div v-if="awaitingFirstText" class="message bot-message">
          <div class="message-content">
            <div class="phase-status" role="status"><span class="led-dot" aria-hidden="true"></span>{{ statusLine || 'Pensando…' }}</div>
          </div>
        </div>

        <div v-if="showQuickPrompts" class="chips prompts" role="group" aria-label="Sugerencias">
          <button
            v-for="(prompt, i) in QUICK_PROMPTS"
            :key="prompt"
            type="button"
            class="chip"
            :class="{ 'chip--primary': i === 0 }"
            :disabled="isLoading"
            @click="sendQuickPrompt(prompt)"
          >{{ prompt }}</button>
        </div>
      </div>

      <template #footer>
        <div class="composer">
          <textarea
            ref="inputRef"
            v-model="newMessage"
            class="composer-input"
            rows="1"
            placeholder="Pregunta a tu entrenador"
            aria-label="Mensaje"
            enterkeyhint="send"
            @keydown="handleKeyPress"
            @input="autoResize"
          ></textarea>
          <button
            type="button"
            class="send-btn"
            :disabled="!newMessage.trim() || isLoading"
            aria-label="Enviar"
            @click="sendMessage"
          ><SendHorizontal :size="20" aria-hidden="true" /></button>
        </div>
      </template>
    </BottomSheet>

    <!-- Con la hoja cerrada y una respuesta en curso: aviso discreto sobre la navegación inferior -->
    <Teleport to="body">
      <button v-if="isLoading && !isOpen" type="button" class="working-pill" aria-label="Entrenador respondiendo, abrir chat" @click="openChat">
        <span class="led-dot" aria-hidden="true"></span>Entrenador respondiendo…
      </button>
    </Teleport>
  </div>
</template>

<style src="../styles/chatbot.css"></style>
