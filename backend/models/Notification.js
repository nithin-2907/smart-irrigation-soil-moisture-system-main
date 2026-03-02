const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
    userId: { type: String, required: true }, // matches user email or _id string
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ["irrigate", "no-action", "caution"], default: "caution" },
    location: { type: String, default: "" },
    weatherSummary: { type: String, default: "" },
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Notification", notificationSchema);
