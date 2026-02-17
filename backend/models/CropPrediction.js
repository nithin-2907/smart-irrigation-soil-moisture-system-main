const mongoose = require("mongoose");

const cropPredictionSchema = new mongoose.Schema(
  {
    soilType: {
      type: String,
      required: true,
    },
    rainfall: {
      type: Number,
      required: true,
    },
    temperature: {
      type: Number,
      required: true,
    },
    recommendedCrop: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CropPrediction", cropPredictionSchema);
