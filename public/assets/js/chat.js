// public/assets/js/chat.js

import { showNotification } from './config.js';

let currentChatId = null;
let chatSessions = []; // [{ id: 'uuid', name: 'Chat Name', timestamp: 'ISOString' }]
let chatHistory = []; // Messages for the current chat

const CHAT_SESSIONS_KEY = 'chatAppSessions';
const CHAT_HISTORY_PREFIX = 'chatHistory_';

// Limite di memoria per localStorage (5MB approssimativo)
const MAX_LOCALSTORAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_CHAT_HISTORY_ENTRIES = 1000; // Massimo 1000 messaggi per chat

export function generateUniqueId() {
    // Usa crypto.randomUUID() se disponibile per sicurezza, altrimenti fallback
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return 'chat_' + crypto.randomUUID();
    }
    
    // Fallback sicuro usando crypto.getRandomValues se disponibile
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const array = new Uint32Array(2);
        crypto.getRandomValues(array);
        return 'chat_' + Date.now() + '_' + array[0].toString(36) + array[1].toString(36);
    }
    
    // Ultima risorsa - metodo originale ma con più entropia
    return 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9) + Math.random().toString(36).substr(2, 9);
}

// Funzione per controllare la dimensione del localStorage
function getLocalStorageSize() {
    let total = 0;
    for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
            total += localStorage[key].length + key.length;
        }
    }
    return total;
}

// Funzione per pulire localStorage quando si avvicina al limite
function cleanupLocalStorage() {
    const currentSize = getLocalStorageSize();
    
    if (currentSize > MAX_LOCALSTORAGE_SIZE * 0.8) { // 80% del limite
        console.warn('localStorage si sta avvicinando al limite, avvio pulizia...');
        
        // Ottieni tutte le chat sessions ordinate per timestamp
        const sessions = [...chatSessions].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        // Rimuovi le chat più vecchie fino a liberare spazio
        let removedCount = 0;
        for (const session of sessions) {
            if (session.id === currentChatId) continue; // Non rimuovere la chat corrente
            
            localStorage.removeItem(CHAT_HISTORY_PREFIX + session.id);
            chatSessions = chatSessions.filter(s => s.id !== session.id);
            removedCount++;
            
            if (getLocalStorageSize() < MAX_LOCALSTORAGE_SIZE * 0.6) { // 60% del limite
                break;
            }
        }
        
        if (removedCount > 0) {
            saveChatSessions();
            console.log(`Rimossi ${removedCount} chat sessions per liberare spazio`);
            
            // Mostra notifica all'utente se disponibile
            showNotification(`Rimosse ${removedCount} chat vecchie per liberare spazio`, 'info');
        }
    }
}

// Funzione per limitare la cronologia chat
function limitChatHistory() {
    if (chatHistory.length > MAX_CHAT_HISTORY_ENTRIES) {
        const removed = chatHistory.splice(0, chatHistory.length - MAX_CHAT_HISTORY_ENTRIES);
        console.log(`Rimossi ${removed.length} messaggi vecchi dalla cronologia`);
        
        showNotification(`Rimossi ${removed.length} messaggi vecchi per ottimizzare memoria`, 'info');
    }
}

export function saveChatSessions() {
    try {
        // Controlla spazio disponibile prima di salvare
        cleanupLocalStorage();
        
        localStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(chatSessions));
        console.log('Sessioni chat salvate.');
    } catch (e) {
        console.error('Errore nel salvataggio delle sessioni chat:', e);
        
        if (e.name === 'QuotaExceededError') {
            console.warn('Quota localStorage superata durante salvataggio sessioni');
            showNotification('Errore: spazio insufficiente per salvare le sessioni', 'error');
        }
    }
}

export function loadChatSessions() {
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

export function saveCurrentChatHistory() {
    if (currentChatId) {
        try {
            // Controlla e limita la cronologia prima di salvare
            limitChatHistory();
            
            // Controlla spazio disponibile prima di salvare
            cleanupLocalStorage();
            
            localStorage.setItem(CHAT_HISTORY_PREFIX + currentChatId, JSON.stringify(chatHistory));
            console.log(`Cronologia chat per ${currentChatId} salvata.`);
        } catch (e) {
            console.error(`Errore nel salvataggio della cronologia per ${currentChatId}:`, e);
            
            // Se fallisce per quota exceeded, prova a fare pulizia e riprova
            if (e.name === 'QuotaExceededError') {
                console.warn('Quota localStorage superata, tentativo di pulizia...');
                cleanupLocalStorage();
                
                try {
                    localStorage.setItem(CHAT_HISTORY_PREFIX + currentChatId, JSON.stringify(chatHistory));
                    console.log('Salvataggio riuscito dopo pulizia');
                } catch (e2) {
                    console.error('Fallimento definitivo nel salvataggio:', e2);
                    showNotification('Errore: spazio insufficiente per salvare la cronologia', 'error');
                }
            }
        }
    }
}

export function loadChatHistory(chatId) {
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

export function createNewChatSession() {
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

export function switchChatSession(chatId) {
    if (currentChatId && currentChatId !== chatId) {
        saveCurrentChatHistory(); // Save the chat we are leaving
    }
    currentChatId = chatId;
    loadChatHistory(chatId);
    // UI will be updated by ui.js
}

export function deleteChatSession(chatId) {
    chatSessions = chatSessions.filter(session => session.id !== chatId);
    saveChatSessions();
    localStorage.removeItem(CHAT_HISTORY_PREFIX + chatId);
    if (currentChatId === chatId) {
        currentChatId = null; // No current chat selected
        chatHistory = [];
    }
    console.log(`Chat session ${chatId} deleted.`);
}

export function renameChatSession(chatId, newName) {
    const session = chatSessions.find(s => s.id === chatId);
    if (session) {
        session.name = newName;
        session.timestamp = new Date().toISOString(); // Update timestamp on rename
        saveChatSessions();
        console.log(`Chat session ${chatId} renamed to "${newName}".`);
    }
}

export function appendMessage(role, content, messageId = generateUniqueId()) {
    const message = { id: messageId, role, content, timestamp: new Date().toISOString() };
    chatHistory.push(message);
    saveCurrentChatHistory();
    return message; // Return the message object for UI rendering
}

export function deleteMessage(messageId) {
    const initialLength = chatHistory.length;
    chatHistory = chatHistory.filter(msg => msg.id !== messageId);
    if (chatHistory.length < initialLength) {
        saveCurrentChatHistory();
        console.log(`Message ${messageId} deleted.`);
        return true;
    }
    return false;
}

export function updateMessage(messageId, newContent) {
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

export function getChatHistory() {
    return [...chatHistory]; // Return a copy
}

export function getCurrentChatId() {
    return currentChatId;
}

export function getChatSessions() {
    return [...chatSessions]; // Return a copy
}

// Le funzioni sono state esportate singolarmente utilizzando 'export'.