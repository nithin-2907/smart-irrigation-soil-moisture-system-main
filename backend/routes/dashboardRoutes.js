const express = require('express');
const router = express.Router();
const WeatherData = require('../models/WeatherData');

// GET /api/dashboard/stats - Returns aggregated KPIs
router.get('/stats', async (req, res) => {
    try {
        // Get data from the last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentData = await WeatherData.find({
            createdAt: { $gte: sevenDaysAgo }
        }).sort({ createdAt: 1 });

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

// GET /api/dashboard/history - Returns daily data for charts
router.get('/history', async (req, res) => {
    try {
        // Get last 14 days of data
        const limit = 14;
        const historyData = await WeatherData.find()
            .sort({ createdAt: -1 })
            .limit(limit * 24); // Assuming hourly data, fetch enough to aggregate

        // We want to group by day for the charts usually, 
        // but if we have limited data, returning actual data points is fine.
        // For line charts, returning the last N records is often simplest.

        // Let's return the last 20 records reversed (oldest to newest) for the chart
        const chartData = historyData.slice(0, 20).reverse().map(d => ({
            date: new Date(d.createdAt).toLocaleDateString('en-US', { disable_year: true, month: 'short', day: 'numeric' }),
            fullDate: d.createdAt,
            moisture: d.soilMoisture || 0,
            rainfall: d.rainfall || 0,
            temperature: d.temperature || 0,
            humidity: d.humidity || 0
        }));

        res.json(chartData);

    } catch (error) {
        console.error('Dashboard History Error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard history' });
    }
});

module.exports = router;
