// netlify/functions/models.js
const { OpenAI } = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { provider, apiKey, endpoint } = JSON.parse(event.body);

        if (!apiKey) {
            return { statusCode: 400, body: 'API Key is required.' };
        }

        let models = [];
        if (provider === 'openai') {
            // In un'applicazione reale, qui faresti una chiamata all'API OpenAI per listare i modelli.
            // Per semplicità, restituiamo un elenco fisso.
            models = ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'];
        } else if (provider === 'anthropic') {
            // Similmente per Anthropic
            models = ['claude-opus-4', 'claude-sonnet-4', 'claude-haiku-4'];
        } else {
            return { statusCode: 400, body: 'Invalid API provider.' };
        }

        return {
            statusCode: 200,
            body: JSON.stringify(models)
        };

    } catch (error) {
        console.error('Error in models function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message || 'Failed to fetch models.' })
        };
    }
};