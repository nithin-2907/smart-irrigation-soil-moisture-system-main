const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

dotenv.config();

const app = express();

// Allow requests from Vercel frontend and local dev
const allowedOrigins = [
  process.env.FRONTEND_URL,       // e.g. https://your-app.vercel.app
  "http://localhost:5173",
  "http://localhost:3000",
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. Render health checks, curl)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));

app.use(express.json());

// routes
const cropRoutes = require("./routes/cropRoutes");
const weatherRoutes = require("./routes/weatherRoutes");
const mlRoutes = require("./routes/mlRoutes");
const historyRoutes = require("./routes/historyRoutes");
const translatorRoutes = require("./routes/translatorRoutes");
const yieldRoutes = require("./routes/yieldRoutes");
const chatRoutes = require("./routes/chatRoutes");
const marketRoutes = require("./routes/marketRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const diseaseRoutes = require("./routes/diseaseRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const profileRoutes = require("./routes/profileRoutes");
const authRoutes = require("./routes/authRoutes");
const irrigationRoutes = require("./routes/irrigationRoutes");


app.use("/api/history", historyRoutes);
app.use("/api/crop", cropRoutes);
app.use("/api/weather", weatherRoutes);
app.use("/api/ml", mlRoutes);
app.use("/api/yield", yieldRoutes);
app.use("/api/translator", translatorRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/market", marketRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/disease", diseaseRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/irrigation", irrigationRoutes);

const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/smart_irrigation";
mongoose
  .connect(mongoUri)
  .then(() => {
    console.log("✅ MongoDB connected");
    // Start irrigation scheduler after DB is ready
    const { startScheduler } = require("./services/irrigationScheduler");
    startScheduler();
  })
  .catch((err) => console.log("❌ MongoDB error:", err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  const googleEnabled = !!process.env.GOOGLE_TRANSLATE_API_KEY;
  console.log(`🔤 Google Translate: ${googleEnabled ? "ENABLED" : "not configured"}`);
  const twilioEnabled = !!process.env.TWILIO_ACCOUNT_SID;
  console.log(`📱 Twilio SMS: ${twilioEnabled ? "ENABLED" : "not configured — add TWILIO_* vars to .env"}`);

  // ── Auto-start Python prediction server (loads model once, fast for all subsequent requests) ───
  const venvPython = path.join(__dirname, '..', '.venv', 'Scripts', 'python.exe');
  const pythonBin = fs.existsSync(venvPython) ? venvPython : (process.platform === 'win32' ? 'python' : 'python3');
  const predictServerScript = path.join(__dirname, '..', 'ml', 'predict_server.py');

  if (fs.existsSync(predictServerScript)) {
    const pyServer = spawn(pythonBin, [predictServerScript], {
      detached: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    pyServer.stdout.on('data', d => console.log(`[PredictServer] ${d.toString().trim()}`));
    pyServer.stderr.on('data', d => console.error(`[PredictServer ERR] ${d.toString().trim()}`));
    pyServer.on('close', code => console.log(`[PredictServer] exited with code ${code}`));
    pyServer.on('error', err => console.error('[PredictServer] Failed to start:', err.message));
    process.on('exit', () => { try { pyServer.kill(); } catch (e) { } });
    process.on('SIGINT', () => { try { pyServer.kill(); } catch (e) { } process.exit(); });
    process.on('SIGTERM', () => { try { pyServer.kill(); } catch (e) { } process.exit(); });
    console.log('🐍 Python prediction server starting (crop predictions will be instant once ready)...');
  } else {
    console.warn('⚠️  predict_server.py not found — predictions use slower child process fallback');
  }
});

