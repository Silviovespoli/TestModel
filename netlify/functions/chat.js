// netlify/functions/chat.js
const { OpenAI } = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { provider, messages, model, temperature, maxTokens, apiKey, endpoint } = JSON.parse(event.body);

        if (!apiKey) {
            return { statusCode: 400, body: 'API Key is required.' };
        }
        if (!model) {
            return { statusCode: 400, body: 'Model is required.' };
        }

        let response;
        if (provider === 'openai') {
            const openai = new OpenAI({ apiKey: apiKey, baseURL: endpoint || 'https://api.openai.com/v1' });
            response = await openai.chat.completions.create({
                model: model,
                messages: messages,
                temperature: temperature,
                max_tokens: maxTokens,
            });
            return {
                statusCode: 200,
                body: JSON.stringify(response.choices[0].message.content)
            };
        } else if (provider === 'anthropic') {
            const anthropic = new Anthropic({ apiKey: apiKey, baseURL: endpoint || 'https://api.anthropic.com' });
            response = await anthropic.messages.create({
                model: model,
                max_tokens: maxTokens,
                messages: messages,
                temperature: temperature,
            });
            return {
                statusCode: 200,
                body: JSON.stringify(response.content[0].text)
            };
        } else {
            return { statusCode: 400, body: 'Invalid API provider.' };
        }

    } catch (error) {
        console.error('Error in chat function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message || 'Failed to process chat request.' })
        };
    }
};