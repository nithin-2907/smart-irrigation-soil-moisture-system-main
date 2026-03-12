const https = require('https');
https.get('https://smart-irrigation-soil-moisture-system.onrender.com/api/ml/soil-location?lat=17.385&lon=78.4867', (res) => {
    let data = '';
    res.on('data', (d) => { data += d; });
    res.on('end', () => { console.log('STATUS:', res.statusCode); console.log('BODY:', data); });
}).on('error', (e) => { console.error(e); });
