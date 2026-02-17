const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const mongoose = require('mongoose');

// prefer project virtualenv if present, otherwise fall back to system `python`
const pythonExec = (function() {
  const venvPython = path.join(__dirname, '..', '..', '.venv', 'Scripts', 'python.exe');
  return fs.existsSync(venvPython) ? venvPython : 'python';
})();

const YieldPrediction = require('../models/YieldPrediction');

// POST → train yield model
router.post('/train', async (req, res) => {
  try {
    const scriptPath = path.join(__dirname, '../../ml/train_yield.py');
    const command = `"${pythonExec}" "${scriptPath}"`;

    exec(command, { maxBuffer: 1024 * 2000 }, async (error, stdout, stderr) => {
      if (error) {
        return res.status(500).json({ error: error.message, stderr });
      }

      const db = mongoose.connection.db;
      const metrics = await db.collection('yield_metrics').findOne({}, { sort: { createdAt: -1 } });
      res.json({ output: stdout, metrics });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST → predict yield (saves prediction to DB)
router.post('/predict', async (req, res) => {
  try {
    const { area, rainfall, temperature, crop, fertilizer } = req.body;
    if ([area, rainfall, temperature, crop].some(v => v === undefined || v === null || String(v) === '')) {
      return res.status(400).json({ error: 'area, rainfall, temperature and crop are required' });
    }

    const scriptPath = path.join(__dirname, '../../ml/predict_yield.py');
    // quote crop arg
    const cropArg = String(crop).replace(/"/g, '\\"');
    const cmd = `"${pythonExec}" "${scriptPath}" ${Number(area)} ${Number(rainfall)} ${Number(temperature)} "${cropArg}" ${Number(fertilizer || 0)}`;

    exec(cmd, { maxBuffer: 1024 * 2000 }, async (error, stdout, stderr) => {
      if (error) {
        try {
          const parsedStdout = stdout ? JSON.parse(stdout.trim()) : null;
          if (parsedStdout && parsedStdout.error && String(parsedStdout.error).includes('model-not-found')) {
            return res.status(400).json({ error: 'Yield model not trained. Run POST /api/yield/train or call Analyze to auto-train (if enabled).' });
          }
        } catch (e) {
          // ignore parse errors
        }
        return res.status(500).json({ error: error.message, stderr, stdout: stdout ? stdout.trim() : '' });
      }

      let parsed = {};
      try {
        parsed = JSON.parse(stdout.trim());
      } catch (e) {
        return res.status(500).json({ error: 'Unexpected predictor output', raw: stdout.trim() });
      }

      const predicted = parseFloat(parsed.predicted_yield_per_ha || parsed.predicted_yield || 0);

      const doc = await YieldPrediction.create({
        crop: String(crop),
        area: Number(area),
        rainfall: Number(rainfall),
        temperature: Number(temperature),
        fertilizer: Number(fertilizer || 0),
        predictedYield: predicted
      });

      const db = mongoose.connection.db;
      const metrics = await db.collection('yield_metrics').findOne({}, { sort: { createdAt: -1 } });

      res.json({ prediction: { predictedYield: predicted }, saved: true, modelMetrics: metrics || null });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET → yield prediction history (paginated)
router.get('/history', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.max(1, Math.min(500, parseInt(req.query.limit || '20', 10)));
    const skip = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      YieldPrediction.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      YieldPrediction.countDocuments()
    ]);

    res.json({ rows, total, page, limit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
