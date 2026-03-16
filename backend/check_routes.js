const axios = require('axios');
const url = 'http://localhost:5000/api/chat/history/test@example.com';

axios.get(url)
    .then(res => console.log('GET Success:', res.data.length, 'messages'))
    .catch(err => console.error('GET Failed:', err.message));

axios.delete(url)
    .then(res => console.log('DELETE Success:', res.data.message))
    .catch(err => console.error('DELETE Failed:', err.message));
