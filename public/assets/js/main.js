// public/assets/js/main.js

import * as chatConfig from './config.js';
import * as ui from './ui.js';
import * as chatManager from './chat.js';

const userMessageInput = document.getElementById('user-message');
const sendButton = document.getElementById('send-button');
const saveConfigButton = document.getElementById('save-config-button');
const newChatButton = document.getElementById('new-chat-button');
const generateImageButton = document.getElementById('generate-image-button');

const endpointUrlInput = document.getElementById('endpoint_url');
const apiKeyInput = document.getElementById('api_key');
const providerNameSelect = document.getElementById('provider_name');
const modelNameSelect = document.getElementById('model_name');
const modelTypeSelect = document.getElementById('model_type');
const temperatureInput = document.getElementById('temperature');
const maxTokensInput = document.getElementById('max_tokens');

const imagePromptInput = document.getElementById('image_prompt');
const imageSizeSelect = document.getElementById('image_size');
const imageQualitySelect = document.getElementById('image_quality');

async function initializeApp() {
    // Load configuration and chat sessions sequentially to avoid race condition
    await chatConfig.loadConfigFromLocalStorage();
    await chatManager.loadChatSessions();

    // If no chat sessions exist, create a new one
    if (chatManager.getChatSessions().length === 0) {
        const newSession = chatManager.createNewChatSession();
        chatManager.switchChatSession(newSession.id);
    } else if (!chatManager.getCurrentChatId()) {
        // If sessions exist but no current chat is set (e.g., first load after initial setup)
        chatManager.switchChatSession(chatManager.getChatSessions()[0].id);
    }

    // Populate UI with current config and chat history
    const currentConfig = chatConfig.getCurrentConfig();
    ui.updateConfigUI(currentConfig);
    await chatConfig.fetchModels(currentConfig.provider, currentConfig.base_url, currentConfig.model);
    ui.renderChatHistory(chatManager.getChatHistory());
    ui.renderChatSessions(chatManager.getChatSessions(), chatManager.getCurrentChatId());

    // Add event listeners
    sendButton.addEventListener('click', sendMessage);
    userMessageInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault(); // Prevent new line
            sendMessage();
        }
    });

    saveConfigButton.addEventListener('click', saveConfiguration);
    newChatButton.addEventListener('click', handleNewChat);
    generateImageButton.addEventListener('click', generateImage);
    imagePromptInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            generateImage();
        }
    });

    // Update config on input change
    endpointUrlInput.addEventListener('change', updateConfigAndFetchModels);
    // API key listener rimosso per sicurezza - gestita solo lato server
    providerNameSelect.addEventListener('change', updateConfigAndFetchModels);
    modelNameSelect.addEventListener('change', (e) => chatConfig.updateConfig({ model: e.target.value }));
    modelTypeSelect.addEventListener('change', (e) => {
        const isImage = e.target.value === 'image';
        chatConfig.updateConfig({ is_image_model: isImage });
        ui.updateConfigUI(chatConfig.getCurrentConfig()); // Re-render to show/hide image section
    });
    temperatureInput.addEventListener('change', (e) => chatConfig.updateConfig({ temperature: parseFloat(e.target.value) }));
    maxTokensInput.addEventListener('change', (e) => chatConfig.updateConfig({ max_tokens: parseInt(e.target.value) }));

    // Initialize textarea auto-resize
    ui.initializeTextareaAutoResize();
}

async function sendMessage() {
    const messageText = userMessageInput.value.trim();
    if (messageText === '') return;

    const messageId = chatManager.generateUniqueId();
    ui.appendMessageToUI({ id: messageId, role: 'user', content: messageText });
    chatManager.appendMessage('user', messageText, messageId);
    userMessageInput.value = '';
    userMessageInput.style.height = 'auto'; // Reset textarea height

    try {
        const currentConfig = chatConfig.getCurrentConfig();
        const chatHistory = chatManager.getChatHistory();

        // Validazione configurazione - API key gestita lato server
        // Rimossa validazione API key frontend per sicurezza

        if (!currentConfig.model) {
            const errorMsg = 'Modello non selezionato. Seleziona un modello nella configurazione.';
            ui.appendMessageToUI({ id: chatManager.generateUniqueId(), role: 'ai', content: errorMsg });
            chatManager.appendMessage('ai', errorMsg);
            return;
        }

        // Pulisci e valida config prima dell'invio
        const cleanConfig = {
            provider: currentConfig.provider,
            model: currentConfig.model,
            base_url: currentConfig.base_url,
            temperature: typeof currentConfig.temperature === 'number' ? currentConfig.temperature : 0.7,
            max_tokens: typeof currentConfig.max_tokens === 'number' ? currentConfig.max_tokens : 1000
        };

        // Pulisci messaggi per inviare solo campi richiesti e converti 'ai' in 'assistant'
        const cleanMessages = chatHistory.map(msg => ({
            role: msg.role === 'ai' ? 'assistant' : msg.role,
            content: msg.content
        }));

        // Debug logging
        console.log('Sending chat request with config:', cleanConfig);
        console.log('Sending chat request with messages:', cleanMessages);
        
        // Verifica configurazione
        if (!cleanConfig.provider) {
            console.error('ERRORE: Provider mancante!');
            return;
        }
        if (!cleanConfig.model) {
            console.error('ERRORE: Modello mancante!');
            return;
        }
        console.log('Configurazione valida, invio richiesta...');

        // Mostra indicatore di typing
        const typingId = chatManager.generateUniqueId();
        ui.appendMessageToUI({ id: typingId, role: 'ai', content: '⏳ Elaborazione in corso...' });

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: cleanMessages,
                config: cleanConfig
            })
        });

        // Rimuove indicatore di typing
        ui.removeMessageFromUI(typingId);

        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
                console.error('Server error details:', errorData);
            } catch (e) {
                console.error('Failed to parse error response:', e);
                errorData = { error: response.statusText };
            }
            
            if (errorData.details && Array.isArray(errorData.details)) {
                throw new Error(`Validation errors: ${errorData.details.join(', ')}`);
            } else {
                throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
            }
        }

        const data = await response.json();
        
        if (data.response) {
            const aiMessageId = chatManager.generateUniqueId();
            ui.appendMessageToUI({ id: aiMessageId, role: 'ai', content: data.response });
            chatManager.appendMessage('ai', data.response, aiMessageId);
            
            // Log usage se disponibile
            if (data.usage) {
                console.log('Token utilizzati:', data.usage);
            }
        } else {
            const errorMsg = data.error || 'Si è verificato un errore. Riprova più tardi.';
            ui.appendMessageToUI({ id: chatManager.generateUniqueId(), role: 'ai', content: errorMsg });
            chatManager.appendMessage('ai', errorMsg);
        }
    } catch (error) {
        console.error('Errore durante l\'invio del messaggio:', error);
        const errorMsg = error.message.includes('HTTP')
            ? `Errore del server: ${error.message}`
            : 'Si è verificato un errore di rete. Controlla la connessione e riprova.';
        
        ui.appendMessageToUI({ id: chatManager.generateUniqueId(), role: 'ai', content: errorMsg });
        chatManager.appendMessage('ai', errorMsg);
        
        // Mostra notifica se disponibile
        chatConfig.showNotification(errorMsg, 'error');
    }
}

