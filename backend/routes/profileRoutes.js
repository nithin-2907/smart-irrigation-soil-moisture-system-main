const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { runScheduler } = require("../services/irrigationScheduler");

// GET /api/profile?email=X  — fetch user profile
router.get("/", async (req, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: "email required" });
    try {
        let user = await User.findOne({ email }).lean();
        if (!user) {
            // First-time: create a shell record for this user
            user = await User.create({ name: email.split("@")[0], email, phone: "", location: "" });
        }
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/profile — update phone + location (upsert by email)
router.put("/", async (req, res) => {
    const { email, name, phone, location } = req.body;
    if (!email) return res.status(400).json({ error: "email required" });
    try {
        const user = await User.findOneAndUpdate(
            { email },
            { $set: { name, phone, location } },
            { upsert: true, new: true }
        );
        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/profile/trigger-alert — manually trigger scheduler (for testing)
router.post("/trigger-alert", async (req, res) => {
    try {
        res.json({ message: "Scheduler triggered — check server logs and notifications" });
        // Run async after response
        runScheduler().catch(console.error);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
