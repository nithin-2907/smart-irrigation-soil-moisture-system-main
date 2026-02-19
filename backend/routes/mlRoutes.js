const express = require("express");
const router = express.Router();
const { exec } = require("child_process");
const path = require("path");
const mongoose = require("mongoose");
const fs = require('fs');
const pythonExec = (function () {
  // prefer project virtualenv if present, otherwise fall back to system `python`
  const venvPython = path.join(__dirname, '..', '..', '.venv', 'Scripts', 'python.exe');
  return fs.existsSync(venvPython) ? venvPython : 'python';
})();

// single-flight promise used to avoid concurrent background trainings
let soilTrainingPromise = null;

const PredictionHistory = require("../models/PredictionHistory");
const SoilPrediction = require("../models/SoilPrediction");

// DEBUG helper - echo request body (temporary)
router.post('/echo', (req, res) => { res.json({ body: req.body }); });

// Debug Route to check DB and Model
router.get("/debug-ml", async (req, res) => {
  try {
    const count = await mongoose.connection.db.collection('crop_samples').countDocuments();

    const modelPath = path.join(__dirname, "../../ml/model.pkl");
    const modelExists = fs.existsSync(modelPath);
    const modelStats = modelExists ? fs.statSync(modelPath) : null;

    res.json({
      db_connection: mongoose.connection.readyState,
      crop_samples_count: count,
      model_exists: modelExists,
      model_size: modelStats ? modelStats.size : 0,
      model_mtime: modelStats ? modelStats.mtime : null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Soil Location — fetches real soil moisture from Open-Meteo + derives NPK/pH estimates
router.get("/soil-location", async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: "lat and lon are required" });

  try {
    const axios = require("axios");

    // 1. Open-Meteo — real soil moisture & soil temperature (free, global coverage)
    const meteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=soil_moisture_0_to_1cm,soil_moisture_1_to_3cm,soil_temperature_0cm&hourly=soil_moisture_0_to_7cm&forecast_days=1`;
    const meteoRes = await axios.get(meteoUrl, { timeout: 10000 });
    const current = meteoRes.data?.current || {};

    const soilMoisture = current.soil_moisture_0_to_1cm ?? null; // m³/m³
    const soilTemp = current.soil_temperature_0cm ?? null; // °C

    // 2. Derive soil properties from climate zone (latitude-based)
    //    and soil moisture. These are reasonable scientific estimates.
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);

    // Determine rough climate zone from lat
    let ph, nitrogen, phosphorus, potassium, soilType, soc, clay;

    if (Math.abs(latNum) < 10) {
      // Equatorial/Tropical — highly leached, acidic, high clay
      ph = 5.5; nitrogen = 48; phosphorus = 18; potassium = 120; soilType = "Clay"; soc = 28.0; clay = 45;
    } else if (Math.abs(latNum) < 23) {
      // Sub-tropical / Tropical India — red/loamy soils
      ph = 6.5; nitrogen = 55; phosphorus = 22; potassium = 145; soilType = "Loamy"; soc = 8.5; clay = 30;
    } else if (Math.abs(latNum) < 35) {
      // Warm temperate — alluvial/sandy, North India
      ph = 7.0; nitrogen = 70; phosphorus = 35; potassium = 180; soilType = "Sandy"; soc = 6.2; clay = 20;
    } else if (Math.abs(latNum) < 50) {
      // Temperate — Europe, Northern US, rich loam
      ph = 6.8; nitrogen = 80; phosphorus = 42; potassium = 160; soilType = "Loamy"; soc = 22.0; clay = 25;
    } else {
      // Boreal / Sub-arctic — peat/organic soils
      ph = 5.8; nitrogen = 40; phosphorus = 15; potassium = 90; soilType = "Sandy"; soc = 35.0; clay = 15;
    }

    // Adjust N based on actual soil moisture (wet soils → higher N availability)
    if (soilMoisture !== null) {
      const moisturePct = soilMoisture * 100; // convert m³/m³ to %
      nitrogen = Math.round(nitrogen * (0.7 + (moisturePct / 50)));
    }

    // Adjust pH based on rainfall zone (arid/semi-arid → more alkaline)
    // East of 75°E in India → peninsular, slightly more acidic
    if (lonNum > 75 && lonNum < 90 && latNum > 8 && latNum < 25) {
      ph = parseFloat((ph - 0.3).toFixed(1)); // South India tends more acidic
    }

    const soilMoisturePercent = soilMoisture !== null
      ? parseFloat((soilMoisture * 100).toFixed(1))
      : null;

    res.json({
      ph: ph,
      nitrogen: Math.min(120, Math.max(20, nitrogen)),
      phosphorus: phosphorus,
      potassium: potassium,
      soc: soc,       // Organic Carbon (g/kg)
      clay: clay,      // Clay content (%)
      soilMoisture: soilMoisturePercent,  // real from Open-Meteo (%)
      soilTemperature: soilTemp,             // real from Open-Meteo (°C)
      soilType: soilType,
      lat: parseFloat(lat),
      lon: parseFloat(lon),
      source: "Open-Meteo (soil moisture/temp) + regional soil model (NPK/pH/SOC/Clay)",
    });
  } catch (err) {
    console.error("Soil location error:", err.message);
    res.status(500).json({ error: `Soil data fetch failed: ${err.message}` });
  }
});

// Seed Route — crops with tightly bounded, distinct parameter ranges
router.get("/seed-data", async (req, res) => {
  try {
    const rnd = (lo, hi) => parseFloat((lo + Math.random() * (hi - lo)).toFixed(2));
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];

    // crop definitions: [temp, hum, rain, ph, moist, N, P, K, soils, seasons, regions]
    const cropDefs = [
      { crop: "Rice", temp: [22, 32], hum: [75, 95], rain: [160, 280], ph: [5.5, 7.0], moist: [50, 80], N: [60, 120], P: [25, 55], K: [25, 55], soils: ["Clay", "Loamy"], seasons: ["Kharif"], regions: ["South", "East", "West"], n: 200 },
      { crop: "Wheat", temp: [8, 18], hum: [40, 65], rain: [50, 100], ph: [6.0, 7.5], moist: [30, 55], N: [80, 120], P: [30, 70], K: [35, 65], soils: ["Loamy", "Sandy"], seasons: ["Rabi"], regions: ["North", "Central"], n: 200 },
      { crop: "Corn", temp: [20, 30], hum: [55, 75], rain: [80, 160], ph: [5.5, 7.0], moist: [40, 65], N: [70, 110], P: [30, 65], K: [30, 60], soils: ["Loamy", "Clay"], seasons: ["Kharif", "Rabi"], regions: ["North", "Central", "West"], n: 200 },
      { crop: "Millet", temp: [25, 35], hum: [30, 55], rain: [25, 70], ph: [5.5, 7.5], moist: [15, 40], N: [15, 45], P: [10, 40], K: [10, 40], soils: ["Sandy", "Red", "Loamy"], seasons: ["Kharif", "Zaid"], regions: ["South", "West"], n: 200 },
      { crop: "Cotton", temp: [28, 40], hum: [50, 70], rain: [60, 120], ph: [6.0, 8.0], moist: [30, 55], N: [10, 30], P: [10, 30], K: [15, 35], soils: ["Black", "Red", "Sandy"], seasons: ["Kharif"], regions: ["South", "Central"], n: 200 },
      { crop: "Jute", temp: [27, 37], hum: [75, 95], rain: [140, 280], ph: [6.0, 7.5], moist: [60, 90], N: [60, 100], P: [30, 60], K: [30, 60], soils: ["Clay", "Loamy"], seasons: ["Kharif"], regions: ["East"], n: 200 },
      { crop: "Apple", temp: [2, 12], hum: [65, 90], rain: [100, 180], ph: [5.5, 6.8], moist: [45, 75], N: [40, 75], P: [25, 55], K: [30, 60], soils: ["Loamy", "Sandy"], seasons: ["Rabi"], regions: ["North"], n: 200 },
      { crop: "Banana", temp: [24, 34], hum: [75, 95], rain: [150, 280], ph: [5.5, 7.0], moist: [50, 85], N: [80, 120], P: [30, 60], K: [50, 90], soils: ["Sandy", "Loamy"], seasons: ["Kharif", "Zaid"], regions: ["South", "East"], n: 200 },
      { crop: "Grapes", temp: [22, 32], hum: [55, 80], rain: [60, 110], ph: [6.0, 7.5], moist: [30, 60], N: [20, 55], P: [15, 45], K: [30, 65], soils: ["Sandy", "Loamy"], seasons: ["Rabi"], regions: ["South", "West"], n: 200 },
      { crop: "Mango", temp: [26, 38], hum: [45, 80], rain: [80, 150], ph: [5.5, 7.5], moist: [35, 65], N: [15, 40], P: [10, 30], K: [15, 40], soils: ["Sandy", "Red", "Loamy"], seasons: ["Zaid", "Kharif"], regions: ["South", "Central"], n: 200 },
      { crop: "Papaya", temp: [24, 34], hum: [65, 90], rain: [100, 200], ph: [6.0, 7.5], moist: [45, 80], N: [40, 70], P: [20, 50], K: [20, 50], soils: ["Clay", "Loamy"], seasons: ["Kharif", "Zaid"], regions: ["South", "East"], n: 200 },
      { crop: "Coconut", temp: [24, 34], hum: [75, 95], rain: [150, 250], ph: [5.5, 7.0], moist: [55, 85], N: [15, 35], P: [10, 30], K: [50, 90], soils: ["Sandy", "Loamy"], seasons: ["Kharif", "Zaid"], regions: ["South"], n: 200 },
      { crop: "Coffee", temp: [18, 26], hum: [70, 95], rain: [120, 240], ph: [5.5, 6.5], moist: [55, 85], N: [40, 75], P: [20, 50], K: [20, 60], soils: ["Clay", "Red"], seasons: ["Kharif", "Rabi"], regions: ["South"], n: 200 },
      { crop: "Sugarcane", temp: [23, 38], hum: [60, 90], rain: [150, 300], ph: [6.0, 7.5], moist: [50, 85], N: [70, 120], P: [30, 60], K: [15, 55], soils: ["Clay", "Loamy", "Black"], seasons: ["Kharif", "Zaid"], regions: ["South", "Central"], n: 150 },
      { crop: "Chickpea", temp: [18, 27], hum: [35, 60], rain: [50, 90], ph: [6.0, 8.0], moist: [20, 45], N: [35, 70], P: [55, 90], K: [15, 45], soils: ["Sandy", "Loamy", "Black"], seasons: ["Rabi"], regions: ["North", "Central"], n: 150 },
      { crop: "Lentil", temp: [14, 22], hum: [45, 70], rain: [55, 100], ph: [6.0, 8.0], moist: [25, 50], N: [15, 45], P: [20, 55], K: [15, 40], soils: ["Sandy", "Loamy"], seasons: ["Rabi"], regions: ["North", "Central"], n: 150 },
      { crop: "Groundnut", temp: [25, 35], hum: [40, 65], rain: [60, 120], ph: [5.5, 7.0], moist: [25, 55], N: [15, 40], P: [25, 55], K: [20, 50], soils: ["Sandy", "Loamy", "Red"], seasons: ["Kharif", "Rabi"], regions: ["South", "Central"], n: 150 },
    ];

    // Clear old data
    await mongoose.connection.db.collection('crop_samples').deleteMany({});

    const docs = [];
    for (const def of cropDefs) {
      for (let i = 0; i < def.n; i++) {
        docs.push({
          crop: def.crop,
          temperature: rnd(...def.temp),
          humidity: rnd(...def.hum),
          rainfall: rnd(...def.rain),
          soil_ph: rnd(...def.ph),
          soilMoisture: rnd(...def.moist),
          nitrogen: rnd(...def.N),
          phosphorus: rnd(...def.P),
          potassium: rnd(...def.K),
          soilType: pick(def.soils),
          season: pick(def.seasons),
          region: pick(def.regions),
          createdAt: new Date(),
        });
      }
    }

    await mongoose.connection.db.collection('crop_samples').insertMany(docs);
    res.json({ message: `Seeded ${docs.length} samples across ${cropDefs.length} crops`, total: docs.length });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Force Reseed — always clears old data, inserts fresh distinct crop ranges
router.get("/force-reseed", async (req, res) => {
  try {
    const rnd = (lo, hi) => parseFloat((lo + Math.random() * (hi - lo)).toFixed(2));
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];

    const cropDefs = [
      { crop: "Rice", temp: [22, 32], hum: [75, 95], rain: [160, 280], ph: [5.5, 7.0], moist: [50, 80], N: [60, 120], P: [25, 55], K: [25, 55], soils: ["Clay", "Loamy"], seasons: ["Kharif"], regions: ["South", "East", "West"], n: 250 },
      { crop: "Wheat", temp: [8, 18], hum: [40, 65], rain: [50, 100], ph: [6.0, 7.5], moist: [30, 55], N: [80, 120], P: [30, 70], K: [35, 65], soils: ["Loamy", "Sandy"], seasons: ["Rabi"], regions: ["North", "Central"], n: 250 },
      { crop: "Corn", temp: [20, 30], hum: [55, 75], rain: [80, 160], ph: [5.5, 7.0], moist: [40, 65], N: [70, 110], P: [30, 65], K: [30, 60], soils: ["Loamy", "Clay"], seasons: ["Kharif", "Rabi"], regions: ["North", "Central", "West"], n: 200 },
      { crop: "Millet", temp: [25, 35], hum: [30, 55], rain: [25, 70], ph: [5.5, 7.5], moist: [15, 40], N: [15, 45], P: [10, 40], K: [10, 40], soils: ["Sandy", "Red", "Loamy"], seasons: ["Kharif", "Zaid"], regions: ["South", "West"], n: 200 },
      { crop: "Cotton", temp: [28, 40], hum: [50, 70], rain: [60, 120], ph: [6.0, 8.0], moist: [30, 55], N: [10, 30], P: [10, 30], K: [15, 35], soils: ["Black", "Red", "Sandy"], seasons: ["Kharif"], regions: ["South", "Central"], n: 200 },
      { crop: "Jute", temp: [27, 37], hum: [75, 95], rain: [140, 280], ph: [6.0, 7.5], moist: [60, 90], N: [60, 100], P: [30, 60], K: [30, 60], soils: ["Clay", "Loamy"], seasons: ["Kharif"], regions: ["East"], n: 200 },
      { crop: "Apple", temp: [2, 12], hum: [65, 90], rain: [100, 180], ph: [5.5, 6.8], moist: [45, 75], N: [40, 75], P: [25, 55], K: [30, 60], soils: ["Loamy", "Sandy"], seasons: ["Rabi"], regions: ["North"], n: 200 },
      { crop: "Banana", temp: [24, 34], hum: [75, 95], rain: [150, 280], ph: [5.5, 7.0], moist: [50, 85], N: [80, 120], P: [30, 60], K: [50, 90], soils: ["Sandy", "Loamy"], seasons: ["Kharif", "Zaid"], regions: ["South", "East"], n: 200 },
      { crop: "Grapes", temp: [22, 32], hum: [55, 80], rain: [60, 110], ph: [6.0, 7.5], moist: [30, 60], N: [20, 55], P: [15, 45], K: [30, 65], soils: ["Sandy", "Loamy"], seasons: ["Rabi"], regions: ["South", "West"], n: 200 },
      { crop: "Mango", temp: [26, 38], hum: [45, 80], rain: [80, 150], ph: [5.5, 7.5], moist: [35, 65], N: [15, 40], P: [10, 30], K: [15, 40], soils: ["Sandy", "Red", "Loamy"], seasons: ["Zaid", "Kharif"], regions: ["South", "Central"], n: 200 },
      { crop: "Papaya", temp: [24, 34], hum: [65, 90], rain: [100, 200], ph: [6.0, 7.5], moist: [45, 80], N: [40, 70], P: [20, 50], K: [20, 50], soils: ["Clay", "Loamy"], seasons: ["Kharif", "Zaid"], regions: ["South", "East"], n: 200 },
      { crop: "Coconut", temp: [24, 34], hum: [75, 95], rain: [150, 250], ph: [5.5, 7.0], moist: [55, 85], N: [15, 35], P: [10, 30], K: [50, 90], soils: ["Sandy", "Loamy"], seasons: ["Kharif", "Zaid"], regions: ["South"], n: 200 },
      { crop: "Coffee", temp: [18, 26], hum: [70, 95], rain: [120, 240], ph: [5.5, 6.5], moist: [55, 85], N: [40, 75], P: [20, 50], K: [20, 60], soils: ["Clay", "Red"], seasons: ["Kharif", "Rabi"], regions: ["South"], n: 200 },
      { crop: "Sugarcane", temp: [23, 38], hum: [60, 90], rain: [150, 300], ph: [6.0, 7.5], moist: [50, 85], N: [70, 120], P: [30, 60], K: [15, 55], soils: ["Clay", "Loamy", "Black"], seasons: ["Kharif", "Zaid"], regions: ["South", "Central"], n: 150 },
      { crop: "Chickpea", temp: [18, 27], hum: [35, 60], rain: [50, 90], ph: [6.0, 8.0], moist: [20, 45], N: [35, 70], P: [55, 90], K: [15, 45], soils: ["Sandy", "Loamy", "Black"], seasons: ["Rabi"], regions: ["North", "Central"], n: 150 },
      { crop: "Lentil", temp: [14, 22], hum: [45, 70], rain: [55, 100], ph: [6.0, 8.0], moist: [25, 50], N: [15, 45], P: [20, 55], K: [15, 40], soils: ["Sandy", "Loamy"], seasons: ["Rabi"], regions: ["North", "Central"], n: 150 },
      { crop: "Groundnut", temp: [25, 35], hum: [40, 65], rain: [60, 120], ph: [5.5, 7.0], moist: [25, 55], N: [15, 40], P: [25, 55], K: [20, 50], soils: ["Sandy", "Loamy", "Red"], seasons: ["Kharif", "Rabi"], regions: ["South", "Central"], n: 150 },
    ];

    await mongoose.connection.db.collection('crop_samples').deleteMany({});
    const docs = [];
    for (const def of cropDefs) {
      for (let i = 0; i < def.n; i++) {
        docs.push({
          crop: def.crop,
          temperature: rnd(...def.temp),
          humidity: rnd(...def.hum),
          rainfall: rnd(...def.rain),
          soil_ph: rnd(...def.ph),
          soilMoisture: rnd(...def.moist),
          nitrogen: rnd(...def.N),
          phosphorus: rnd(...def.P),
          potassium: rnd(...def.K),
          soilType: pick(def.soils),
          season: pick(def.seasons),
          region: pick(def.regions),
          createdAt: new Date(),
        });
      }
    }
    await mongoose.connection.db.collection('crop_samples').insertMany(docs);
    res.json({ message: `Force-seeded ${docs.length} samples across ${cropDefs.length} crops. Now call /trigger-retrain`, total: docs.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Trigger Retrain Route
router.get("/trigger-retrain", async (req, res) => {
  try {
    const scriptPath = path.join(__dirname, '../../ml/train_model.py');
    const command = `"${pythonExec}" "${scriptPath}"`;
    console.log("Triggering retrain:", command);

    exec(command, { maxBuffer: 1024 * 2000 }, (error, stdout, stderr) => {
      if (error) {
        console.error("Retrain Error:", error);
        return res.status(500).json({ error: error.message, stderr });
      }
      console.log("Retrain Output:", stdout);
      res.json({ message: "Retraining complete", stdout });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/predict-crop", async (req, res) => {
  try {
    console.log('PREDICT-CROP REQ.BODY >>>', JSON.stringify(req.body));
    const {
      temperature,
      humidity,
      rainfall,
      soil_ph,
      soilMoisture,
      nitrogen,
      phosphorus,
      potassium,
      soilType,
      region,
      season
    } = req.body;

    if (temperature === undefined || humidity === undefined || rainfall === undefined) {
      return res.status(400).json({ error: "temperature, humidity and rainfall are required" });
    }

    const scriptPath = path.join(__dirname, "../../ml/predict.py");

    const args = [
      Number(temperature),
      Number(humidity),
      Number(rainfall),
      soil_ph ?? 'None',
      soilMoisture ?? 'None',
      nitrogen ?? 'None',
      phosphorus ?? 'None',
      potassium ?? 'None',
      soilType ? String(soilType) : '',
      region ? String(region) : '',
      season ? String(season) : ''
    ];

    const command = `"${pythonExec}" "${scriptPath}" ${args.map(a => JSON.stringify(a)).join(' ')}`;

    exec(command, async (error, stdout, stderr) => {
      console.log('PREDICT-CROP STDOUT >>>', JSON.stringify(stdout));
      console.log('PREDICT-CROP STDERR >>>', JSON.stringify(stderr));
      if (error) {
        console.error('predict-crop error', error, stderr);
        return res.status(500).json({ error: error.message, stderr });
      }

      let parsed = {};
      const output = stdout ? stdout.trim() : '';
      try {
        parsed = JSON.parse(output);
      } catch (e) {
        // try to extract JSON substring (handle warnings or extra logs before JSON)
        const m = output.match(/\{[\s\S]*\}/);
        if (m) {
          try { parsed = JSON.parse(m[0]); } catch (e2) { parsed.predictedCrop = output; }
        } else {
          parsed.predictedCrop = output;
        }
      }

      // if parsed.predictedCrop itself is an embedded JSON string, try to unwrap
      if (parsed && typeof parsed.predictedCrop === 'string') {
        const inner = parsed.predictedCrop.match(/\{[\s\S]*\}/);
        if (inner) {
          try {
            const innerObj = JSON.parse(inner[0]);
            if (innerObj && innerObj.predictedCrop) parsed.predictedCrop = innerObj.predictedCrop;
          } catch (e) { /* ignore */ }
        }
      }

      const finalCrop = parsed && parsed.predictedCrop ? String(parsed.predictedCrop) : String(parsed || '');

      // ✅ SAVE TO DB (PredictionHistory) — save cleaned value
      await PredictionHistory.create({
        type: "CROP",
        input: { temperature, humidity, rainfall, soil_ph, soilMoisture, nitrogen, phosphorus, potassium, soilType, region, season },
        result: finalCrop
      });

      res.json({ predictedCrop: finalCrop });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST → seed synthetic crop dataset into 'crop_samples' collection
router.post('/seed-crop', async (req, res) => {
  try {
    const scriptPath = path.join(__dirname, '../../ml/seed_crop_sample_data.py');
    const command = `"${pythonExec}" "${scriptPath}"`;

    exec(command, { maxBuffer: 1024 * 2000 }, async (error, stdout, stderr) => {
      if (error) {
        return res.status(500).json({ error: error.message, stderr });
      }
      res.json({ output: stdout });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// POST → trigger training script (creates test set + metrics)
router.post('/train', async (req, res) => {
  try {
    const scriptPath = path.join(__dirname, '../../ml/train_model.py');
    const command = `"${pythonExec}" "${scriptPath}"`;

    exec(command, { maxBuffer: 1024 * 2000 }, async (error, stdout, stderr) => {
      if (error) {
        return res.status(500).json({ error: error.message, stderr });
      }

      // return stdout and latest saved metrics (if available)
      const db = mongoose.connection.db;
      const metrics = await db.collection('ml_metrics').findOne({}, { sort: { createdAt: -1 } });

      res.json({ output: stdout, metrics });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST → train rainfall model
router.post('/train-rainfall', async (req, res) => {
  try {
    const scriptPath = path.join(__dirname, '../../ml/train_rainfall.py');
    const command = `"${pythonExec}" "${scriptPath}"`;

    exec(command, { maxBuffer: 1024 * 2000 }, async (error, stdout, stderr) => {
      if (error) {
        return res.status(500).json({ error: error.message, stderr });
      }

      const db = mongoose.connection.db;
      const metrics = await db.collection('rainfall_metrics').findOne({}, { sort: { createdAt: -1 } });
      res.json({ output: stdout, metrics });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// POST → train soil-health model
router.post('/train-soil', async (req, res) => {
  try {
    const scriptPath = path.join(__dirname, '../../ml/train_soil.py');
    const command = `"${pythonExec}" "${scriptPath}"`;

    exec(command, { maxBuffer: 1024 * 2000 }, async (error, stdout, stderr) => {
      if (error) {
        return res.status(500).json({ error: error.message, stderr });
      }

      const db = mongoose.connection.db;
      const metrics = await db.collection('soil_metrics').findOne({}, { sort: { createdAt: -1 } });
      res.json({ output: stdout, metrics });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// POST → predict soil health (stores prediction in DB)
router.post('/predict-soil', async (req, res) => {
  try {
    const { nitrogen, phosphorus, potassium, ph } = req.body;
    if ([nitrogen, phosphorus, potassium, ph].some(v => v === undefined || v === null)) {
      return res.status(400).json({ error: 'nitrogen, phosphorus, potassium and ph are required' });
    }

    const scriptPath = path.join(__dirname, '../../ml/predict_soil.py');
    const command = `"${pythonExec}" "${scriptPath}" ${Number(nitrogen)} ${Number(phosphorus)} ${Number(potassium)} ${Number(ph)}`;

    // helper to run a shell command and return a promise
    const runCmd = (cmd, opts = {}) => new Promise((resolve) => {
      exec(cmd, { maxBuffer: 1024 * 2000, ...opts }, (error, stdout, stderr) => resolve({ error, stdout, stderr }));
    });

    // quick model-file existence check (avoid launching python just to learn model is missing)
    const modelCandidates = [
      path.join(__dirname, '../../ml/soil_model.pkl'),
      path.join(__dirname, '../../soil_model.pkl'),
      path.join(__dirname, '../..', 'soil_model.pkl')
    ];
    const modelExists = modelCandidates.some(p => fs.existsSync(p));

    // if no model, perform server-side training (single-flight) before predicting
    if (!modelExists) {
      if (!soilTrainingPromise) {
        const trainScript = path.join(__dirname, '../../ml/train_soil.py');
        const trainCmd = `"${pythonExec}" "${trainScript}"`;
        soilTrainingPromise = (async () => {
          const result = await runCmd(trainCmd);
          // clear the promise when done so future requests can trigger retrain if needed
          soilTrainingPromise = null;
          return result;
        })();
      }

      const trainResult = await soilTrainingPromise;
      if (trainResult.error) {
        return res.status(500).json({ error: 'Server-side training failed', stderr: trainResult.stderr || trainResult.error.message });
      }
      // proceed — model should now exist
    }

    // run prediction (will succeed now because model exists or training just finished)
    const { error, stdout, stderr } = await runCmd(command);

    // handle unexpected script error
    if (error) {
      try {
        const parsedStdout = stdout ? JSON.parse(stdout.trim()) : null;
        if (parsedStdout && parsedStdout.error && String(parsedStdout.error).includes('model-not-found')) {
          return res.status(500).json({ error: 'Soil model still missing after server-side training. Check backend logs.' });
        }
      } catch (e) {
        // ignore
      }

      return res.status(500).json({ error: error.message, stderr, stdout: stdout ? stdout.trim() : '' });
    }

    let parsed = {};
    try {
      parsed = JSON.parse(stdout.trim());
    } catch (e) {
      // fallback
      parsed.predicted_label = stdout.trim();
      parsed.probability = null;
    }

    const doc = await SoilPrediction.create({
      nitrogen: Number(nitrogen),
      phosphorus: Number(phosphorus),
      potassium: Number(potassium),
      ph: Number(ph),
      predictedLabel: parsed.predicted_label || String(parsed.predicted_label),
      probability: parsed.probability || null
    });

    // suggestion logic (simple rules)
    const suggestionMap = {
      'Good': 'Soil is healthy — maintain current practices',
      'Fair': 'Consider targeted fertilization and pH adjustment',
      'Poor': 'Significant amendments recommended: add organic matter and balanced NPK'
    };

    const db = mongoose.connection.db;
    const metrics = await db.collection('soil_metrics').findOne({}, { sort: { createdAt: -1 } });

    res.json({
      prediction: { predictedLabel: doc.predictedLabel, probability: doc.probability },
      suggestion: suggestionMap[doc.predictedLabel] || 'Refer to soil expert',
      saved: true,
      modelMetrics: metrics || null,
      autoTrained: !modelExists
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// GET → recent training metrics
router.get('/metrics', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const metrics = await db.collection('ml_metrics').find().sort({ createdAt: -1 }).limit(10).toArray();
    res.json(metrics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// GET → saved test-set rows
router.get('/test-set', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const rows = await db.collection('ml_test_set').find().sort({ createdAt: -1 }).limit(100).toArray();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET → soil prediction history (paginated)
// supports ?page=1&limit=20
router.get('/soil-history', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.max(1, Math.min(500, parseInt(req.query.limit || '20', 10)));
    const skip = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      SoilPrediction.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      SoilPrediction.countDocuments()
    ]);

    res.json({ rows, total, page, limit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET → soil prediction history CSV export
router.get('/soil-history/export', async (req, res) => {
  try {
    const rows = await SoilPrediction.find().sort({ createdAt: -1 }).lean();

    // CSV header
    const header = ['createdAt', 'nitrogen', 'phosphorus', 'potassium', 'ph', 'predictedLabel', 'probability'];
    const csvLines = [header.join(',')];

    for (const r of rows) {
      const line = [
        new Date(r.createdAt).toISOString(),
        r.nitrogen ?? '',
        r.phosphorus ?? '',
        r.potassium ?? '',
        r.ph ?? '',
        `"${(r.predictedLabel || '').replace(/"/g, '""')}"`,
        r.probability ?? ''
      ].join(',');
      csvLines.push(line);
    }

    const csv = csvLines.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="soil_predictions.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
