const mongoose = require("mongoose");

const yieldSchema = new mongoose.Schema(
  {
    crop: String,
    area: Number,
    rainfall: Number,
    temperature: Number,
    fertilizer: Number,
    predictedYield: Number,
    userEmail: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("YieldPrediction", yieldSchema);
