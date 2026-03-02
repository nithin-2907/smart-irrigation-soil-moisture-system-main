const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");

// GET /api/notifications?userId=EMAIL  — last 30 for this user
router.get("/", async (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "userId required" });
    try {
        const notes = await Notification.find({ userId })
            .sort({ createdAt: -1 })
            .limit(30)
            .lean();
        res.json(notes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/notifications/unread-count?userId=EMAIL
router.get("/unread-count", async (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.json({ count: 0 });
    try {
        const count = await Notification.countDocuments({ userId, isRead: false });
        res.json({ count });
    } catch (err) {
        res.json({ count: 0 });
    }
});

// PATCH /api/notifications/:id/read  — mark one as read
router.patch("/:id/read", async (req, res) => {
    try {
        await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/notifications/read-all?userId=EMAIL  — mark all read
router.patch("/read-all", async (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "userId required" });
    try {
        await Notification.updateMany({ userId, isRead: false }, { isRead: true });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
