const express = require("express");
const router = express.Router();

const CropPrediction = require("../models/CropPrediction");
const History = require("../models/History");

// POST → crop prediction
router.post("/predict", async (req, res) => {
  try {
    const { soilType, rainfall, temperature } = req.body;

    // TEMP logic (ML model comes later)
    let recommendedCrop = "Rice";

    if (rainfall < 50) recommendedCrop = "Millet";
    else if (temperature > 30) recommendedCrop = "Cotton";
    else if (soilType === "Sandy") recommendedCrop = "Groundnut";

    // ✅ SAVE prediction with required field
    await CropPrediction.create({
      soilType,
      rainfall,
      temperature,
      recommendedCrop
    });

    // ✅ SAVE history
    await History.create({
      type: "CROP",
      input: { soilType, rainfall, temperature },
      result: recommendedCrop
    });

    res.json({
      crop: recommendedCrop
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