async function saveConfiguration() {
    // Config is already updated on input change, just save to localStorage
    chatConfig.saveConfigToLocalStorage();
    alert('Configurazione salvata con successo!');
}

async function updateConfigAndFetchModels() {
    const newConfigValues = {
        provider: providerNameSelect.value,
        base_url: endpointUrlInput.value,
    };
    chatConfig.updateConfig(newConfigValues);
    const currentConfig = chatConfig.getCurrentConfig();
    await chatConfig.fetchModels(currentConfig.provider, currentConfig.base_url, currentConfig.model);
}

function handleNewChat() {
    const newSession = chatManager.createNewChatSession();
    chatManager.switchChatSession(newSession.id);
    ui.renderChatSessions(chatManager.getChatSessions(), newSession.id);
    ui.renderChatHistory([]); // Clear UI for new chat
    ui.clearImageResults(); // Clear image results for new chat
}

async function generateImage() {
    const prompt = imagePromptInput.value.trim();
    const size = imageSizeSelect.value;
    const quality = imageQualitySelect.value;
    const currentConfig = chatConfig.getCurrentConfig();

    if (prompt === '') {
        alert('Inserisci un prompt per generare l\'immagine.');
        return;
    }
    if (!currentConfig.is_image_model) {
        alert('Il modello selezionato non è configurato per la generazione di immagini. Seleziona un modello di tipo "Immagine" nella configurazione.');
        return;
    }

    ui.clearImageResults(); // Clear previous images
    ui.appendMessageToUI({ id: chatManager.generateUniqueId(), role: 'user', content: `Genera immagine: "${prompt}" (${size}, ${quality})` });
    chatManager.appendMessage('user', `Genera immagine: "${prompt}" (${size}, ${quality})`);

    try {
        // Mostra indicatore di generazione
        const generatingId = chatManager.generateUniqueId();
        ui.appendMessageToUI({
            id: generatingId,
            role: 'ai',
            content: '🎨 Generazione immagine in corso... Questo può richiedere alcuni minuti.'
        });

        const response = await fetch('/api/generate_image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: prompt,
                size: size,
                quality: quality,
                model: currentConfig.model || 'dall-e-3'
            })
        });

        // Rimuove indicatore di generazione
        ui.removeMessageFromUI(generatingId);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.images && data.images.length > 0) {
            // Aggiunge le immagini alla UI
            data.images.forEach(url => {
                ui.appendImageToUI(url);
            });
            
            const successMsg = `✅ Immagine generata con successo! (${data.size}, ${data.quality})`;
            ui.appendMessageToUI({
                id: chatManager.generateUniqueId(),
                role: 'ai',
                content: successMsg
            });
            chatManager.appendMessage('ai', successMsg);
            
            console.log('Immagine generata:', data);
        } else {
            const errorMsg = data.error || 'Errore nella generazione dell\'immagine.';
            ui.appendMessageToUI({
                id: chatManager.generateUniqueId(),
                role: 'ai',
                content: `❌ ${errorMsg}`
            });
            chatManager.appendMessage('ai', errorMsg);
        }
    } catch (error) {
        console.error('Errore durante la generazione dell\'immagine:', error);
        
        const errorMsg = error.message.includes('HTTP')
            ? `Errore del server: ${error.message}`
            : 'Si è verificato un errore di rete durante la generazione dell\'immagine.';
            
        ui.appendMessageToUI({
            id: chatManager.generateUniqueId(),
            role: 'ai',
            content: `❌ ${errorMsg}`
        });
        chatManager.appendMessage('ai', errorMsg);
        
        // Mostra notifica se disponibile
        chatConfig.showNotification(errorMsg, 'error');
    }
}

// Initialize the application
initializeApp();