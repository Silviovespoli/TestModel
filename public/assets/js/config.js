// public/assets/js/config.js

export const DEFAULT_CONFIG = {
    provider: 'openai',
    base_url: 'https://api.openai.com/v1',
    // API key rimossa dal frontend per sicurezza - gestita solo lato server
    model: '',
    temperature: 0.7,
    max_tokens: 1000,
    is_image_model: false
};

let currentConfig = { ...DEFAULT_CONFIG };

export function saveConfigToLocalStorage() {
    try {
        const configToSave = { ...currentConfig };
        delete configToSave.api_key; // Rimuovi sempre la API key prima di salvare
        localStorage.setItem('chatAppConfig', JSON.stringify(configToSave));
        console.log('Configurazione salvata in localStorage.');
    } catch (e) {
        console.error('Errore nel salvataggio della configurazione:', e);
    }
}

export function loadConfigFromLocalStorage() {
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

export function getCurrentConfig() {
    return { ...currentConfig };
}

export function updateConfig(newValues) {
    currentConfig = { ...currentConfig, ...newValues };
    saveConfigToLocalStorage();
}

// Funzione ottimizzata per recuperare i modelli dalle Netlify Functions
export async function fetchModels(provider, endpoint, selectedModel = null) {
    const modelNameSelect = document.getElementById('model_name');
    if (!modelNameSelect) return;

    // Mostra loading state
    modelNameSelect.innerHTML = '<option value="">Caricamento modelli...</option>';
    modelNameSelect.disabled = true;

    try {
        const response = await fetch('/api/models', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                provider_name: provider,
                endpoint_url: endpoint
                // API key rimossa - gestita solo lato server tramite variabili d'ambiente
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Clear loading state
        modelNameSelect.innerHTML = '';
        modelNameSelect.disabled = false;
        
        if (data.models && data.models.length > 0) {
            data.models.forEach(model => {
                const option = document.createElement('option');
                option.value = model;
                option.textContent = model;
                modelNameSelect.appendChild(option);
            });
            
            // Seleziona il modello appropriato
            if (selectedModel && data.models.includes(selectedModel)) {
                modelNameSelect.value = selectedModel;
            } else {
                modelNameSelect.value = data.models[0];
            }
            
            updateConfig({ model: modelNameSelect.value });
            console.log(`Caricati ${data.models.length} modelli per ${provider}`);
        } else {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Nessun modello disponibile';
            modelNameSelect.appendChild(option);
            updateConfig({ model: '' });
        }
    } catch (error) {
        console.error('Errore durante il recupero dei modelli:', error);
        modelNameSelect.innerHTML = '';
        modelNameSelect.disabled = false;
        
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Errore nel caricamento';
        modelNameSelect.appendChild(option);
        updateConfig({ model: '' });
        
        // Mostra notifica all'utente
        showNotification('Errore nel caricamento dei modelli. Verifica la configurazione.', 'error');
    }
}

// Funzione utility per mostrare notifiche
export function showNotification(message, type = 'info') {
    // Implementazione semplice - può essere espansa
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 6px;
        color: white;
        z-index: 1000;
        opacity: 0.95;
        transition: opacity 0.3s ease;
        ${type === 'error' ? 'background-color: #e74c3c;' : 'background-color: #3498db;'}
    `;
    
    document.body.appendChild(notification);
    setTimeout(() => {
        try {
            notification.style.opacity = '0';
            setTimeout(() => {
                try {
                    if (notification.parentNode) {
                        document.body.removeChild(notification);
                    }
                } catch (e) {
                    console.warn('Errore nella rimozione della notifica:', e);
                }
            }, 300);
        } catch (e) {
            console.warn('Errore nell\'animazione della notifica:', e);
        }
    }, 3000);
}

// Le funzioni e le costanti vengono esportate singolarmente utilizzando 'export'.