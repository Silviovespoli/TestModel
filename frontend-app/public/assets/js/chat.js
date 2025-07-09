import { updateMessageInHistory, deleteMessageFromHistory, getModels } from './utils.js';

export let chatHistory = [];
let messageIdCounter = 0; // Per assegnare ID unici ai messaggi

// Funzioni per la gestione della configurazione
export function saveConfig() {
    const config = {
        apiProvider: document.getElementById('apiProvider').value,
        apiKey: document.getElementById('apiKey').value,
        apiEndpoint: document.getElementById('apiEndpoint').value,
        model: document.getElementById('modelSelect').value,
        temperature: parseFloat(document.getElementById('temperature').value),
        maxTokens: parseInt(document.getElementById('maxTokens').value)
    };
    localStorage.setItem('chatConfig', JSON.stringify(config));
}

export function loadConfig() {
    const savedConfig = localStorage.getItem('chatConfig');
    return savedConfig ? JSON.parse(savedConfig) : {};
}

// Funzioni per la gestione della cronologia della chat
function saveChatHistory() {
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
}

function loadChatHistory() {
    const savedHistory = localStorage.getItem('chatHistory');
    chatHistory = savedHistory ? JSON.parse(savedHistory) : [];
    // Assicurati che messageIdCounter sia maggiore di tutti gli ID esistenti
    if (chatHistory.length > 0) {
        messageIdCounter = Math.max(...chatHistory.map(msg => msg.id)) + 1;
    }
}

export function resetChatHistory() {
    chatHistory = [];
    messageIdCounter = 0;
    saveChatHistory();
}

export function addMessageToHistory(message, sender) {
    const id = messageIdCounter++;
    chatHistory.push({ id, message, sender });
    saveChatHistory();
    return id;
}

export async function sendMessage(message) {
    const config = loadConfig();
    const { apiProvider, apiKey, apiEndpoint, model, temperature, maxTokens } = config;

    if (!apiKey) {
        throw new Error('Chiave API non configurata.');
    }
    if (!model) {
        throw new Error('Modello non selezionato.');
    }

    // Prepara i messaggi per l'API (formato OpenAI/Anthropic)
    const messages = chatHistory.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.message
    }));
    messages.push({ role: 'user', content: message }); // Aggiungi il messaggio corrente

    try {
        const response = await fetch('/.netlify/functions/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                provider: apiProvider,
                messages: messages,
                model: model,
                temperature: temperature,
                maxTokens: maxTokens,
                apiKey: apiKey,
                endpoint: apiEndpoint
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Errore nell\'invio del messaggio.');
        }

        const aiResponse = await response.json();
        addMessageToHistory(aiResponse, 'ai');
        return aiResponse;
    } catch (error) {
        console.error('Errore nella funzione sendMessage:', error);
        alert(`Errore nell'invio del messaggio: ${error.message}`);
        throw error;
    }
}

export async function generateImage(prompt) {
    const config = loadConfig();
    const { apiKey, apiEndpoint } = config;

    if (!apiKey) {
        throw new Error('Chiave API non configurata.');
    }

    try {
        const response = await fetch('/.netlify/functions/generate_image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt, apiKey, endpoint: apiEndpoint }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Errore nella generazione dell\'immagine.');
        }

        const imageUrl = await response.json();
        addMessageToHistory(`<img src="${imageUrl}" alt="Immagine generata">`, 'ai');
        return imageUrl;
    } catch (error) {
        console.error('Errore nella funzione generateImage:', error);
        alert(`Errore nella generazione dell'immagine: ${error.message}`);
        throw error;
    }
}

// Carica la cronologia della chat all'avvio
loadChatHistory();