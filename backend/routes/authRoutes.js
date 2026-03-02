const express = require("express");
const router = express.Router();
const User = require("../models/User");

/**
 * POST /api/auth/sync
 * Called by the frontend after every successful Supabase login/signup.
 * Upserts a User document in MongoDB so all app features work with the user's email.
 */
router.post("/sync", async (req, res) => {
    const { supabaseId, email, name } = req.body;

    if (!email) return res.status(400).json({ error: "email is required" });

    try {
        const user = await User.findOneAndUpdate(
            { email },
            {
                $setOnInsert: {         // only set these on first creation
                    role: "farmer",
                    phone: "",
                    location: "",
                    createdAt: new Date(),
                },
                $set: {                 // always keep name + supabaseId up to date
                    name: name || email.split("@")[0],
                    supabaseId: supabaseId || "",
                },
            },
            { upsert: true, new: true }
        );

        res.json({
            _id: user._id,
            email: user.email,
            name: user.name,
            role: user.role,
            phone: user.phone,
            location: user.location,
        });
    } catch (err) {
        console.error("Auth sync error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
