interface ChatMessage {
    id: number;
    text: string;
    isUser: boolean;
    timestamp: Date;
}

class ChatGPTService {
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
            localStorage.removeItem('chatHistory');
            localStorage.removeItem('isFirstMessage');
            localStorage.removeItem('chatHistoryTimestamp');
            return { messages: [], isFirstMessage: true };
        }
    }
}

export default new ChatGPTService();
