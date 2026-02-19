const express = require("express");
const router = express.Router();

const History = require("../models/History");
const PredictionHistory = require("../models/PredictionHistory");

router.get("/", async (req, res) => {
  try {
    // optimize: run in parallel
    const [historyDocs, predictionDocs] = await Promise.all([
      History.find().sort({ createdAt: -1 }).limit(50).lean(),
      PredictionHistory.find().sort({ createdAt: -1 }).limit(50).lean()
    ]);

    // Merge and sort by date descending
    const allHistory = [...historyDocs, ...predictionDocs].sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.json(allHistory);
  } catch (err) {
    console.error("History Error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
