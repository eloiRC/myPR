<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'; // Añadir onUnmounted
import chatGPTService from '../services/chatgpt';

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

// Estados reactivos
const isOpen = ref(false);
const messages = ref<Array<{id: number, text: string, isUser: boolean, timestamp: Date}>>([]);
const newMessage = ref('');
const isLoading = ref(false);
const isFirstMessage = ref(true);
const messagesContainer = ref<HTMLElement | null>(null);


// Mensaje de bienvenida
const welcomeMessage = computed(() => {
  return '¡Hola! Soy tu entrenador virtual. ¿En qué puedo ayudarte? Tengo acceso a tus entrenos, así que puedo ayudarte con recomendaciones personalizadas para que mejores tus resultados. ¿Listo para empezar?';
});

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
    });
  }
};

// Función para enviar mensaje
const sendMessage = async () => {
  if (!newMessage.value.trim() || isLoading.value) return;
  
  const userMessage = newMessage.value.trim();
  
  // Añadir mensaje del usuario
  messages.value.push({
    id: Date.now(),
    text: userMessage,
    isUser: true,
    timestamp: new Date()
  });
  
  newMessage.value = '';
  isLoading.value = true;
  
  try {
    // Validar que tenemos los datos necesarios
    if (!props.entrenoData) {
      throw new Error('Los datos del entrenamiento no están disponibles. Por favor, espera un momento.');
    }

    // Preparar los datos del entrenamiento current
    const currentTraining = {
      entreno: props.entrenoData,
      series: props.series || [],
      ejercicios: props.ejercicios || []
    };
    
    // Preparar el historial (excluyendo el mensaje actual que acabamos de añadir)
    const rawHistory = messages.value.slice(0, -1);
    
    // Gemini requiere que el historial empiece con un mensaje de usuario ('user')
    // Buscamos el primer mensaje que sea del usuario
    const firstUserIndex = rawHistory.findIndex(msg => msg.isUser);
    
    // Si encontramos un mensaje de usuario, filtramos todo lo anterior (mensajes de bienvenida del sistema)
    // Si no hay mensajes de usuario previos, el historial enviado debe estar vacío
    const validHistory = firstUserIndex !== -1 ? rawHistory.slice(firstUserIndex) : [];

    const history = validHistory.map(msg => ({
      role: msg.isUser ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    // Enviar mensaje al asistente (Gemini)
    const response = await chatGPTService.sendMessage({
        message: userMessage,
        currentTraining,
        token: null,
        chatId: null,
        history: history
    });
    
    // Añadir respuesta del bot
    messages.value.push({
      id: Date.now(),
      text: response,
      isUser: false,
      timestamp: new Date()
    });
    
    // Marcar que ya no es el primer mensaje
    if (isFirstMessage.value) {
      isFirstMessage.value = false;
    }
  } catch (error: any) {
    // En caso de error, mostrar mensaje de error
    messages.value.push({
      id: Date.now(),
      text: error.message || 'Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta de nuevo.',
      isUser: false,
      timestamp: new Date()
    });
  } finally {
    isLoading.value = false;
  }
};

// Función para manejar Enter
const handleKeyPress = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
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
  const { messages: savedMessages, isFirstMessage: savedIsFirstMessage } = chatGPTService.loadMessages();
  messages.value = savedMessages;
  isFirstMessage.value = savedIsFirstMessage;
  
  document.addEventListener('mousedown', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside);
});

// Modificar el watch de messages
watch([messages, isFirstMessage], () => {
  chatGPTService.saveMessages(messages.value, isFirstMessage.value);
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
  localStorage.removeItem('chatHistory');
  localStorage.removeItem('isFirstMessage');
  localStorage.removeItem('chatHistoryTimestamp');
  localStorage.removeItem('responseId'); // Limpiar el historial de Gemini
  
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
    <!-- Botón flotante del chatbot -->
    <button 
      @click="toggleChat" 
      class="chatbot-toggle"
      :class="{ 'active': isOpen }"
      title="Asistente de entrenamiento"
    >
      <span class="chatbot-icon">🤖</span>
    </button>
    
    <!-- Ventana del chat -->
    <div v-if="isOpen" class="chatbot-window">
      <div class="chatbot-header">
        <h3>Asistente de Entrenamiento</h3>
        <div class="header-buttons">
          <button @click="resetConversation" class="reset-btn" title="Reiniciar conversación">
            ↺
          </button>
          <button @click="toggleChat" class="close-btn">&times;</button>
        </div>
      </div>
      

    
      <div class="chatbot-messages" ref="messagesContainer">
        <div class="messages-wrapper">
          <div 
            v-for="message in messages" 
            :key="message.id"
            class="message"
            :class="{ 'user-message': message.isUser, 'bot-message': !message.isUser }">
            <div class="message-content">
              <div class="message-text">{{ message.text }}</div>
              <div class="message-time">
                {{ message.timestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) }}
              </div>
            </div>
          </div>
          
          <!-- Indicador de carga -->
          <div v-if="isLoading" class="message bot-message">
            <div class="message-content">
              <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="chatbot-input">
        <textarea
          v-model="newMessage"
          @keypress="handleKeyPress"
          placeholder="Escribe tu mensaje..."
          class="message-input"
          rows="1"
        ></textarea>
        <button 
          @click="sendMessage" 
          class="send-btn"
          :disabled="!newMessage.trim() || isLoading"
        >
          ➤
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chatbot-container {
  position: fixed; /* Cambiar de relative a fixed */
  bottom: 10vh;
  right: 20px;
  width: auto; /* Quitar width 100% */
  margin: 0; /* Quitar margin */
  z-index: 1000;
}

.chatbot-toggle {
  width: 100px; /* Un poco más grande */
  height: 100px;
  border-radius: 50px;
  background: rgba(255, 255, 255, 0.2); /* Fondo semi-transparente */
  backdrop-filter: blur(16px); /* Efecto de desenfoque */
  -webkit-backdrop-filter: blur(16px); /* Para Safari */
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 
    0 4px 24px rgba(0, 0, 0, 0.1),
    inset 0 0 0 1px rgba(255, 255, 255, 0.15);
  transition: all 0.3s ease;
}

.chatbot-toggle:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-2px);
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.15),
    inset 0 0 0 1px rgba(255, 255, 255, 0.2);
}

