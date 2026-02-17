const express = require("express");
const router = express.Router();

const PredictionHistory = require("../models/PredictionHistory");

router.get("/", async (req, res) => {
  try {
    const history = await PredictionHistory.find().sort({ createdAt: -1 });
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
