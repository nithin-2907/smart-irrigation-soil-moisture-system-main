const https = require('https');

https.get('https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070', (res) => {
    console.log('Status Code:', res.statusCode);
}).on('error', (e) => {
    console.error('Error:', e);
});
