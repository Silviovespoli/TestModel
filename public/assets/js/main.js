// public/assets/js/main.js

document.addEventListener('DOMContentLoaded', initializeApp);

const userMessageInput = document.getElementById('user-message');
// Make userMessageInput globally accessible
window.userMessageInput = userMessageInput;
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
    await window.chatConfig.loadConfigFromLocalStorage();
    await window.chatManager.loadChatSessions();

    // If no chat sessions exist, create a new one
    if (window.chatManager.getChatSessions().length === 0) {
        const newSession = window.chatManager.createNewChatSession();
        window.chatManager.switchChatSession(newSession.id);
    } else if (!window.chatManager.getCurrentChatId()) {
        // If sessions exist but no current chat is set (e.g., first load after initial setup)
        window.chatManager.switchChatSession(window.chatManager.getChatSessions()[0].id);
    }

    // Populate UI with current config and chat history
    const currentConfig = window.chatConfig.getCurrentConfig();
    window.ui.updateConfigUI(currentConfig);
    await window.chatConfig.fetchModels(currentConfig.provider, currentConfig.base_url, currentConfig.model);
    window.ui.renderChatHistory(window.chatManager.getChatHistory());
    window.ui.renderChatSessions(window.chatManager.getChatSessions(), window.chatManager.getCurrentChatId());

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
    modelNameSelect.addEventListener('change', (e) => window.chatConfig.updateConfig({ model: e.target.value }));
    modelTypeSelect.addEventListener('change', (e) => {
        const isImage = e.target.value === 'image';
        window.chatConfig.updateConfig({ is_image_model: isImage });
        window.ui.updateConfigUI(window.chatConfig.getCurrentConfig()); // Re-render to show/hide image section
    });
    temperatureInput.addEventListener('change', (e) => window.chatConfig.updateConfig({ temperature: parseFloat(e.target.value) }));
    maxTokensInput.addEventListener('change', (e) => window.chatConfig.updateConfig({ max_tokens: parseInt(e.target.value) }));

    // Initialize textarea auto-resize
    if (window.initializeTextareaAutoResize) {
        window.initializeTextareaAutoResize();
    }
}

async function sendMessage() {
    const messageText = userMessageInput.value.trim();
    if (messageText === '') return;

    const messageId = window.chatManager.generateUniqueId();
    window.ui.appendMessageToUI({ id: messageId, role: 'user', content: messageText });
    window.chatManager.appendMessage('user', messageText, messageId);
    userMessageInput.value = '';
    userMessageInput.style.height = 'auto'; // Reset textarea height

    try {
        const currentConfig = window.chatConfig.getCurrentConfig();
        const chatHistory = window.chatManager.getChatHistory();

        // Validazione configurazione - API key gestita lato server
        // Rimossa validazione API key frontend per sicurezza

        if (!currentConfig.model) {
            const errorMsg = 'Modello non selezionato. Seleziona un modello nella configurazione.';
            window.ui.appendMessageToUI({ id: window.chatManager.generateUniqueId(), role: 'ai', content: errorMsg });
            window.chatManager.appendMessage('ai', errorMsg);
            return;
        }

        // Mostra indicatore di typing
        const typingId = window.chatManager.generateUniqueId();
        window.ui.appendMessageToUI({ id: typingId, role: 'ai', content: '⏳ Elaborazione in corso...' });

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: chatHistory,
                config: currentConfig
            })
        });

        // Rimuove indicatore di typing
        window.ui.removeMessageFromUI(typingId);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.response) {
            const aiMessageId = window.chatManager.generateUniqueId();
            window.ui.appendMessageToUI({ id: aiMessageId, role: 'ai', content: data.response });
            window.chatManager.appendMessage('ai', data.response, aiMessageId);
            
            // Log usage se disponibile
            if (data.usage) {
                console.log('Token utilizzati:', data.usage);
            }
        } else {
            const errorMsg = data.error || 'Si è verificato un errore. Riprova più tardi.';
            window.ui.appendMessageToUI({ id: window.chatManager.generateUniqueId(), role: 'ai', content: errorMsg });
            window.chatManager.appendMessage('ai', errorMsg);
        }
    } catch (error) {
        console.error('Errore durante l\'invio del messaggio:', error);
        const errorMsg = error.message.includes('HTTP')
            ? `Errore del server: ${error.message}`
            : 'Si è verificato un errore di rete. Controlla la connessione e riprova.';
        
        window.ui.appendMessageToUI({ id: window.chatManager.generateUniqueId(), role: 'ai', content: errorMsg });
        window.chatManager.appendMessage('ai', errorMsg);
        
        // Mostra notifica se disponibile
        if (window.chatConfig.showNotification) {
            window.chatConfig.showNotification(errorMsg, 'error');
        }
    }
}

