// public/assets/js/config.js

const DEFAULT_CONFIG = {
    provider: 'openai',
    base_url: 'https://api.openai.com/v1',
    api_key: '', // Should not be directly used for API calls from frontend
    model: '',
    temperature: 0.7,
    max_tokens: 1000,
    is_image_model: false
};

let currentConfig = { ...DEFAULT_CONFIG };

function saveConfigToLocalStorage() {
    try {
        localStorage.setItem('chatAppConfig', JSON.stringify(currentConfig));
        console.log('Configurazione salvata in localStorage.');
    } catch (e) {
        console.error('Errore nel salvataggio della configurazione:', e);
    }
}

function loadConfigFromLocalStorage() {
    try {
        const savedConfig = localStorage.getItem('chatAppConfig');
        if (savedConfig) {
            currentConfig = { ...DEFAULT_CONFIG, ...JSON.parse(savedConfig) };
            console.log('Configurazione caricata da localStorage.');
        } else {
            console.log('Nessuna configurazione trovata, usando i default.');
        }
    } catch (e) {
        console.error('Errore nel caricamento della configurazione:', e);
        currentConfig = { ...DEFAULT_CONFIG }; // Reset to default on error
    }
}

function getCurrentConfig() {
    return { ...currentConfig };
}

function updateConfig(newValues) {
    currentConfig = { ...currentConfig, ...newValues };
    saveConfigToLocalStorage();
}

// Funzione per recuperare i modelli disponibili dal serverless function
async function fetchModels(provider, endpoint, selectedModel = null) {
    const modelNameSelect = document.getElementById('model_name');
    modelNameSelect.innerHTML = ''; // Clear existing options

    try {
        const response = await fetch('/api/models', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ provider_name: provider, endpoint_url: endpoint })
        });
        const data = await response.json();
        
        if (data.models && data.models.length > 0) {
            data.models.forEach(model => {
                const option = document.createElement('option');
                option.value = model;
                option.textContent = model;
                modelNameSelect.appendChild(option);
            });
            if (selectedModel && data.models.includes(selectedModel)) {
                modelNameSelect.value = selectedModel;
            } else {
                modelNameSelect.value = data.models[0];
            }
            updateConfig({ model: modelNameSelect.value }); // Update config with selected model
        } else {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Nessun modello disponibile';
            modelNameSelect.appendChild(option);
            updateConfig({ model: '' });
        }
    } catch (error) {
        console.error('Errore durante il recupero dei modelli:', error);
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Errore nel caricamento dei modelli';
        modelNameSelect.appendChild(option);
        updateConfig({ model: '' });
    }
}

// Esporta le funzioni per renderle disponibili ad altri script
window.chatConfig = {
    DEFAULT_CONFIG,
    getCurrentConfig,
    updateConfig,
    loadConfigFromLocalStorage,
    saveConfigToLocalStorage,
    fetchModels
};