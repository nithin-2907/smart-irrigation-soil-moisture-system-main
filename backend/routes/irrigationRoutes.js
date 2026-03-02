const express = require("express");
const router = express.Router();
const { computeIrrigationSchedule, getGrowthStage } = require("../services/waterBalance");

/**
 * GET /api/irrigation/schedule
 * Query params: location, crop, plantingDate, soilType, rootDepth
 *
 * Returns a 7-day FAO-56 water balance irrigation schedule.
 */
router.get("/schedule", async (req, res) => {
    const { location, crop, plantingDate, soilType, rootDepth } = req.query;

    if (!location || !crop) {
        return res.status(400).json({ error: "location and crop are required" });
    }

    try {
        const result = await computeIrrigationSchedule({
            location,
            crop: crop.toLowerCase(),
            plantingDate: plantingDate || null,
            soilType: soilType || "loamy",
            rootDepth: rootDepth ? parseFloat(rootDepth) : 0.5,
        });
        res.json(result);
    } catch (err) {
        console.error("Irrigation schedule error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/irrigation/growth-stage
 * Query params: crop, plantingDate
 *
 * Returns the current growth stage for a crop planted on a given date.
 */
router.get("/growth-stage", (req, res) => {
    const { crop, plantingDate } = req.query;
    if (!crop) return res.status(400).json({ error: "crop is required" });

    const daysSincePlanting = plantingDate
        ? Math.floor((Date.now() - new Date(plantingDate)) / 86400000)
        : 30;

    const stage = getGrowthStage(crop.toLowerCase(), daysSincePlanting);
    res.json({ crop, daysSincePlanting, ...stage });
});

/**
 * GET /api/irrigation/crops
 * Returns the list of crops supported by the water balance engine.
 */
router.get("/crops", (_req, res) => {
    const crops = [
        "rice", "wheat", "maize", "cotton", "sugarcane", "potato", "tomato",
        "onion", "banana", "chickpea", "mungbean", "jute", "coffee",
    ];
    res.json(crops);
});

module.exports = router;
