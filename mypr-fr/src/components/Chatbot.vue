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
  
  // Crear mensaje del bot vacío para ir llenándolo con el stream
  const botMessageId = Date.now() + 1;
  messages.value.push({
    id: botMessageId,
    text: '',
    isUser: false,
    timestamp: new Date()
  });
  
  try {
    // Validar que tenemos los datos necesarios
    if (!props.entrenoData) {
      throw new Error('Los datos del entrenamiento no están disponibles. Por favor, espera un momento.');
    }

    const currentTraining = {
      entreno: props.entrenoData,
      series: props.series || [],
      ejercicios: props.ejercicios || []
    };
    
    // Preparar el historial (excluyendo el mensaje actual y el bot vacío)
    const rawHistory = messages.value.slice(0, -2);
    
    const firstUserIndex = rawHistory.findIndex(msg => msg.isUser);
    const validHistory = firstUserIndex !== -1 ? rawHistory.slice(firstUserIndex) : [];

    const history = validHistory.map(msg => ({
      role: msg.isUser ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

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

    // Consumir el stream SSE
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No se pudo leer la respuesta');

    const decoder = new TextDecoder();
    let buffer = '';
    let streamedText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      
      // Procesar líneas SSE completas
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Guardar línea incompleta

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const eventData = JSON.parse(line.slice(6));
            
            if (eventData.type === 'chunk') {
              streamedText += eventData.text;
              // Actualizar el mensaje del bot en tiempo real (limpiar json_plan si aparece parcialmente)
              const botMsg = messages.value.find(m => m.id === botMessageId);
              if (botMsg) {
                botMsg.text = streamedText.replace(/```json_plan[\s\S]*$/,'').trim();
              }
            } else if (eventData.type === 'done') {
              // Usar el texto limpio final del backend
              const botMsg = messages.value.find(m => m.id === botMessageId);
              if (botMsg) {
                botMsg.text = eventData.fullText;
              }
              if (eventData.workoutUpdated) {
                emit('refresh');
              }
            } else if (eventData.type === 'error') {
              const botMsg = messages.value.find(m => m.id === botMessageId);
              if (botMsg) {
                botMsg.text = eventData.message || 'Error al generar la respuesta.';
              }
            }
          } catch (parseError) {
            // Ignorar líneas que no se pueden parsear
          }
        }
      }
    }
    
    // Marcar que ya no es el primer mensaje
    if (isFirstMessage.value) {
      isFirstMessage.value = false;
    }
  } catch (error: any) {
    // En caso de error, actualizar el mensaje del bot vacío con el error
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
            v-show="message.text || message.isUser"
            class="message"
            :class="{ 'user-message': message.isUser, 'bot-message': !message.isUser }">
            <div class="message-content">
              <div class="message-text">{{ message.text }}</div>
              <div class="message-time">
                {{ message.timestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) }}
              </div>
            </div>
          </div>
          
          <!-- Indicador de carga (visible hasta que llega el primer token) -->
          <div v-if="isLoading && (!messages.length || messages[messages.length - 1]?.text === '')" class="message bot-message">
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