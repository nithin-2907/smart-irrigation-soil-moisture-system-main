const express = require("express");
const router = express.Router();
const { exec } = require("child_process");
const path = require("path");
const mongoose = require("mongoose");
const fs = require('fs');
const pythonExec = (function() {
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
