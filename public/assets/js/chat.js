// public/assets/js/chat.js

let currentChatId = null;
let chatSessions = []; // [{ id: 'uuid', name: 'Chat Name', timestamp: 'ISOString' }]
let chatHistory = []; // Messages for the current chat

const CHAT_SESSIONS_KEY = 'chatAppSessions';
const CHAT_HISTORY_PREFIX = 'chatHistory_';

function generateUniqueId() {
    return 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function saveChatSessions() {
    try {
        localStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(chatSessions));
        console.log('Sessioni chat salvate.');
    } catch (e) {
        console.error('Errore nel salvataggio delle sessioni chat:', e);
    }
}

function loadChatSessions() {
    try {
        const savedSessions = localStorage.getItem(CHAT_SESSIONS_KEY);
        if (savedSessions) {
            chatSessions = JSON.parse(savedSessions);
            console.log('Sessioni chat caricate.');
        } else {
            chatSessions = [];
            console.log('Nessuna sessione chat trovata.');
        }
    } catch (e) {
        console.error('Errore nel caricamento delle sessioni chat:', e);
        chatSessions = []; // Reset on error
    }
}

function saveCurrentChatHistory() {
    if (currentChatId) {
        try {
            localStorage.setItem(CHAT_HISTORY_PREFIX + currentChatId, JSON.stringify(chatHistory));
            console.log(`Cronologia chat per ${currentChatId} salvata.`);
        } catch (e) {
            console.error(`Errore nel salvataggio della cronologia per ${currentChatId}:`, e);
        }
    }
}

function loadChatHistory(chatId) {
    try {
        const savedHistory = localStorage.getItem(CHAT_HISTORY_PREFIX + chatId);
        if (savedHistory) {
            chatHistory = JSON.parse(savedHistory);
            console.log(`Cronologia chat per ${chatId} caricata.`);
        } else {
            chatHistory = [];
            console.log(`Nessuna cronologia trovata per ${chatId}.`);
        }
    } catch (e) {
        console.error(`Errore nel caricamento della cronologia per ${chatId}:`, e);
        chatHistory = []; // Reset on error
    }
    return chatHistory;
}

function createNewChatSession() {
    if (currentChatId) {
        saveCurrentChatHistory(); // Save current chat before switching
    }
    const newId = generateUniqueId();
    const newName = `Nuova Chat ${chatSessions.length + 1}`;
    const newSession = { id: newId, name: newName, timestamp: new Date().toISOString() };
    chatSessions.unshift(newSession); // Add to the beginning
    saveChatSessions();
    currentChatId = newId;
    chatHistory = []; // Clear current history for the new chat
    saveCurrentChatHistory(); // Save empty history for new chat
    return newSession;
}

function switchChatSession(chatId) {
    if (currentChatId && currentChatId !== chatId) {
        saveCurrentChatHistory(); // Save the chat we are leaving
    }
    currentChatId = chatId;
    loadChatHistory(chatId);
    // UI will be updated by ui.js
}

function deleteChatSession(chatId) {
    chatSessions = chatSessions.filter(session => session.id !== chatId);
    saveChatSessions();
    localStorage.removeItem(CHAT_HISTORY_PREFIX + chatId);
    if (currentChatId === chatId) {
        currentChatId = null; // No current chat selected
        chatHistory = [];
    }
    console.log(`Chat session ${chatId} deleted.`);
}

function renameChatSession(chatId, newName) {
    const session = chatSessions.find(s => s.id === chatId);
    if (session) {
        session.name = newName;
        session.timestamp = new Date().toISOString(); // Update timestamp on rename
        saveChatSessions();
        console.log(`Chat session ${chatId} renamed to "${newName}".`);
    }
}

function appendMessage(role, content, messageId = generateUniqueId()) {
    const message = { id: messageId, role, content, timestamp: new Date().toISOString() };
    chatHistory.push(message);
    saveCurrentChatHistory();
    return message; // Return the message object for UI rendering
}

function deleteMessage(messageId) {
    const initialLength = chatHistory.length;
    chatHistory = chatHistory.filter(msg => msg.id !== messageId);
    if (chatHistory.length < initialLength) {
        saveCurrentChatHistory();
        console.log(`Message ${messageId} deleted.`);
        return true;
    }
    return false;
}

function updateMessage(messageId, newContent) {
    const messageIndex = chatHistory.findIndex(msg => msg.id === messageId);
    if (messageIndex !== -1) {
        chatHistory[messageIndex].content = newContent;
        chatHistory[messageIndex].timestamp = new Date().toISOString(); // Update timestamp on edit
        // Remove subsequent messages if editing an older message
        chatHistory = chatHistory.slice(0, messageIndex + 1);
        saveCurrentChatHistory();
        return true;
    }
    return false;
}

function getChatHistory() {
    return [...chatHistory]; // Return a copy
}

function getCurrentChatId() {
    return currentChatId;
}

function getChatSessions() {
    return [...chatSessions]; // Return a copy
}

// Export functions for global access
window.chatManager = {
    generateUniqueId,
    saveChatSessions,
    loadChatSessions,
    saveCurrentChatHistory,
    loadChatHistory,
    createNewChatSession,
    switchChatSession,
    deleteChatSession,
    renameChatSession,
    appendMessage,
    deleteMessage, // Aggiunto
    updateMessage,
    getChatHistory,
    getCurrentChatId,
    getChatSessions
};