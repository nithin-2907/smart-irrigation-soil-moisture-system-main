const express = require('express');
const router = express.Router();
const axios = require('axios');

router.get('/', async (req, res) => {
    try {
        const { state, district, limit = 10 } = req.query;
        const apiKey = process.env.MARKET_DATA_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'Server configuration error: Market API Key missing' });
        }

        // Base URL for OGD India API (Agmarknet)
        // Note: Using a generic resource ID for current daily prices. 
        // You might need to update this resource ID if the government dataset changes.
        // ID: 9ef84268-d588-465a-a308-a864a43d0070 is commonly used for "Current Daily Price of Various Commodities"
        const BASE_URL = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';

        const params = {
            'api-key': apiKey,
            'format': 'json',
            'limit': limit,
            'filters[state]': state,
            'filters[district]': district
        };

        // Remove undefined filters
        Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);

        const response = await axios.get(BASE_URL, { params, timeout: 8000 });

        res.json(response.data);

    } catch (error) {
        console.warn('Market API Error (falling back to simulated data):', error.message);

        // Generate simulated fallback data
        const state = req.query.state || 'Andhra Pradesh';
        const district = req.query.district || 'Chittoor';

        const fallbackRecords = [
            { state, district, market: 'Tirupati', commodity: 'Tomato', min_price: '2000', max_price: '2500', modal_price: '2200', arrival_date: new Date().toISOString().split('T')[0] },
            { state, district, market: 'Tirupati', commodity: 'Onion', min_price: '1500', max_price: '1800', modal_price: '1650', arrival_date: new Date().toISOString().split('T')[0] },
            { state, district, market: 'Madanapalle', commodity: 'Tomato', min_price: '2100', max_price: '2600', modal_price: '2300', arrival_date: new Date().toISOString().split('T')[0] },
            { state, district, market: 'Chittoor (Town)', commodity: 'Mango', min_price: '4000', max_price: '5500', modal_price: '4800', arrival_date: new Date().toISOString().split('T')[0] },
            { state, district, market: 'Chittoor (Town)', commodity: 'Green Chilli', min_price: '3000', max_price: '3500', modal_price: '3200', arrival_date: new Date().toISOString().split('T')[0] }
        ];

        res.json({
            records: fallbackRecords,
            note: "Simulated data: Government API is currently unreachable."
        });
    }
});

module.exports = router;
