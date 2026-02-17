const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// routes
const cropRoutes = require("./routes/cropRoutes");
const weatherRoutes = require("./routes/weatherRoutes");
const mlRoutes = require("./routes/mlRoutes");
const historyRoutes = require("./routes/historyRoutes");
const translatorRoutes = require("./routes/translatorRoutes");
const yieldRoutes = require("./routes/yieldRoutes");
const chatRoutes = require("./routes/chatRoutes");

app.use("/api/history", historyRoutes);
app.use("/api/crop", cropRoutes);
app.use("/api/weather", weatherRoutes);
app.use("/api/ml", mlRoutes);
app.use("/api/yield", yieldRoutes);
app.use("/api/translator", translatorRoutes);
app.use("/api/chat", chatRoutes);

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart_irrigation';
mongoose
  .connect(mongoUri)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.log("❌ MongoDB error:", err));

app.listen(5000, () => {
  console.log("🚀 Server running on http://localhost:5000");
  const googleEnabled = !!process.env.GOOGLE_TRANSLATE_API_KEY;
  console.log(`🔤 Google Translate: ${googleEnabled ? 'ENABLED' : 'not configured - set GOOGLE_TRANSLATE_API_KEY in backend/.env'}`);
});
