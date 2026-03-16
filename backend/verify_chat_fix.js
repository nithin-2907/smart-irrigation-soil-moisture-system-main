const axios = require('axios');
require('dotenv').config();

async function verifyLanguage(lang, message) {
    const url = 'http://localhost:5000/api/chat';
    const email = 'verify@example.com';
    
    console.log(`\nTesting [${lang}] with message: "${message}"`);
    try {
        const response = await axios.post(url, {
            message,
            userEmail: email,
            language: lang,
            sessionId: 'verify-' + Date.now()
        });
        const reply = response.data.reply;
        console.log('Bot Response:', reply);
        
        // Basic heuristic: check if response contains English words for English, or Devanagari characters for Hindi
        if (lang === 'English') {
            const hasHindi = /[\u0900-\u097F]/.test(reply);
            if (hasHindi) {
                console.log('❌ FAILED: Found Hindi in English response.');
            } else {
                console.log('✅ PASSED: Response appears to be in English.');
            }
        } else if (lang === 'Hindi') {
            const hasHindi = /[\u0900-\u097F]/.test(reply);
            if (!hasHindi) {
                console.log('❌ FAILED: No Devanagari found in Hindi response.');
            } else {
                console.log('✅ PASSED: Response appears to be in Hindi.');
            }
        }
    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}

async function runVerification() {
    console.log('=== Chatbot Language Verification ===');
    await verifyLanguage('English', 'Tell me about tomatoes.');
    await verifyLanguage('Hindi', 'टमाटर के बारे में बताएं।');
    await verifyLanguage('English', 'How to grow rice?');
}

runVerification();
