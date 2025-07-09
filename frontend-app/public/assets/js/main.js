import { initializeUI, updateTemperatureValue, displayMessage, clearChatMessages, showLoadingIndicator, hideLoadingIndicator, populateModelSelect } from './ui.js';
import { sendMessage, generateImage, saveConfig, loadConfig, resetChatHistory, getModels } from './chat.js';

document.addEventListener('DOMContentLoaded', async () => {
    initializeUI(); // Inizializza gli elementi UI e i listener

    // Carica la configurazione salvata e la cronologia della chat all'avvio
    const config = loadConfig();
    // Qui potresti voler caricare la cronologia della chat se persistita

    // Popola i modelli disponibili
    const models = await getModels(config.apiProvider, config.apiEndpoint, config.apiKey);
    populateModelSelect(models, config.model);

    // Listener per l'invio del messaggio
    document.getElementById('sendMessage').addEventListener('click', async () => {
        const messageInput = document.getElementById('messageInput');
        const message = messageInput.value.trim();
        if (message) {
            displayMessage(message, 'user');
            messageInput.value = '';
            showLoadingIndicator();
            try {
                const response = await sendMessage(message);
                displayMessage(response, 'ai');
            } catch (error) {
                console.error('Errore nell\'invio del messaggio:', error);
                displayMessage('Si è verificato un errore durante l\'elaborazione del messaggio.', 'ai error');
            } finally {
                hideLoadingIndicator();
            }
        }
    });

    // Listener per la generazione dell'immagine
    document.getElementById('generateImage').addEventListener('click', async () => {
        const promptInput = document.getElementById('messageInput');
        const prompt = promptInput.value.trim();
        if (prompt) {
            displayMessage(`Richiesta immagine: "${prompt}"`, 'user');
            promptInput.value = '';
            showLoadingIndicator();
            try {
                const imageUrl = await generateImage(prompt);
                displayMessage(`<img src="${imageUrl}" alt="Immagine generata" style="max-width: 100%;">`, 'ai');
            } catch (error) {
                console.error('Errore nella generazione dell\'immagine:', error);
                displayMessage('Si è verificato un errore durante la generazione dell\'immagine.', 'ai error');
            } finally {
                hideLoadingIndicator();
            }
        }
    });

    // Listener per il salvataggio della configurazione
    document.getElementById('saveConfig').addEventListener('click', () => {
        saveConfig();
        alert('Configurazione salvata!');
    });

    // Listener per il reset della chat
    document.getElementById('resetChat').addEventListener('click', () => {
        resetChatHistory();
        clearChatMessages();
        alert('Cronologia chat resettata!');
    });

    // Listener per l'aggiornamento del valore della temperatura
    document.getElementById('temperature').addEventListener('input', (event) => {
        updateTemperatureValue(event.target.value);
    });

    // Listener per l'invio del messaggio con Enter
    document.getElementById('messageInput').addEventListener('keypress', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            document.getElementById('sendMessage').click();
        }
    });
});