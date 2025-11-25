<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'; 
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

// Definir emits
const emit = defineEmits(['refresh']);

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
      ejercicios: props.ejercicios || [] // Pasamos todos los ejercicios disponibles
    };
    
    // Preparar el historial (excluyendo el mensaje actual que acabamos de añadir)
    const rawHistory = messages.value.slice(0, -1);
    
    const firstUserIndex = rawHistory.findIndex(msg => msg.isUser);
    const validHistory = firstUserIndex !== -1 ? rawHistory.slice(firstUserIndex) : [];

    const history = validHistory.map(msg => ({
      role: msg.isUser ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    // Enviar mensaje al asistente (Gemini)
    // Usamos fetch directo aquí porque necesitamos acceder a campos extra como workoutUpdated
    // que chatGPTService.sendMessage podría no estar retornando actualmente
    // O mejor, actualizamos chatGPTService, pero para este ejemplo rápido modificamos aquí o usamos el servicio si devuelve el objeto completo.
    // Como chatGPTService devuelve string, haremos la llamada aquí o adaptaremos el servicio.
    // Para mantener consistencia, usaremos una llamada directa similar a la del servicio pero capturando la respuesta completa.
    
    const token = localStorage.getItem('token');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';
    
    const response = await fetch(`${API_URL}/api/gemini`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            token,
            message: userMessage,
            currentTraining,
            chatId: null,
            history: history
        })
    });

    if (!response.ok) {
        throw new Error('Error al comunicar con el asistente');
    }

    const data = await response.json();
    
    // Añadir respuesta del bot
    messages.value.push({
      id: Date.now(),
      text: data.response,
      isUser: false,
      timestamp: new Date()
    });

    // Si el backend indica que actualizó el entrenamiento, emitimos evento
    if (data.workoutUpdated) {
      emit('refresh');
      // Opcional: Añadir mensaje de sistema local
      // messages.value.push({ id: Date.now(), text: '✅ Rutina cargada automáticamente.', isUser: false, timestamp: new Date() });
    }
    
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

<style src="../styles/chatbot.css"></style>