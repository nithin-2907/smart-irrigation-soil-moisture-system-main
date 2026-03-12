const mongoose = require("mongoose");

const WeatherSchema = new mongoose.Schema({
  temperature: Number,
  humidity: Number,
  rainfall: Number,
  windSpeed: Number,
  pressure: Number,
  soilMoisture: Number,
  city: String,
}, { timestamps: true });

WeatherSchema.index({ city: 1, createdAt: -1 });
WeatherSchema.index({ createdAt: -1 });

module.exports = mongoose.model("WeatherData", WeatherSchema);