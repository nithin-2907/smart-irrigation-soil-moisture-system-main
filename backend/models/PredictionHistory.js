const mongoose = require("mongoose");

const predictionHistorySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true
    },
    input: {
      type: Object,
      required: true
    },
    result: {
      type: String,
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "PredictionHistory",
  predictionHistorySchema
);