async function saveConfiguration() {
    // Config is already updated on input change, just save to localStorage
    window.chatConfig.saveConfigToLocalStorage();
    alert('Configurazione salvata con successo!');
}

async function updateConfigAndFetchModels() {
    const newConfigValues = {
        provider: providerNameSelect.value,
        base_url: endpointUrlInput.value,
    };
    window.chatConfig.updateConfig(newConfigValues);
    const currentConfig = window.chatConfig.getCurrentConfig();
    await window.chatConfig.fetchModels(currentConfig.provider, currentConfig.base_url, currentConfig.model);
}

function handleNewChat() {
    const newSession = window.chatManager.createNewChatSession();
    window.chatManager.switchChatSession(newSession.id);
    window.ui.renderChatSessions(window.chatManager.getChatSessions(), newSession.id);
    window.ui.renderChatHistory([]); // Clear UI for new chat
    window.ui.clearImageResults(); // Clear image results for new chat
}

async function generateImage() {
    const prompt = imagePromptInput.value.trim();
    const size = imageSizeSelect.value;
    const quality = imageQualitySelect.value;
    const currentConfig = window.chatConfig.getCurrentConfig();

    if (prompt === '') {
        alert('Inserisci un prompt per generare l\'immagine.');
        return;
    }
    if (!currentConfig.is_image_model) {
        alert('Il modello selezionato non è configurato per la generazione di immagini. Seleziona un modello di tipo "Immagine" nella configurazione.');
        return;
    }

    window.ui.clearImageResults(); // Clear previous images
    window.ui.appendMessageToUI({ id: window.chatManager.generateUniqueId(), role: 'user', content: `Genera immagine: "${prompt}" (${size}, ${quality})` });
    window.chatManager.appendMessage('user', `Genera immagine: "${prompt}" (${size}, ${quality})`);

    try {
        // Mostra indicatore di generazione
        const generatingId = window.chatManager.generateUniqueId();
        window.ui.appendMessageToUI({
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
        window.ui.removeMessageFromUI(generatingId);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.images && data.images.length > 0) {
            // Aggiunge le immagini alla UI
            data.images.forEach(url => {
                window.ui.appendImageToUI(url);
            });
            
            const successMsg = `✅ Immagine generata con successo! (${data.size}, ${data.quality})`;
            window.ui.appendMessageToUI({
                id: window.chatManager.generateUniqueId(),
                role: 'ai',
                content: successMsg
            });
            window.chatManager.appendMessage('ai', successMsg);
            
            console.log('Immagine generata:', data);
        } else {
            const errorMsg = data.error || 'Errore nella generazione dell\'immagine.';
            window.ui.appendMessageToUI({
                id: window.chatManager.generateUniqueId(),
                role: 'ai',
                content: `❌ ${errorMsg}`
            });
            window.chatManager.appendMessage('ai', errorMsg);
        }
    } catch (error) {
        console.error('Errore durante la generazione dell\'immagine:', error);
        
        const errorMsg = error.message.includes('HTTP')
            ? `Errore del server: ${error.message}`
            : 'Si è verificato un errore di rete durante la generazione dell\'immagine.';
            
        window.ui.appendMessageToUI({
            id: window.chatManager.generateUniqueId(),
            role: 'ai',
            content: `❌ ${errorMsg}`
        });
        window.chatManager.appendMessage('ai', errorMsg);
        
        // Mostra notifica se disponibile
        if (window.chatConfig.showNotification) {
            window.chatConfig.showNotification(errorMsg, 'error');
        }
    }
}