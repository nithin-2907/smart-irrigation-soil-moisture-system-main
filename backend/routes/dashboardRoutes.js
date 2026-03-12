const express = require('express');
const router = express.Router();
const WeatherData = require('../models/WeatherData');

// GET /api/dashboard/stats - Returns aggregated KPIs
router.get('/stats', async (req, res) => {
    try {
        // Get data from the last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { city } = req.query;
        const filter = { createdAt: { $gte: sevenDaysAgo } };
        if (city) filter.city = city;

        console.log(`[Dashboard] Stats filter:`, JSON.stringify(filter));
        const recentData = await WeatherData.find(filter).sort({ createdAt: 1 }).maxTimeMS(5000);

        if (!recentData.length) {
            return res.json({
                avgMoisture: 0,
                totalRain: 0,
                avgTemp: 0,
                irrigationCount: 0,
                cropStress: 'Unknown'
            });
        }

        // Calculate aggregates
        const totalMoisture = recentData.reduce((sum, d) => sum + (d.soilMoisture || 0), 0);
        const totalRain = recentData.reduce((sum, d) => sum + (d.rainfall || 0), 0);
        const totalTemp = recentData.reduce((sum, d) => sum + (d.temperature || 0), 0);
        const count = recentData.length;

        const avgMoisture = Math.round(totalMoisture / count);
        const avgTemp = (totalTemp / count).toFixed(1);

        // Determine crop stress based on moisture
        let cropStress = 'Low'; // Healthy
        if (avgMoisture < 30) cropStress = 'High'; // Dry
        else if (avgMoisture < 50) cropStress = 'Moderate';

        res.json({
            avgMoisture,
            totalRain: totalRain.toFixed(1),
            avgTemp,
            dataPoints: count,
            cropStress
        });

    } catch (error) {
        console.error('Dashboard Stats Error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

// GET /api/dashboard/history - Returns daily data for charts (last 14 days rolling window)
router.get('/history', async (req, res) => {
    try {
        // Build a 14-day rolling window: from 13 days ago (00:00) to end of today
        const today = new Date();
        today.setHours(23, 59, 59, 999);

        const windowStart = new Date();
        windowStart.setDate(windowStart.getDate() - 13);
        windowStart.setHours(0, 0, 0, 0);

        const { city } = req.query;
        const filter = { createdAt: { $gte: windowStart, $lte: today } };
        if (city) filter.city = city;

        console.log(`[Dashboard] History filter:`, JSON.stringify(filter));
        // Fetch all records within the 14-day window
        const rawData = await WeatherData.find(filter).sort({ createdAt: 1 }).maxTimeMS(5000);

        // Build a map: "MMM D" -> { moisture[], rainfall[], temperature[], humidity[] }
        const dayBuckets = {};
        rawData.forEach(d => {
            const label = new Date(d.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            if (!dayBuckets[label]) dayBuckets[label] = { moisture: [], rainfall: [], temperature: [], humidity: [] };
            if (d.soilMoisture != null) dayBuckets[label].moisture.push(d.soilMoisture);
            if (d.rainfall != null) dayBuckets[label].rainfall.push(d.rainfall);
            if (d.temperature != null) dayBuckets[label].temperature.push(d.temperature);
            if (d.humidity != null) dayBuckets[label].humidity.push(d.humidity);
        });

        const avg = arr => arr.length ? parseFloat((arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(1)) : null;

        // Generate one entry per day in the window, newest day last
        const chartData = [];
        for (let i = 13; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const bucket = dayBuckets[label] || {};
            chartData.push({
                date: label,
                moisture: avg(bucket.moisture || []),
                rainfall: avg(bucket.rainfall || []),
                temperature: avg(bucket.temperature || []),
                humidity: avg(bucket.humidity || [])
            });
        }

        res.json(chartData);

    } catch (error) {
        console.error('Dashboard History Error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard history' });
    }
});

module.exports = router;
