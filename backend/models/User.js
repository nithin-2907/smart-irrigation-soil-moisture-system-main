const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    role: { type: String, default: "farmer" },
    phone: { type: String, default: "" },      // e.g. +919876543210
    location: { type: String, default: "" },      // city name for weather lookup
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", userSchema);
