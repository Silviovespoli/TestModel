// netlify/functions/generate_image.js
const { OpenAI } = require('openai');

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { prompt, apiKey, endpoint } = JSON.parse(event.body);

        if (!apiKey) {
            return { statusCode: 400, body: 'API Key is required.' };
        }
        if (!prompt) {
            return { statusCode: 400, body: 'Prompt is required.' };
        }

        const openai = new OpenAI({ apiKey: apiKey, baseURL: endpoint || 'https://api.openai.com/v1' });

        const response = await openai.images.generate({
            model: "dall-e-3", // O un altro modello DALL-E supportato
            prompt: prompt,
            n: 1,
            size: "1024x1024",
        });

        return {
            statusCode: 200,
            body: JSON.stringify(response.data[0].url)
        };

    } catch (error) {
        console.error('Error in generate_image function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message || 'Failed to generate image.' })
        };
    }
};