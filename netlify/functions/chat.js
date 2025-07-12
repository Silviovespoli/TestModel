// netlify/functions/chat.js
const { OpenAI } = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

// Rate limiting store (in-memory per instance)
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minuto
const RATE_LIMIT_MAX_REQUESTS = 10; // Max 10 richieste per minuto per IP

// Funzione per validare i parametri di input
function validateInputs(config, messages) {
    const errors = [];
    
    // Validazione configurazione
    if (!config || typeof config !== 'object') {
        errors.push('Configurazione non valida');
    }
    
    const { provider, model, temperature, max_tokens } = config;
    
    // Validazione provider
    if (!provider || !['openai', 'anthropic'].includes(provider)) {
        errors.push('Provider non valido. Deve essere "openai" o "anthropic"');
    }
    
    // Validazione modello
    if (!model || typeof model !== 'string' || model.trim().length === 0) {
        errors.push('Modello richiesto e deve essere una stringa non vuota');
    }
    
    // Validazione temperature
    if (temperature !== undefined) {
        if (typeof temperature !== 'number' || temperature < 0 || temperature > 2) {
            errors.push('Temperature deve essere un numero tra 0 e 2');
        }
    }
    
    // Validazione max_tokens - aumentato limite per endpoint custom
    if (max_tokens !== undefined) {
        if (typeof max_tokens !== 'number' || max_tokens < 1 || max_tokens > 100000) {
            errors.push('Max tokens deve essere un numero tra 1 e 100000');
        }
    }
    
    // Validazione messaggi
    if (!Array.isArray(messages)) {
        errors.push('Messages deve essere un array');
    } else {
        if (messages.length === 0) {
            errors.push('Almeno un messaggio è richiesto');
        }
        
        if (messages.length > 100) {
            errors.push('Troppi messaggi. Massimo 100 messaggi per richiesta');
        }
        
        messages.forEach((message, index) => {
            if (!message || typeof message !== 'object') {
                errors.push(`Messaggio ${index + 1}: formato non valido`);
                return;
            }
            
            if (!message.role || !['user', 'assistant', 'system'].includes(message.role)) {
                errors.push(`Messaggio ${index + 1}: role deve essere "user", "assistant" o "system"`);
            }
            
            if (!message.content || typeof message.content !== 'string') {
                errors.push(`Messaggio ${index + 1}: content deve essere una stringa non vuota`);
            } else if (message.content.length > 10000) {
                errors.push(`Messaggio ${index + 1}: content troppo lungo (max 10000 caratteri)`);
            }
        });
    }
    
    return errors;
}

// Funzione per rate limiting
function checkRateLimit(clientIp) {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW;
    
    // Pulisci vecchie entries
    for (const [ip, timestamps] of requestCounts.entries()) {
        const validTimestamps = timestamps.filter(ts => ts > windowStart);
        if (validTimestamps.length === 0) {
            requestCounts.delete(ip);
        } else {
            requestCounts.set(ip, validTimestamps);
        }
    }
    
    // Controlla rate limit per questo IP
    const timestamps = requestCounts.get(clientIp) || [];
    const validTimestamps = timestamps.filter(ts => ts > windowStart);
    
    if (validTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
        return false;
    }
    
    // Aggiungi timestamp corrente
    validTimestamps.push(now);
    requestCounts.set(clientIp, validTimestamps);
    
    return true;
}

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
        // Rate limiting
        const clientIp = event.headers['x-forwarded-for'] ||
                         event.headers['x-real-ip'] ||
                         '127.0.0.1';
        
        if (!checkRateLimit(clientIp)) {
            return {
                statusCode: 429,
                headers,
                body: JSON.stringify({
                    error: 'Rate limit superato. Riprova tra qualche minuto.'
                })
            };
        }

        const requestBody = JSON.parse(event.body);
        const { config = {}, messages = [] } = requestBody;
        
        // Debug logging
        console.log('Received request body:', JSON.stringify(requestBody, null, 2));
        console.log('Config received:', config);
        console.log('Messages received:', messages);
        
        // Validazione rigorosa degli input
        const validationErrors = validateInputs(config, messages);
        if (validationErrors.length > 0) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Errori di validazione',
                    details: validationErrors
                })
            };
        }
        
        const { provider, model, temperature, max_tokens, base_url } = config;
        
        // API Key deve venire da variabile d'ambiente per sicurezza
        let api_key;
        
        if (provider === 'openai') {
            api_key = process.env.OPENAI_API_KEY;
        } else if (provider === 'anthropic') {
            api_key = process.env.ANTHROPIC_API_KEY;
        }
        
        if (!api_key) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    error: `API Key per ${provider} non configurata sul server. Verifica le variabili d'ambiente.`
                })
            };
        }

        let response;
        if (provider === 'openai') {
            const openai = new OpenAI({
                apiKey: api_key,
                baseURL: base_url || 'https://api.openai.com/v1'
            });
            response = await openai.chat.completions.create({
                model: model,
                messages: messages,
                temperature: temperature || 0.7,
                max_tokens: max_tokens || 1000,
            });
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    response: response.choices[0].message.content,
                    usage: response.usage
                })
            };
        } else if (provider === 'anthropic') {
            const anthropic = new Anthropic({
                apiKey: api_key,
                baseURL: base_url || 'https://api.anthropic.com'
            });
            response = await anthropic.messages.create({
                model: model,
                max_tokens: max_tokens || 1000,
                messages: messages,
                temperature: temperature || 0.7,
            });
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    response: response.content[0].text,
                    usage: response.usage
                })
            };
        } else {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Provider API non valido' })
            };
        }

    } catch (error) {
        console.error('Errore nella funzione chat:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: error.message || 'Errore nel processare la richiesta chat'
            })
        };
    }
};