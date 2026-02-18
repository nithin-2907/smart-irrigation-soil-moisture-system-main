const axios = require('axios');

async function testMarket() {
    const url = 'http://localhost:5000/api/market';
    console.log(`Testing Market API at ${url}`);

    try {
        const response = await axios.get(url, {
            params: {
                state: 'Andhra Pradesh',
                limit: 3
            }
        });

        console.log('✅ Success! Data received:');
        if (response.data.records) {
            console.log(`Records found: ${response.data.records.length}`);
            console.log('Sample Record:', response.data.records[0]);
        } else {
            console.log('Response structure:', response.data);
        }

    } catch (error) {
        console.error('❌ Test Failed:', error.response ? error.response.data : error.message);
    }
}

testMarket();
