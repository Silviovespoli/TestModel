// netlify/functions/models.js
const { OpenAI } = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

exports.handler = async function(event, context) {
    // Headers per CORS e performance
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Cache-Control': 'public, max-age=3600' // Cache modelli per 1 ora
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Metodo non consentito' })
        };
    }

    try {
        const { provider_name, endpoint_url } = JSON.parse(event.body);

        if (!provider_name) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Provider richiesto' })
            };
        }

        let models = [];
        if (provider_name === 'openai') {
            const apiKey = process.env.OPENAI_API_KEY;
            const baseURL = endpoint_url || 'https://api.openai.com/v1';
            
            if (apiKey) {
                try {
                    const openai = new OpenAI({
                        apiKey: apiKey,
                        baseURL: baseURL
                    });
                    const response = await openai.models.list();
                    
                    // Se è l'endpoint ufficiale, filtra solo modelli GPT e DALL-E
                    if (baseURL.includes('api.openai.com')) {
                        models = response.data
                            .filter(model => model.id.includes('gpt') || model.id.includes('dall-e'))
                            .map(model => model.id)
                            .sort();
                    } else {
                        // Per endpoint custom, prendi tutti i modelli
                        models = response.data
                            .map(model => model.id)
                            .sort();
                    }
                } catch (error) {
                    console.error('Errore recupero modelli:', error);
                    // Fallback ai modelli comuni
                    models = ['gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo', 'dall-e-3', 'dall-e-2'];
                }
            } else {
                // Nessuna API key configurata, restituisce un array vuoto
                models = [];
            }
        } else if (provider_name === 'anthropic') {
            // Modelli Claude aggiornati (no API pubblica per elenco)
            models = [
                'claude-3-5-sonnet-20241022',
                'claude-3-5-haiku-20241022',
                'claude-3-opus-20240229',
                'claude-3-sonnet-20240229',
                'claude-3-haiku-20240307'
            ];
        } else if (provider_name === 'ollama') {
            // Modelli comuni Ollama
            models = ['llama3.2', 'llama3.1', 'mistral', 'codellama', 'phi3'];
        } else if (provider_name === 'lmstudio') {
            // Placeholder per LM Studio (richiede endpoint specifico)
            models = ['Modello personalizzato'];
        } else {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Provider non supportato' })
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ models })
        };

    } catch (error) {
        console.error('Errore nella funzione models:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: error.message || 'Errore nel recupero dei modelli'
            })
        };
    }
};