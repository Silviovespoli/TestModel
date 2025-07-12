// public/assets/js/ui.js

import { deleteMessage, updateMessage, switchChatSession, renameChatSession, deleteChatSession, createNewChatSession, getChatSessions, getCurrentChatId } from './chat.js';

const chatHistoryDiv = document.getElementById('chat-history');
const chatListUl = document.getElementById('chat-list');
const imageResultsDiv = document.getElementById('image-results');

// Funzione per sanitizzare il contenuto HTML e prevenire XSS
function sanitizeHtml(content) {
    if (typeof content !== 'string') return '';
    
    // Crea un elemento temporaneo per la sanitizzazione
    const tempDiv = document.createElement('div');
    tempDiv.textContent = content;
    return tempDiv.innerHTML;
}

export function renderChatHistory(history) {
    chatHistoryDiv.innerHTML = ''; // Clear existing messages
    history.forEach(message => {
        appendMessageToUI(message);
    });
    chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight; // Scroll to bottom
}

export function appendMessageToUI(message) {
    const messageWrapper = document.createElement('div');
    messageWrapper.classList.add('message-wrapper', message.role);
    messageWrapper.dataset.messageId = message.id; // Store message ID

    const avatar = document.createElement('div');
    avatar.classList.add('message-avatar');
    avatar.textContent = message.role === 'user' ? 'Tu' : 'AI';

    const messageContent = document.createElement('div');
    messageContent.classList.add('message-content');
    // Sanitizza il contenuto per prevenire XSS
    messageContent.innerHTML = sanitizeHtml(message.content);

    // Add edit/delete actions for user messages
    if (message.role === 'user') {
        const actionsDiv = document.createElement('div');
        actionsDiv.classList.add('message-actions');

        const editButton = document.createElement('button');
        editButton.textContent = 'Modifica';
        editButton.onclick = () => enableMessageEdit(message.id, messageContent);

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Elimina';
        deleteButton.onclick = () => {
            if (confirm('Sei sicuro di voler eliminare questo messaggio?')) {
                deleteMessage(message.id);
                renderChatHistory(getChatHistory()); // Re-render chat after deletion
            }
        };

        actionsDiv.appendChild(editButton);
        actionsDiv.appendChild(deleteButton);
        messageContent.appendChild(actionsDiv);
    }

    messageWrapper.appendChild(avatar);
    messageWrapper.appendChild(messageContent);
    chatHistoryDiv.appendChild(messageWrapper);
    chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;
}

export function appendImageToUI(url) {
    const imageElement = document.createElement('img');
    imageElement.src = url;
    imageElement.classList.add('generated-image');
    imageResultsDiv.appendChild(imageElement);
    imageResultsDiv.scrollTop = imageResultsDiv.scrollHeight;
}

function enableMessageEdit(messageId, messageContentElement) {
    // Prevent multiple edits at once
    if (document.querySelector('.message-content.editing')) {
        alert('Stai già modificando un messaggio. Salva o annulla prima.');
        return;
    }

    const originalContent = messageContentElement.textContent;
    messageContentElement.classList.add('editing');
    messageContentElement.setAttribute('contenteditable', 'true');
    messageContentElement.focus();

    // Create save/cancel buttons
    const saveButton = document.createElement('button');
    saveButton.textContent = 'Salva';
    saveButton.classList.add('edit-action-button');
    saveButton.onclick = () => {
        const newContent = messageContentElement.textContent.trim();
        if (newContent !== originalContent) {
            updateMessage(messageId, newContent);
            // Re-render chat history from this point to reflect changes
            const updatedHistory = getChatHistory();
            const messageIndex = updatedHistory.findIndex(msg => msg.id === messageId);
            renderChatHistory(updatedHistory.slice(0, messageIndex + 1)); // Render up to the edited message
            alert('Messaggio modificato. La conversazione è stata troncata da questo punto. Puoi continuare a chattare.');
        }
        disableMessageEdit(messageContentElement, saveButton, cancelButton);
    };

    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Annulla';
    cancelButton.classList.add('edit-action-button');
    cancelButton.onclick = () => {
        messageContentElement.innerHTML = sanitizeHtml(originalContent); // Revert content sanitized
        disableMessageEdit(messageContentElement, saveButton, cancelButton);
    };

    // Append buttons near the message or input area
    const inputArea = document.getElementById('input-area');
    inputArea.appendChild(saveButton);
    inputArea.appendChild(cancelButton);
}

