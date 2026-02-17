const mongoose = require("mongoose");

const historySchema = new mongoose.Schema(
  {
    type: {
      type: String,
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
  },
  {
    timestamps: true, // ✅ THIS FIXES DATE
  }
);

module.exports = mongoose.model("History", historySchema);