.chatbot-toggle.active {
  background: rgba(255, 255, 255, 0.2);
  box-shadow: 
    0 4px 24px rgba(0, 0, 0, 0.2),
    inset 0 0 0 2px rgba(255, 255, 255, 0.25);
}

/* Actualizar también el header del chat para mantener consistencia */
.chatbot-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  /* Header con efecto cristal más oscuro */
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  border-radius: 12px 12px 0 0;
}

/* Ajustar el tamaño del icono */
.chatbot-icon {
  font-size: 2rem;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
  animation: 
    float 6s ease-in-out infinite,
    subtle-wave 12s linear infinite;
  transform-origin: center;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0) rotate(0deg);
  }
  25% {
    transform: translateY(-3px) rotate(2deg);
  }
  50% {
    transform: translateY(-5px) rotate(0deg);
  }
  75% {
    transform: translateY(-3px) rotate(-2deg);
  }
}

@keyframes subtle-wave {
  0%, 100% {
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
  }
  25% {
    filter: drop-shadow(2px 4px 6px rgba(0, 0, 0, 0.3));
  }
  50% {
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.25));
  }
  75% {
    filter: drop-shadow(-2px 4px 6px rgba(0, 0, 0, 0.3));
  }
}

.chatbot-toggle:hover .chatbot-icon {
  animation-play-state: paused;
  transform: scale(1.1);
  transition: transform 0.3s ease;
}

.chatbot-window {
  position: fixed;
  bottom: 100px; /* Cambiar top por bottom */
  right: 20px; /* Cambiar left por right */
  width: 400px; /* Ancho fijo */
  height: 600px;
  max-height: 80vh;
  z-index: 2000;
  /* Efecto cristal para toda la ventana */
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 
    0 8px 32px rgba(31, 38, 135, 0.25),
    inset 0 0 32px rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.chatbot-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  /* Header con efecto cristal más oscuro */
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  border-radius: 12px 12px 0 0;
}

