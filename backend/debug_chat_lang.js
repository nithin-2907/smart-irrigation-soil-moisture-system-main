const axios = require('axios');
require('dotenv').config();

async function testChat(lang) {
    const url = 'http://localhost:5000/api/chat';
    const email = 'test@example.com';
    const message = 'What is the best crop for sandy soil?';
    
    console.log(`\n--- Testing with Language: ${lang} ---`);
    try {
        const response = await axios.post(url, {
            message,
            userEmail: email,
            language: lang,
            sessionId: 'debug-' + Date.now()
        });
        console.log('Response:', response.data.reply);
    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}

async function runTests() {
    await testChat('English');
    await testChat('Spanish');
}

runTests();
