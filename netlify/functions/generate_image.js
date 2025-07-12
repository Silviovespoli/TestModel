// netlify/functions/generate_image.js
const { OpenAI } = require('openai');

exports.handler = async function(event, context) {
    // Headers per CORS e performance
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
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
        const { prompt, size = "1024x1024", quality = "standard", model = "dall-e-3" } = JSON.parse(event.body);

        // Recupera configurazione dalla richiesta o variabili ambiente
        const apiKey = process.env.OPENAI_API_KEY; // Meglio usare variabili ambiente per sicurezza
        const endpoint = process.env.OPENAI_ENDPOINT || 'https://api.openai.com/v1';

        if (!apiKey) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    error: 'API Key OpenAI non configurata sul server. Verifica le variabili d\'ambiente OPENAI_API_KEY.'
                })
            };
        }
        if (!prompt) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Prompt richiesto per generazione immagine' })
            };
        }

        const openai = new OpenAI({
            apiKey: apiKey,
            baseURL: endpoint
        });

        const imageParams = {
            model: model,
            prompt: prompt,
            n: 1,
            size: size,
        };

        // Aggiungi qualità solo per DALL-E 3
        if (model === "dall-e-3") {
            imageParams.quality = quality;
        }

        console.log('Invio richiesta a OpenAI con i seguenti parametri:', imageParams);
        const response = await openai.images.generate(imageParams);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                images: [response.data[0].url],
                prompt: prompt,
                size: size,
                quality: quality,
                model: model
            })
        };

    } catch (error) {
        console.error('Errore dettagliato da OpenAI:', JSON.stringify(error, null, 2));
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Errore del server durante la generazione dell\'immagine.',
                details: error.message
            })
        };
    }
};