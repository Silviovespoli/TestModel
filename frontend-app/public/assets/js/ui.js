import { saveConfig, loadConfig } from './chat.js';
import { updateMessageInHistory, deleteMessageFromHistory, getModels } from './utils.js';

const chatMessagesDiv = document.getElementById('chatMessages');
const temperatureInput = document.getElementById('temperature');
const temperatureValueSpan = document.getElementById('temperatureValue');
const apiProviderSelect = document.getElementById('apiProvider');
const apiKeyInput = document.getElementById('apiKey');
const apiEndpointInput = document.getElementById('apiEndpoint');
const modelSelect = document.getElementById('modelSelect');

export function initializeUI() {
    const config = loadConfig();
    apiProviderSelect.value = config.apiProvider || 'openai';
    apiKeyInput.value = config.apiKey || '';
    apiEndpointInput.value = config.apiEndpoint || '';
    temperatureInput.value = config.temperature || 0.7;
    document.getElementById('maxTokens').value = config.maxTokens || 500;
    updateTemperatureValue(temperatureInput.value);

    // Listener per il cambio del provider API per aggiornare i modelli
    apiProviderSelect.addEventListener('change', async () => {
        const currentConfig = loadConfig();
        const models = await getModels(apiProviderSelect.value, currentConfig.apiEndpoint, currentConfig.apiKey);
        populateModelSelect(models, currentConfig.model);
    });
}

export function updateTemperatureValue(value) {
    temperatureValueSpan.textContent = value;
}

export function displayMessage(message, sender, messageId = null) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender);
    if (messageId) {
        messageDiv.dataset.messageId = messageId;
    }

    const messageBubble = document.createElement('div');
    messageBubble.classList.add('message-bubble');

    if (sender === 'ai' && message.startsWith('<img src=')) {
        messageBubble.innerHTML = message; // Contiene già il tag img
    } else {
        messageBubble.textContent = message;
    }

    // Aggiungi azioni per i messaggi utente
    if (sender === 'user') {
        const actionsDiv = document.createElement('div');
        actionsDiv.classList.add('message-actions');

        const editButton = document.createElement('button');
        editButton.textContent = 'Modifica';
        editButton.addEventListener('click', () => enableMessageEdit(messageDiv, messageBubble, messageId));

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Elimina';
        deleteButton.addEventListener('click', () => deleteMessage(messageDiv, messageId));

        actionsDiv.appendChild(editButton);
        actionsDiv.appendChild(deleteButton);
        messageBubble.appendChild(actionsDiv);
    }

    messageDiv.appendChild(messageBubble);
    chatMessagesDiv.appendChild(messageDiv);
    chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight; // Scorri in basso
}

function enableMessageEdit(messageDiv, messageBubble, messageId) {
    // Clona il messageBubble per preservare i nodi figli (i bottoni)
    const clonedBubble = messageBubble.cloneNode(true);
    // Rimuovi i bottoni di azione dal testo originale
    const actionsDiv = clonedBubble.querySelector('.message-actions');
    if (actionsDiv) {
        actionsDiv.remove();
    }
    const originalText = clonedBubble.textContent.trim(); // Prende il testo senza i bottoni
    messageBubble.innerHTML = ''; // Pulisce il contenuto della bolla

    const textarea = document.createElement('textarea');
    textarea.value = originalText;
    textarea.classList.add('edit-textarea');
    textarea.style.width = '100%';
    textarea.style.minHeight = '60px';
    textarea.style.boxSizing = 'border-box';
    textarea.style.padding = '10px';
    textarea.style.borderRadius = '8px';
    textarea.style.border = '1px solid #ccc';
    textarea.style.marginBottom = '10px';

    const saveButton = document.createElement('button');
    saveButton.textContent = 'Salva';
    saveButton.style.width = 'auto';
    saveButton.style.marginRight = '10px';
    saveButton.style.padding = '8px 15px';
    saveButton.style.backgroundColor = '#28a745';

    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Annulla';
    cancelButton.style.width = 'auto';
    cancelButton.style.padding = '8px 15px';
    cancelButton.style.backgroundColor = '#dc3545';

    messageBubble.appendChild(textarea);
    messageBubble.appendChild(saveButton);
    messageBubble.appendChild(cancelButton);

    saveButton.addEventListener('click', () => {
        const newText = textarea.value.trim();
        if (newText) {
            updateMessageInHistory(messageId, newText);
            messageBubble.textContent = newText; // Aggiorna il testo visualizzato
            // Ricrea e riaggiungi i bottoni di azione
            const actionsDiv = createMessageActions(messageDiv, messageBubble, messageId);
            messageBubble.appendChild(actionsDiv);
        } else {
            alert('Il messaggio non può essere vuoto.');
        }
    });

    cancelButton.addEventListener('click', () => {
        messageBubble.textContent = originalText; // Ripristina il testo originale
        // Ricrea e riaggiungi i bottoni di azione
        const actionsDiv = createMessageActions(messageDiv, messageBubble, messageId);
        messageBubble.appendChild(actionsDiv);
    });
}

function deleteMessage(messageDiv, messageId) {
    if (confirm('Sei sicuro di voler eliminare questo messaggio?')) {
        deleteMessageFromHistory(messageId);
        messageDiv.remove();
    }
}

export function clearChatMessages() {
    chatMessagesDiv.innerHTML = '';
}

export function showLoadingIndicator() {
    // Potresti aggiungere un indicatore di caricamento visibile nella UI
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loadingIndicator';
    loadingDiv.textContent = 'Caricamento...';
    loadingDiv.style.textAlign = 'center';
    loadingDiv.style.padding = '10px';
    loadingDiv.style.color = '#555';
    chatMessagesDiv.appendChild(loadingDiv);
    chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
}

export function hideLoadingIndicator() {
    const loadingDiv = document.getElementById('loadingIndicator');
    if (loadingDiv) {
        loadingDiv.remove();
    }
}

export function populateModelSelect(models, selectedModel = null) {
    modelSelect.innerHTML = ''; // Pulisci le opzioni esistenti
    if (models && models.length > 0) {
        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model;
            option.textContent = model;
            if (model === selectedModel) {
                option.selected = true;
            }
            modelSelect.appendChild(option);
        });
    } else {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Nessun modello disponibile';
        modelSelect.appendChild(option);
    }
}

// Funzione helper per creare i bottoni di azione del messaggio
function createMessageActions(messageDiv, messageBubble, messageId) {
    const actionsDiv = document.createElement('div');
    actionsDiv.classList.add('message-actions');

    const editButton = document.createElement('button');
    editButton.textContent = 'Modifica';
    editButton.addEventListener('click', () => enableMessageEdit(messageDiv, messageBubble, messageId));

    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Elimina';
    deleteButton.addEventListener('click', () => deleteMessage(messageDiv, messageId));

    actionsDiv.appendChild(editButton);
    actionsDiv.appendChild(deleteButton);
    return actionsDiv;
}