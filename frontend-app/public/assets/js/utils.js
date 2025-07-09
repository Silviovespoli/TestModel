import { loadConfig, chatHistory, saveChatHistory, messageCounter } from './chat.js';

export function updateMessageInHistory(id, newMessage) {
    const index = chatHistory.findIndex(msg => msg.id === id);
    if (index !== -1) {
        chatHistory[index].message = newMessage;
        saveChatHistory();
    }
}

export function deleteMessageFromHistory(id) {
    chatHistory = chatHistory.filter(msg => msg.id !== id);
    saveChatHistory();
}

export async function getModels(provider, endpoint, apiKey) {
    try {
        const response = await fetch('/.netlify/functions/models', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ provider, apiKey, endpoint }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Errore nel recupero dei modelli.');
        }

        return await response.json();
    } catch (error) {
        console.error('Errore nella funzione getModels:', error);
        alert(`Errore nel recupero dei modelli: ${error.message}`);
        return [];
    }
}