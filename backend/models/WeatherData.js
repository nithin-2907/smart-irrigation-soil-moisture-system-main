const mongoose = require("mongoose");

const WeatherSchema = new mongoose.Schema({
  temperature: Number,
  humidity: Number,
  rainfall: Number,
  soilMoisture: Number,
  city: String,
}, { timestamps: true }); // ⭐ DO NOT REMOVE

module.exports = mongoose.model("WeatherData", WeatherSchema);