const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const axios = require('axios');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

router.post('/', async (req, res) => {
    try {
        const { message, sessionId } = req.body;

        if (!message || !sessionId) {
            return res.status(400).json({ error: 'Message and sessionId are required' });
        }

        if (!process.env.GROQ_API_KEY) {
            console.error('GROQ_API_KEY is missing in .env');
            return res.status(500).json({ error: 'Server configuration error: API key missing' });
        }

        // 1. Save user message
        const userMessage = new Chat({
            sessionId,
            role: 'user',
            content: message
        });
        await userMessage.save();

        // 2. Fetch context (last 10 messages)
        const history = await Chat.find({ sessionId })
            .sort({ timestamp: -1 })
            .limit(10)
            .lean(); // Convert to plain JS objects

        // Reverse to chronological order for the API
        const conversationHistory = history.reverse().map(msg => ({
            role: msg.role,
            content: msg.content
        }));

        // Add system instruction if needed
        const systemMessage = {
            role: 'system',
            content: 'You are an intelligent agricultural assistant for the Smart Irrigation System. efficient use of water, help farmers with crop recommendations, weather-based advice, and soil management. Be concise and helpful.'
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

router.get('/history/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const history = await Chat.find({ sessionId }).sort({ timestamp: 1 });
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

module.exports = router;
