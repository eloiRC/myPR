<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import chatGPTService from '../services/chatgpt';
import { apiFetch } from '../services/api';
import { renderChatMarkdown } from '../utils/chatMarkdown';

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
const messages = ref<Array<{id: number, text: string, isUser: boolean, timestamp: Date}>>([]);
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

const POLL_INTERVAL_MS = 1500;

const sendMessage = async () => {
  if (!newMessage.value.trim() || isLoading.value) return;
  
  const userMessage = newMessage.value.trim();
  
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

    const history = validHistory.map(msg => ({
      role: msg.isUser ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    // 1) Lanzar trabajo
    const launch = await apiFetch<{ jobId: string }>('/api/gemini', {
      message: userMessage, currentTraining, chatId: null, history
    });

    // 2) Polling hasta que termine
    let accumulatedText = '';
    let lastChunksLength = 0;

    type ChatStatus = {
      status: string; chunks: string[]; fullText: string;
      workoutUpdated: boolean; error?: string;
    };
    const MAX_POLL_FAILURES = 5;
    let pollFailures = 0;

    while (mounted.value) {
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
      if (!mounted.value) break;

      let status: ChatStatus;
      try {
        status = await apiFetch<ChatStatus>('/api/chatStatus', { jobId: launch.jobId });
        pollFailures = 0;
      } catch (pollError: any) {
        // Errores de red puntuales se reintentan; un job perdido o fallos repetidos no
        if (pollError.message?.includes('Job no encontrado') || ++pollFailures >= MAX_POLL_FAILURES) {
          throw new Error('Se perdió la conexión con el entrenador. Inténtalo de nuevo.');
        }
        console.warn('Poll retry:', pollError);
        continue;
      }

      if (status.chunks.length > lastChunksLength) {
        const newChunks = status.chunks.slice(lastChunksLength);
        accumulatedText += newChunks.join('');
        lastChunksLength = status.chunks.length;
        const botMsg = messages.value.find(m => m.id === botMessageId);
        if (botMsg) botMsg.text = accumulatedText;
        nextTick(() => scrollToBottom());
      }

      if (status.status === 'done') {
        const botMsg = messages.value.find(m => m.id === botMessageId);
        if (botMsg) botMsg.text = status.fullText;
        if (status.workoutUpdated) emit('refresh');
        break;
      }
      if (status.status === 'error') {
        console.error('Error del entrenador:', status.error);
        throw new Error('⚠️ El entrenador no ha podido responder. Inténtalo de nuevo en unos segundos.');
      }
    }

    if (isFirstMessage.value) {
      isFirstMessage.value = false;
    }
  } catch (error: any) {
    const botMsg = messages.value.find(m => m.id === botMessageId);
    if (botMsg) {
      botMsg.text = error.message || 'Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta de nuevo.';
    }
  } finally {
    isLoading.value = false;
  }
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
});

const handleEscape = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && isOpen.value) isOpen.value = false;
};

onUnmounted(() => {
  mounted.value = false;
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
            </div>
          </div>

          <!-- Indicador de carga (visible hasta que llega el primer token) -->
          <div v-if="isLoading && (!messages.length || messages[messages.length - 1]?.text === '')" class="message bot-message">
            <div class="message-content">
              <div class="typing-indicator" aria-label="Escribiendo">
                <span></span>
                <span></span>
                <span></span>
              </div>
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