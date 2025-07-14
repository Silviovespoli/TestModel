// netlify/functions/generate_image.js
const { OpenAI } = require('openai');
const { Ratelimit } = require('@upstash/ratelimit');
const { Redis } = require('@upstash/redis');

// Inizializza il rate limiter (5 richieste ogni 60 secondi per IP)
const ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(5, '60 s'),
    analytics: true,
});

// Funzione per determinare l'origine consentita
const getAllowedOrigin = () => {
    const netlifyUrl = process.env.URL; // URL del sito Netlify
    const netlifySiteUrl = process.env.SITE_URL; // URL primario del sito
    // In sviluppo, consenti localhost. In produzione, solo l'URL del sito.
    return process.env.NETLIFY_DEV ? 'http://localhost:8888' : (netlifySiteUrl || netlifyUrl);
};

exports.handler = async function(event) {
    const allowedOrigin = getAllowedOrigin();
    // Headers per CORS e performance
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // Applica il rate limiting basato sull'IP del client
    const ip = event.headers['x-nf-client-connection-ip'] || '127.0.0.1';
    const { success, limit, remaining, reset } = await ratelimit.limit(ip);

    if (!success) {
        return {
            statusCode: 429,
            headers: {
                ...headers,
                'X-RateLimit-Limit': limit,
                'X-RateLimit-Remaining': remaining,
                'X-RateLimit-Reset': reset,
            },
            body: JSON.stringify({ error: 'Troppe richieste. Riprova più tardi.' })
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Metodo non consentito' })
        };
    }

    try {
        const { prompt, size, quality, model, openai_endpoint } = JSON.parse(event.body);

        // Validazione input
        const allowedSizes = ['1024x1024', '1792x1024', '1024x1792'];
        const allowedQualities = ['standard', 'hd'];
        const allowedModels = ['dall-e-3', 'dall-e-2'];

        if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Prompt richiesto e deve essere una stringa non vuota.' }) };
        }
        if (prompt.length > 4000) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Il prompt è troppo lungo (max 4000 caratteri per DALL-E 3).' }) };
        }
        if (size && !allowedSizes.includes(size)) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: `Dimensione non valida. Valori consentiti: ${allowedSizes.join(', ')}` }) };
        }
        if (quality && !allowedQualities.includes(quality)) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: `Qualità non valida. Valori consentiti: ${allowedQualities.join(', ')}` }) };
        }
        if (model && !allowedModels.includes(model)) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: `Modello non valido. Valori consentiti: ${allowedModels.join(', ')}` }) };
        }

        // Recupera configurazione dalla richiesta o variabili ambiente
        const apiKey = process.env.OPENAI_API_KEY; // Meglio usare variabili ambiente per sicurezza

        if (!apiKey) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    error: 'API Key OpenAI non configurata sul server. Verifica le variabili d\'ambiente OPENAI_API_KEY.'
                })
            };
        }

        const openaiConfig = {
            apiKey: apiKey,
        };

        if (openai_endpoint && typeof openai_endpoint === 'string') {
            openaiConfig.baseURL = openai_endpoint;
        }

        const openai = new OpenAI(openaiConfig);

        const imageParams = {
            model: model,
            prompt: prompt,
            n: 1,
            size: size,
        };

        // Aggiungi qualità solo per DALL-E 3
        if (model === 'dall-e-3') {
            imageParams.quality = quality;
        }

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
        console.error('Errore nella funzione generate_image:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: error.message || 'Errore nella generazione dell\'immagine'
            })
        };
    }
};