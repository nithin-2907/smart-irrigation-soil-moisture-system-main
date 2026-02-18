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

        const response = await axios.get(BASE_URL, { params });

        res.json(response.data);

    } catch (error) {
        console.error('Market API Error:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Failed to fetch market prices',
            details: error.response?.data || error.message
        });
    }
});

module.exports = router;
