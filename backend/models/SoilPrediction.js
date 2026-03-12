const mongoose = require('mongoose');

const soilPredictionSchema = new mongoose.Schema({
  nitrogen: Number,
  phosphorus: Number,
  potassium: Number,
  ph: Number,
  predictedLabel: String,
  probability: Number,
  userEmail: String
}, { timestamps: true });

module.exports = mongoose.model('SoilPrediction', soilPredictionSchema);
