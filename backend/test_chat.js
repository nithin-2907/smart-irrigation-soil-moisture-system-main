const axios = require('axios');

async function testChat() {
    const url = 'http://localhost:5000/api/chat';
    const sessionId = 'test-session-' + Date.now();

    console.log(`Testing Chat API at ${url} with session ${sessionId}`);

    try {
        // 1. Send a message
        console.log('\nSending message: "Hello, how can I grow tomatoes?"');
        const response = await axios.post(url, {
            sessionId,
            message: 'Hello, how can I grow tomatoes?'
        });

        console.log('Response:', response.data);

        // 2. Check history
        console.log('\nChecking history...');
        const historyRes = await axios.get(`http://localhost:5000/api/chat/history/${sessionId}`);
        console.log('History count:', historyRes.data.length);
        console.log('Last message:', historyRes.data[historyRes.data.length - 1]);

    } catch (error) {
        console.error('Test Failed:', error.response ? error.response.data : error.message);
        if (error.response && error.response.data.error === 'Server configuration error: API key missing') {
            console.log('\n⚠️  Please add GROQ_API_KEY to your backend/.env file.');
        }
    }
}

testChat();
