/* eslint-disable no-undef */
const mongoose = require("mongoose");

const predictionHistorySchema = new mongoose.Schema({
  type: {
    type: String, // "crop" or "yield"
    required: true,
  },

  input: {
    type: Object,
    required: true,
  },

  result: {
    type: String,
    required: true,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model(
  "PredictionHistory",
  predictionHistorySchema
);
