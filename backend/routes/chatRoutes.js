const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const axios = require('axios');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

router.post('/', async (req, res) => {
    try {
        const { message, sessionId, language, userEmail, context } = req.body;

        if (!message || !userEmail) {
            return res.status(400).json({ error: 'Message and userEmail are required' });
        }

        if (!process.env.GROQ_API_KEY) {
            console.error('GROQ_API_KEY is missing in .env');
            return res.status(500).json({ error: 'Server configuration error: API key missing' });
        }

        // 1. Save user message
        const userMessage = new Chat({
            sessionId, // keeping for backwards compatibility
            userEmail,
            role: 'user',
            content: message
        });
        await userMessage.save();

        // 2. Fetch context (last 20 messages for better history)
        const history = await Chat.find({ userEmail })
            .sort({ timestamp: -1 })
            .limit(20)
            .lean(); // Convert to plain JS objects

        // Reverse to chronological order for the API
        const conversationHistory = history.reverse().map(msg => ({
            role: msg.role,
            content: msg.content
        }));

        const targetLanguage = language || 'English';

        // Add system instruction if needed
        let contextText = "";
        if (context) {
            contextText = `\nFARM CONTEXT (use this to provide personalized answers):\n`;
            if (context.location) contextText += `- Location: ${context.location}\n`;
            if (context.weather) contextText += `- Current Weather: ${context.weather.temp}°C, ${context.weather.condition}, ${context.weather.humidity}% humidity, ${context.weather.rain}mm rain\n`;
            if (context.dashboard) contextText += `- Farm History: Avg Moisture ${context.dashboard.avgMoisture}%, Total Rain ${context.dashboard.totalRain}mm\n`;
        }

        const systemMessage = {
            role: 'system',
            content: `You are an intelligent agricultural assistant for the Smart Irrigation System. Your goal is to guide efficient use of water, help farmers with crop recommendations, weather-based advice, and soil management. Be concise and helpful.${contextText}

IMPORTANT: YOU MUST REPLY TO THE USER IN ${targetLanguage.toUpperCase()}. Do not provide answers in any other language.`
        };

        const messages = [systemMessage, ...conversationHistory];

        // 3. Call Groq API
        const response = await axios.post(
            GROQ_API_URL,
            {
                model: 'llama-3.1-8b-instant', // Updated to supported model
                messages: messages,
                temperature: 0.7,
                max_tokens: 1024
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const botContent = response.data.choices[0]?.message?.content || "I couldn't generate a response.";

        // 4. Save assistant response
        const botMessage = new Chat({
            sessionId,
            userEmail,
            role: 'assistant',
            content: botContent
        });
        await botMessage.save();

        res.json({ reply: botContent });

    } catch (error) {
        console.error('Chatbot Error:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Failed to process chat request',
            details: error.response?.data || error.message
        });
    }
});

router.get('/history/:userEmail', async (req, res) => {
    try {
        const { userEmail } = req.params;
        const history = await Chat.find({ userEmail }).sort({ timestamp: 1 });
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

module.exports = router;
