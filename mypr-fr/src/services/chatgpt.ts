
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

interface EntrenoData {
    EntrenoId: number;
    UserId: number;
    Data: number;
    CargaTotal: number;
    Nom: string;
    Descripcio: string | null;
    Puntuacio: number | null;
}


interface ChatGPTPayload {
    token: string | null;
    message: string;
    currentTraining: {
        entreno: EntrenoData;
    };
    isFirstMessage: boolean;
    chatId: string | null;
}

interface ChatMessage {
    id: number;
    text: string;
    isUser: boolean;
    timestamp: Date;
}

function getToken() {
    const token = localStorage.getItem('token');
    return token;
}

class ChatGPTService {
    token = getToken();

    saveMessages(messages: ChatMessage[], isFirstMessage: boolean): void {
        localStorage.setItem('chatHistory', JSON.stringify(messages));
        localStorage.setItem('isFirstMessage', JSON.stringify(isFirstMessage));
    }

    loadMessages(): { messages: ChatMessage[], isFirstMessage: boolean } {
        try {
            const savedMessages = localStorage.getItem('chatHistory');
            const savedIsFirstMessage = localStorage.getItem('isFirstMessage');

            let messages: ChatMessage[] = [];

            if (savedMessages) {
                const parsedMessages = JSON.parse(savedMessages);
                if (Array.isArray(parsedMessages)) {
                    messages = parsedMessages.map(msg => ({
                        id: msg.id,
                        text: msg.text,
                        isUser: msg.isUser,
                        timestamp: new Date(msg.timestamp)
                    }));
                }
            }

            const isFirstMessage = savedIsFirstMessage ?
                JSON.parse(savedIsFirstMessage) : true;

            return { messages, isFirstMessage };
        } catch (error) {
            console.error('Error loading messages from localStorage:', error);
            // Si hay algún error, limpiamos el localStorage y retornamos valores por defecto
            localStorage.removeItem('chatHistory');
            localStorage.removeItem('isFirstMessage');
            return { messages: [], isFirstMessage: true };
        }
    }

    async sendMessage(payload: ChatGPTPayload): Promise<string> {
        payload.token = getToken();
        if (!payload.isFirstMessage && localStorage.getItem('responseId') != null) {
            console.log('pass')
            payload.chatId = localStorage.getItem('responseId')

        }
        console.log(payload);
        try {
            const response = await fetch(`${API_URL}/api/chatgpt`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Error en la comunicación con ChatGPT: ${response.status}`);
            }

            const data = await response.json();
            localStorage.setItem('responseId', data.responseId)
            return data.response || 'Lo siento, no pude procesar tu mensaje en este momento.';
        } catch (error) {
            console.error('Error al comunicarse con ChatGPT:', error);
            throw new Error('Error de conexión con el asistente. Por favor, intenta de nuevo.');
        }
    }


    async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
        const token = getToken();
        try {
            // Probar conexión básica primero
            console.log('🧪 Probando conexión básica con OpenAI...');
            const basicResponse = await fetch(`${API_URL}/api/test-openai`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token })
            });

            if (!basicResponse.ok) {
                throw new Error(`Error HTTP en prueba básica: ${basicResponse.status}`);
            }

            const basicResult = await basicResponse.json();
            console.log('📊 Resultado prueba básica:', basicResult);

            if (!basicResult.success) {
                return {
                    success: false,
                    message: `Error en conexión básica: ${basicResult.message}`,
                    details: basicResult.details
                };
            }

            // Si la conexión básica funciona, probar el endpoint completo
            console.log('🧪 Probando endpoint completo de ChatGPT...');
            const response = await fetch(`${API_URL}/api/chatgpt`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token: token,
                    message: 'Hola, ¿cómo estás?',
                    currentTraining: {
                        entreno: { EntrenoId: 1, UserId: 1, Nom: 'Test', CargaTotal: 0, Data: Math.floor(Date.now() / 1000) },
                        series: [],
                        ejercicios: []
                    },
                    previousTrainings: [],
                    isFirstMessage: true
                })
            });

            if (!response.ok) {
                throw new Error(`Error HTTP en endpoint completo: ${response.status}`);
            }

            const result = await response.json();
            console.log('📊 Resultado endpoint completo:', result);

            return {
                success: true,
                message: 'Conexión con ChatGPT establecida correctamente',
                details: {
                    basicTest: basicResult.response,
                    fullTest: result.response ? 'Funcionando' : 'Error en respuesta'
                }
            };
        } catch (error: any) {
            console.error('❌ Error en testConnection:', error);
            return {
                success: false,
                message: `Error al probar conexión: ${error.message}`,
                details: { error: error.message }
            };
        }
    }
}

export default new ChatGPTService();