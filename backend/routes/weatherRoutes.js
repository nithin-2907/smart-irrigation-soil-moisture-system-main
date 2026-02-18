const express = require("express");
const axios = require("axios");
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const pythonExec = (function () {
  const venvPython = path.join(__dirname, '..', '..', '.venv', 'Scripts', 'python.exe');
  return fs.existsSync(venvPython) ? venvPython : 'python';
})();
const router = express.Router();
const WeatherData = require("../models/WeatherData");
const mongoose = require('mongoose'); // used to read latest model metrics from DB


// ✅ COLLECT WEATHER
router.get("/collect", async (req, res) => {
  try {
    const { city } = req.query;

    if (!city) {
      return res.status(400).json({
        error: "City name is required",
      });
    }

    const apiKey = process.env.OPENWEATHER_API_KEY;

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;

    const response = await axios.get(url);
    const data = response.data;

    const temp = data.main.temp;
    const hum = data.main.humidity;
    const press = data.main.pressure;
    const rain = data.rain ? data.rain["1h"] || 0 : 0;
    const wind = data.wind ? data.wind.speed : 0;

    // Calculate Soil Moisture (0-100%)
    // Formula: (humidity * 0.5) + (rainfall * 0.3) - (temperature * 0.1) - (wind_speed * 0.1)
    let calculatedMoisture = (hum * 0.5) + (rain * 0.3) - (temp * 0.1) - (wind * 0.1);

    // Normalize and clamp between 0 and 100
    // The formula can result in low values, so we might need a base offset or scaling. 
    // For now, using a base of 20 to ensure reasonable values, then clamping.
    // Actually, following user formula strictly, but adding clamping.
    // NOTE: The formula yields approx: (50*0.5) + 0 - (30*0.1) - (5*0.1) = 25 - 3 - 0.5 = 21.5%
    // This seems low for "Moderate". 
    // User said "Normalize value between 0–100%". 
    // I will stick to their formula but ensure it doesn't go below 0 or above 100.
    // Maybe add a slight boost if it's consistently too low during testing.

    calculatedMoisture = Math.max(0, Math.min(100, calculatedMoisture));

    const weather = await WeatherData.create({
      temperature: temp,
      humidity: hum,
      rainfall: rain,
      windSpeed: wind,
      pressure: press,
      city: city,
      soilMoisture: parseFloat(calculatedMoisture.toFixed(1)),
    });

    res.json({
      message: "Weather data collected successfully",
      weather,
      provider: "OpenWeather" // Keeping for internal use, usually hidden from UI
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ✅ GET LATEST WEATHER (FOR DASHBOARD)
router.get("/latest", async (req, res) => {
  try {

    const latestWeather = await WeatherData
      .findOne()
      .sort({ createdAt: -1 });

    if (!latestWeather) {
      return res.status(404).json({
        error: "No weather data found. Please collect first."
      });
    }

    res.json(latestWeather);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// GET → rainfall prediction + irrigation recommendation using ML model
router.get('/predict', async (req, res) => {
  try {
    const { city } = req.query;

    // get latest weather for city (fallback to most recent)
    const query = city ? { city } : {};
    const latest = await WeatherData.findOne(query).sort({ createdAt: -1 });
    if (!latest) return res.status(404).json({ error: 'No weather data available to predict' });

    const temperature = latest.temperature;
    const humidity = latest.humidity;
    const soilMoisture = latest.soilMoisture || 0;
    const rainfall_lag1 = latest.rainfall || 0;

    // compute dayofyear
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now - start + (start.getTimezoneOffset() - now.getTimezoneOffset()) * 60000;
    const dayofyear = Math.floor(diff / 86400000);

    // call python predictor
    const scriptPath = path.join(__dirname, '../../ml/predict_rain.py');
    const command = `"${pythonExec}" "${scriptPath}" ${temperature} ${humidity} ${soilMoisture} ${rainfall_lag1} ${dayofyear}`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        // model might not exist yet — return helpful message
        return res.status(500).json({ error: 'Rainfall model not available. Run /api/ml/train-rainfall first.' });
      }

      const predictedRain = parseFloat(stdout.trim());

      // irrigation logic
      const irrigation = (predictedRain >= 3 || soilMoisture >= 40)
        ? { required: false, reason: predictedRain >= 3 ? 'Rain expected' : 'Soil moisture sufficient' }
        : { required: true, reason: 'Dry conditions', suggested_mm: Math.max(5, Math.round((45 - soilMoisture) * 0.8)) };

      // attach model metadata / latest metrics (if available)
      const db = mongoose.connection.db;
      db.collection('rainfall_metrics').findOne({}, { sort: { createdAt: -1 } })
        .then(metrics => {
          res.json({
            input: { temperature, humidity, soilMoisture, rainfall_lag1, dayofyear },
            predictedRainfall_mm: predictedRain,
            irrigation,
            predictionSource: 'rainfall_model.pkl',
            modelMetrics: metrics || null
          });
        })
        .catch(err => {
          // still return prediction even if metrics lookup fails
          res.json({
            input: { temperature, humidity, soilMoisture, rainfall_lag1, dayofyear },
            predictedRainfall_mm: predictedRain,
            irrigation,
            predictionSource: 'rainfall_model.pkl',
            modelMetrics: null
          });
        });
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;