function disableMessageEdit(messageContentElement, saveButton, cancelButton) {
    messageContentElement.classList.remove('editing');
    messageContentElement.removeAttribute('contenteditable');
    if (saveButton && saveButton.parentNode) {
        saveButton.parentNode.removeChild(saveButton);
    }
    if (cancelButton && cancelButton.parentNode) {
        cancelButton.parentNode.removeChild(cancelButton);
    }
}

export function renderChatSessions(sessions, currentChatId) {
    chatListUl.innerHTML = '';
    sessions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Sort by most recent
    sessions.forEach(session => {
        const li = document.createElement('li');
        li.dataset.chatId = session.id;
        li.classList.toggle('active', session.id === currentChatId);

        const chatTitle = document.createElement('span');
        chatTitle.classList.add('chat-title');
        // Sanitizza il nome della chat per prevenire XSS
        chatTitle.innerHTML = sanitizeHtml(session.name);
        chatTitle.onclick = () => switchChatSession(session.id);

        const actionsDiv = document.createElement('div');
        actionsDiv.classList.add('chat-actions');

        const renameButton = document.createElement('button');
        renameButton.textContent = 'Rinomina';
        renameButton.onclick = (e) => {
            e.stopPropagation(); // Prevent switching chat
            const newName = prompt('Rinomina chat:', session.name);
            if (newName && newName.trim() !== session.name) {
                renameChatSession(session.id, newName.trim());
                renderChatSessions(getChatSessions(), getCurrentChatId()); // Re-render list
            }
        };

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Elimina';
        deleteButton.onclick = (e) => {
            e.stopPropagation(); // Prevent switching chat
            if (confirm(`Sei sicuro di voler eliminare la chat "${session.name}"?`)) {
                deleteChatSession(session.id);
                renderChatSessions(getChatSessions(), getCurrentChatId()); // Re-render list
                if (!getCurrentChatId() && getChatSessions().length > 0) {
                    // If current chat was deleted and others exist, switch to the first one
                    switchChatSession(getChatSessions()[0].id);
                    renderChatHistory(getChatHistory());
                } else if (getChatSessions().length === 0) {
                    // If no chats left, create a new one
                    const newSession = createNewChatSession();
                    renderChatSessions(getChatSessions(), newSession.id);
                    renderChatHistory([]);
                }
            }
        };

        actionsDiv.appendChild(renameButton);
        actionsDiv.appendChild(deleteButton);

        li.appendChild(chatTitle);
        li.appendChild(actionsDiv);
        chatListUl.appendChild(li);
    });
}

export function updateConfigUI(config) {
    document.getElementById('endpoint_url').value = config.base_url;
    document.getElementById('api_key').value = config.api_key; // Display for local endpoints
    document.getElementById('provider_name').value = config.provider;
    document.getElementById('model_name').value = config.model;
    document.getElementById('temperature').value = config.temperature;
    document.getElementById('max_tokens').value = config.max_tokens;
    document.getElementById('model_type').value = config.is_image_model ? 'image' : 'text';

    // Show/hide image generation section based on model type
    const imageGenerationSection = document.getElementById('image-generation-section');
    if (config.is_image_model) {
        imageGenerationSection.style.display = 'block';
    } else {
        imageGenerationSection.style.display = 'none';
    }
}

export function clearImageResults() {
    imageResultsDiv.innerHTML = '';
}

// Auto-resize textarea function
export function initializeTextareaAutoResize() {
    if (window.userMessageInput) {
        window.userMessageInput.addEventListener('input', () => {
            window.userMessageInput.style.height = 'auto';
            window.userMessageInput.style.height = window.userMessageInput.scrollHeight + 'px';
        });
    }
}

// Funzione per rimuovere un messaggio dalla UI (necessaria per indicatori di caricamento)
export function removeMessageFromUI(messageId) {
    const messageElement = chatHistoryDiv.querySelector(`[data-message-id="${messageId}"]`);
    if (messageElement) {
        messageElement.remove();
    }
}

// Le funzioni sono state esportate singolarmente utilizzando 'export'.