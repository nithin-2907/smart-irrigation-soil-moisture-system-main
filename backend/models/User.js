const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    supabaseId: { type: String, default: "" },    // Supabase Auth UID
    password: { type: String },
    role: { type: String, default: "farmer" },
    phone: { type: String, default: "" },
    location: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
});


module.exports = mongoose.model("User", userSchema);