.chatbot-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.header-buttons {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.reset-btn {
  background: none;
  border: none;
  color: var(--accent-secondary);
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.reset-btn:hover {
  opacity: 1;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  opacity: 0.8;
}

.chatbot-messages {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  scroll-behavior: auto; /* Cambiar de smooth a auto */
}

.messages-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  margin-top: auto; /* Esto empuja los mensajes hacia abajo */
}

.message {
  display: flex;
  margin-bottom: 0.5rem;
}

.user-message {
  justify-content: flex-end;
}

.bot-message {
  justify-content: flex-start;
}

.message-content {
  max-width: 80%;
  padding: 0.75rem;
  border-radius: 12px;
  position: relative;
}

.user-message .message-content {
  background: rgba(15, 139, 141, 0.8);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  border-bottom-right-radius: 4px;
}

.bot-message .message-content {
  background: rgba(26, 25, 25, 0.8);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  border-bottom-left-radius: 4px;
}

.message-text {
  white-space: pre-line;
  line-height: 1.4;
  margin-bottom: 0.25rem;
}

.message-time {
  font-size: 0.7rem;
  opacity: 0.7;
  text-align: right;
}

.typing-indicator {
  display: flex;
  gap: 0.25rem;
  padding: 0.5rem;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--text-secondary);
  animation: typing 1.4s infinite ease-in-out;
}

.typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
.typing-indicator span:nth-child(2) { animation-delay: -0.16s; }

@keyframes typing {
  0%, 80%, 100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.chatbot-input {
  padding: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  gap: 0.5rem;
  align-items: stretch; /* Cambiamos flex-end por stretch */
  background: rgba(27, 27, 27, 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 0 0 12px 12px;
}

.message-input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  color: white;
  font-family: inherit;
  font-size: 0.9rem;
  resize: none;
  max-height: 100px;
  min-height: 40px; /* Aseguramos que coincida con el botón */
  line-height: 1.2; /* Mejoramos la altura de línea */
}

.send-btn {
  width: 40px;
  height: 40px; /* Cambiamos esto para que sea dinámico */
  min-height: 40px; /* Altura mínima igual que message-input */
  align-self: stretch; /* Esto hará que se estire para coincidir con el textarea */
  border-radius: 8px;
  background: rgba(15, 139, 141, 0.8);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  transition: all 0.3s ease;
  padding: 0; /* Aseguramos que no haya padding extra */
}

/* Responsive */
@media (max-width: 480px) {
  .chatbot-window {
    width: calc(100vw - 40px);
    right: 20px;
    bottom: 80px;
    height: calc(100vh - 120px);
  }
  
  .chatbot-toggle {
    width: 70px; /* Un poco más grande que antes en móvil */
    height: 70px;
    border-radius: 35px;
  }
 }

 .connection-test {
   padding: 10px;
   border-bottom: 1px solid var(--border);
   background-color: var(--bg-secondary);
 }

 .test-connection-btn {
   background-color: var(--color-cobalt-blue);
   color: white;
   border: none;
   padding: 8px 16px;
   border-radius: 4px;
   cursor: pointer;
   font-size: 12px;
   transition: background-color 0.3s;
 }

 .test-connection-btn:hover:not(:disabled) {
   background-color: var(--color-cobalt-blue-dark);
 }

 .test-connection-btn:disabled {
   cursor: not-allowed;
   background-color: var(--border);
 }

 .connection-status {
   margin-top: 8px;
   padding: 8px;
   border-radius: 4px;
   font-size: 12px;
   font-weight: 500;
 }

 .connection-status.success {
   background-color: #d4edda;
   color: #155724;
   border: 1px solid #c3e6cb;
 }

 .connection-status.error {
   background-color: #f8d7da;
   color: #721c24;
   border: 1px solid #f5c6cb;
 }
</style>