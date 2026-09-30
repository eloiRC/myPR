interface ChatMessage {
    id: number;
    text: string;
    isUser: boolean;
    timestamp: Date;
}

// El historial se guarda por entreno: si fuera global, en un entreno nuevo
// Gemini vería su propuesta anterior y tendería a repetirla.
function keys(scope: string | number = 'global') {
    return {
        history: `chatHistory:${scope}`,
        first: `isFirstMessage:${scope}`,
        timestamp: `chatHistoryTimestamp:${scope}`,
    };
}

class ChatGPTService {
    saveMessages(messages: ChatMessage[], isFirstMessage: boolean, scope?: string | number): void {
        const k = keys(scope);
        localStorage.setItem(k.history, JSON.stringify(messages));
        localStorage.setItem(k.first, JSON.stringify(isFirstMessage));
        localStorage.setItem(k.timestamp, Date.now().toString());
    }

    clearMessages(scope?: string | number): void {
        const k = keys(scope);
        localStorage.removeItem(k.history);
        localStorage.removeItem(k.first);
        localStorage.removeItem(k.timestamp);
    }

    loadMessages(scope?: string | number): { messages: ChatMessage[], isFirstMessage: boolean } {
        const k = keys(scope);
        try {
            const savedTimestamp = localStorage.getItem(k.timestamp);
            const now = Date.now();
            const twelveHours = 12 * 60 * 60 * 1000;

            if (savedTimestamp && (now - parseInt(savedTimestamp) > twelveHours)) {
                console.log('Chat history expired, clearing...');
                this.clearMessages(scope);
                return { messages: [], isFirstMessage: true };
            }

            const savedMessages = localStorage.getItem(k.history);
            const savedIsFirstMessage = localStorage.getItem(k.first);

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
            this.clearMessages(scope);
            return { messages: [], isFirstMessage: true };
        }
    }
}

export default new ChatGPTService();
