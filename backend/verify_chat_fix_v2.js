const axios = require('axios');
require('dotenv').config();

const API_BASE = 'http://localhost:5000/api/chat';
const email = 'verify@example.com';

async function clearHistory() {
    console.log('\n--- Clearing History ---');
    try {
        const res = await axios.delete(`${API_BASE}/history/${encodeURIComponent(email)}`);
        console.log('Server response:', res.data.message);
    } catch (err) {
        console.error('Failed to clear history:', err.response ? err.response.data : err.message);
    }
}

async function verifyLanguage(lang, message) {
    console.log(`\nTesting [${lang}] with message: "${message}"`);
    try {
        const response = await axios.post(API_BASE, {
            message,
            userEmail: email,
            language: lang,
            sessionId: 'verify-' + Date.now()
        });
        const reply = response.data.reply;
        console.log('Bot Response Snippet:', reply.substring(0, 100) + '...');
        
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
    console.log('=== Chatbot V2 Verification ===');
    
    // 1. Clear any existing bias
    await clearHistory();
    
    // 2. Test English
    await verifyLanguage('English', 'What crops grow in summer?');
    
    // 3. Test Hindi
    await verifyLanguage('Hindi', 'गर्मी में कौन सी फसलें उगती हैं?');
    
    // 4. Test English after Hindi (persistence check)
    await verifyLanguage('English', 'Thank you, goodbye.');
}

runVerification();
