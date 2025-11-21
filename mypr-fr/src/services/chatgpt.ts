
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
        series?: any[];
        ejercicios?: any[];
    };
    chatId: string | null;
    history?: any[];
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
        localStorage.setItem('chatHistoryTimestamp', Date.now().toString());
    }

    loadMessages(): { messages: ChatMessage[], isFirstMessage: boolean } {
        try {
            const savedTimestamp = localStorage.getItem('chatHistoryTimestamp');
            const now = Date.now();
            const twelveHours = 12 * 60 * 60 * 1000;

            if (savedTimestamp && (now - parseInt(savedTimestamp) > twelveHours)) {
                console.log('Chat history expired, clearing...');
                localStorage.removeItem('chatHistory');
                localStorage.removeItem('isFirstMessage');
                localStorage.removeItem('chatHistoryTimestamp');
                return { messages: [], isFirstMessage: true };
            }

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
            localStorage.removeItem('chatHistoryTimestamp');
            return { messages: [], isFirstMessage: true };
        }
    }

    async sendMessage(payload: ChatGPTPayload & { history: any[] }): Promise<string> {
        payload.token = getToken();

        console.log('Enviando mensaje a Gemini:', {
            message: payload.message.substring(0, 50) + '...',
            historyLength: payload.history?.length || 0
        });

        try {
            const response = await fetch(`${API_URL}/api/gemini`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                let errorData: any = {};
                try {
                    errorData = await response.json();
                } catch (e) {
                    // Si no se puede parsear el JSON, usar el texto de respuesta
                    const text = await response.text().catch(() => '');
                    errorData = { message: text || `Error ${response.status}` };
                }

                // Mensajes más específicos según el código de error
                if (response.status === 400) {
                    throw new Error(errorData.message || 'Los datos enviados no son válidos. Por favor, recarga la página e intenta de nuevo.');
                } else if (response.status === 401) {
                    throw new Error('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');
                } else {
                    throw new Error(errorData.message || `Error en la comunicación con el asistente: ${response.status}`);
                }
            }

            const data = await response.json();

            return data.response || 'Lo siento, no pude procesar tu mensaje en este momento.';
        } catch (error: any) {
            console.error('Error al comunicarse con el asistente:', error);
            throw new Error(error.message || 'Error de conexión con el asistente. Por favor, intenta de nuevo.');
        }
    }


    async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
        const token = getToken();
        try {
            // Probar conexión básica primero
            console.log('🧪 Probando conexión básica con Gemini...');
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
            console.log('🧪 Probando endpoint completo del asistente...');
            const response = await fetch(`${API_URL}/api/gemini`, {
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
                    chatId: null
                })
            });

            if (!response.ok) {
                throw new Error(`Error HTTP en endpoint completo: ${response.status}`);
            }

            const result = await response.json();
            console.log('📊 Resultado endpoint completo:', result);

            return {
                success: true,
                message: 'Conexión con el asistente establecida correctamente',
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