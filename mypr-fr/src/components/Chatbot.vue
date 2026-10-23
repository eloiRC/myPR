<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
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
const isOpen = ref(false);
const messages = ref<Array<{id: number, text: string, isUser: boolean, timestamp: Date, quickReplies?: string[]}>>([]);
const newMessage = ref('');
const isLoading = ref(false);
const isFirstMessage = ref(true);
const messagesContainer = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLTextAreaElement | null>(null);
const mounted = ref(true);


// Mensaje de bienvenida
const welcomeMessage = computed(() => {
  return '¡Hola! Soy tu entrenador. Conozco tu historial, tus récords y qué músculos llevan más tiempo sin trabajar. Pídeme el entreno de hoy o elige una sugerencia.';
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

// Función para abrir/cerrar el chat
const toggleChat = () => {
  isOpen.value = !isOpen.value;
  
  if (isOpen.value) {
    if (messages.value.length === 0) {
      messages.value.push({
        id: Date.now(),
        text: welcomeMessage.value,
        isUser: false,
        timestamp: new Date()
      });
    }
    nextTick(() => {
      scrollToBottom();
      inputRef.value?.focus();
    });
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

// Función para manejar Enter
const handleKeyPress = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    sendMessage();
  }
};

const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

// Cargar mensajes al montar el componente
onMounted(() => {
  // Limpia la clave global antigua (antes el historial se compartía entre entrenos)
  ['chatHistory', 'isFirstMessage', 'chatHistoryTimestamp', 'responseId'].forEach(k => localStorage.removeItem(k));
  const { messages: savedMessages, isFirstMessage: savedIsFirstMessage } = chatGPTService.loadMessages(props.entrenoId);
  messages.value = savedMessages;
  isFirstMessage.value = savedIsFirstMessage;
  
  document.addEventListener('mousedown', handleClickOutside);
  document.addEventListener('keydown', handleEscape);
  document.addEventListener('visibilitychange', handleVisibility);

  // Si había una respuesta en curso (pantalla bloqueada, app cerrada), se retoma
  resumePending();
});

const handleEscape = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && isOpen.value) isOpen.value = false;
};

onUnmounted(() => {
  mounted.value = false;
  pollGuard.cancel();
  wakePoller();
  document.removeEventListener('visibilitychange', handleVisibility);
  document.removeEventListener('mousedown', handleClickOutside);
  document.removeEventListener('keydown', handleEscape);
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
};

// Función para manejar clics fuera del chat
const handleClickOutside = (event: MouseEvent) => {
  const chatWindow = document.querySelector('.chatbot-window');
  const chatToggle = document.querySelector('.chatbot-toggle');
  
  if (isOpen.value && chatWindow && chatToggle) {
    // Verificar si el clic fue fuera tanto de la ventana como del botón
    if (!chatWindow.contains(event.target as Node) && 
        !chatToggle.contains(event.target as Node)) {
      isOpen.value = false;
    }
  }
};

</script>

<template>
  <div class="chatbot-container">
    <button
      @click="toggleChat"
      class="chatbot-toggle"
      :class="{ 'active': isOpen }"
      :aria-label="isOpen ? 'Cerrar entrenador IA' : 'Abrir entrenador IA'"
      :aria-expanded="isOpen"
      title="Entrenador IA"
    >
      <span class="chatbot-icon" aria-hidden="true">{{ isOpen ? '✕' : '🤖' }}</span>
    </button>

    <div v-if="isOpen" class="chatbot-window" role="dialog" aria-label="Entrenador IA">
      <div class="chatbot-header">
        <div class="chatbot-title">
          <h3>Entrenador IA</h3>
          <span v-if="entrenoData?.Nom" class="chatbot-subtitle">{{ entrenoData.Nom }}</span>
        </div>
        <div class="header-buttons">
          <button @click="resetConversation" class="icon-btn" title="Nueva conversación" aria-label="Nueva conversación">↺</button>
          <button @click="toggleChat" class="icon-btn" aria-label="Cerrar">&times;</button>
        </div>
      </div>

      <div class="chatbot-messages" ref="messagesContainer" aria-live="polite">
        <div class="messages-wrapper">
          <div
            v-for="message in messages"
            :key="message.id"
            v-show="message.text || message.isUser"
            class="message"
            :class="{ 'user-message': message.isUser, 'bot-message': !message.isUser }">
            <div class="message-content">
              <div v-if="message.isUser" class="message-text">{{ message.text }}</div>
              <!-- renderChatMarkdown escapa el HTML antes de aplicar formato -->
              <div v-else class="message-text md" v-html="renderChatMarkdown(message.text)"></div>
              <div class="message-time">
                {{ message.timestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) }}
              </div>
              <!-- Línea de estado bajo el texto en streaming mientras corren herramientas -->
              <div v-if="statusLine && !awaitingFirstText && message.id === messages[messages.length - 1]?.id" class="phase-status">{{ statusLine }}</div>
            </div>
          </div>

          <!-- Respuestas rápidas del coach: solo bajo el último mensaje del bot -->
          <div v-if="chipsMessageId !== null" class="quick-prompts quick-replies" role="group" aria-label="Respuestas rápidas">
            <button
              v-for="reply in messages[messages.length - 1].quickReplies"
              :key="reply"
              type="button"
              class="quick-prompt"
              @click="sendQuickReply(reply)"
            >{{ reply }}</button>
          </div>

          <!-- Indicador de carga (visible hasta que llega el primer token), con la fase actual -->
          <div v-if="awaitingFirstText" class="message bot-message">
            <div class="message-content">
              <div class="typing-indicator" :aria-label="statusLine || 'Escribiendo'">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <div v-if="statusLine" class="phase-status">{{ statusLine }}</div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="showQuickPrompts" class="quick-prompts">
        <button
          v-for="prompt in QUICK_PROMPTS"
          :key="prompt"
          type="button"
          class="quick-prompt"
          :disabled="isLoading"
          @click="sendQuickPrompt(prompt)"
        >{{ prompt }}</button>
      </div>

      <div class="chatbot-input">
        <textarea
          ref="inputRef"
          v-model="newMessage"
          @keydown="handleKeyPress"
          @input="autoResize"
          placeholder="Pregunta a tu entrenador..."
          class="message-input"
          rows="1"
          aria-label="Mensaje"
        ></textarea>
        <button
          @click="sendMessage"
          class="send-btn"
          :disabled="!newMessage.trim() || isLoading"
          aria-label="Enviar"
        >
          ➤
        </button>
      </div>
    </div>
  </div>
</template>

<style src="../styles/chatbot.css"></style>
