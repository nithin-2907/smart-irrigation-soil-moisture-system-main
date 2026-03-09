/**
 * irrigationScheduler.js
 * Runs every 6 hours, checks weather for each farmer's location,
 * decides if irrigation is needed, sends SMS + saves in-app notification.
 */
const cron = require("node-cron");
const axios = require("axios");
const User = require("../models/User");
const Notification = require("../models/Notification");
const WeatherData = require("../models/WeatherData");
const { sendSMS } = require("./smsSender");

const OWM_KEY = process.env.OPENWEATHER_API_KEY;

// ── Irrigation Decision Logic ──────────────────────────────────────────────────
function makeDecision(weather) {
    const temp = weather.main?.temp ?? 25;      // °C
    const humidity = weather.main?.humidity ?? 60;      // %
    const rain1h = weather.rain?.["1h"] ?? 0;       // mm
    const rain3h = weather.rain?.["3h"] ?? 0;
    const desc = weather.weather?.[0]?.description ?? "";
    const isRaining = rain1h > 1 || rain3h > 3 || desc.includes("rain");

    if (isRaining || humidity > 80) {
        return {
            type: "no-action",
            title: "✅ No Irrigation Needed",
            message: `Rain detected or humidity is high (${humidity}%). No irrigation required today.`,
        };
    }

    if (temp > 32 && humidity < 45) {
        return {
            type: "irrigate",
            title: "🔴 Irrigate Now!",
            message: `Hot & dry conditions — Temp: ${temp.toFixed(1)}°C, Humidity: ${humidity}%. Your crops need water urgently.`,
        };
    }

    if (temp > 26 || humidity < 60) {
        return {
            type: "caution",
            title: "🟡 Monitor Your Crops",
            message: `Warm weather ahead — Temp: ${temp.toFixed(1)}°C, Humidity: ${humidity}%. Consider irrigating if soil feels dry.`,
        };
    }

    return {
        type: "no-action",
        title: "✅ Conditions Are Good",
        message: `Weather is favourable — Temp: ${temp.toFixed(1)}°C, Humidity: ${humidity}%. No immediate irrigation needed.`,
    };
}

// ── Fetch weather for a city ───────────────────────────────────────────────────
async function getWeather(location) {
    if (!OWM_KEY) throw new Error("OPENWEATHER_API_KEY not set");
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${OWM_KEY}&units=metric`;
    const res = await axios.get(url, { timeout: 8000 });
    return res.data;
}

// ── Save weather to WeatherData collection (for dashboard charts) ─────────────
async function saveWeatherData(weather, city) {
    try {
        const temp = weather.main?.temp ?? 0;
        const hum = weather.main?.humidity ?? 0;
        const rain = weather.rain?.["1h"] ?? 0;
        const wind = weather.wind?.speed ?? 0;
        const press = weather.main?.pressure ?? 0;

        // Same soil moisture formula as weatherRoutes.js
        let soilMoisture = (hum * 0.5) + (rain * 0.3) - (temp * 0.1) - (wind * 0.1);
        soilMoisture = Math.max(0, Math.min(100, soilMoisture));

        await WeatherData.create({
            temperature: temp,
            humidity: hum,
            rainfall: rain,
            windSpeed: wind,
            pressure: press,
            city: city,
            soilMoisture: parseFloat(soilMoisture.toFixed(1)),
        });
    } catch (err) {
        console.error(`⚠️  Failed to save WeatherData for ${city}:`, err.message);
    }
}

// ── Process one farmer ────────────────────────────────────────────────────────
async function processUser(user) {
    if (!user.location) return;

    let weather;
    try {
        weather = await getWeather(user.location);
    } catch (err) {
        console.error(`⚠️  Weather fetch failed for ${user.email} (${user.location}):`, err.message);
        return;
    }

    // Save weather data for dashboard charts
    await saveWeatherData(weather, user.location);

    const decision = makeDecision(weather);
    const weatherSummary = `Temp: ${weather.main?.temp?.toFixed(1)}°C, Humidity: ${weather.main?.humidity}%, Wind: ${weather.wind?.speed} m/s`;

    // Save in-app notification
    await Notification.create({
        userId: user.email,
        title: decision.title,
        message: decision.message,
        type: decision.type,
        location: user.location,
        weatherSummary,
    });

    console.log(`📬 Notification saved for ${user.email}: ${decision.title}`);

    // Send SMS if phone is set
    if (user.phone) {
        const smsBody =
            `🌾 Smart Irrigation Alert\n` +
            `${decision.title}\n${decision.message}\n` +
            `📍 ${user.location} | ${weatherSummary}`;
        await sendSMS(user.phone, smsBody);
    }
}

// ── Main scheduler run ────────────────────────────────────────────────────────
async function runScheduler() {
    console.log("⏱️  [Irrigation Scheduler] Running check...");
    try {
        const farmers = await User.find({ location: { $ne: "" } });
        console.log(`👥 Found ${farmers.length} users with a location set`);
        for (const user of farmers) {
            await processUser(user);
        }
        console.log("✅ [Irrigation Scheduler] Done.");
    } catch (err) {
        console.error("❌ [Irrigation Scheduler] Error:", err.message);
    }
}

// ── Start cron ────────────────────────────────────────────────────────────────
function startScheduler() {
    console.log("🕐 Irrigation Scheduler started — runs every 6 hours");

    // Run every 6 hours: 0 */6 * * *
    cron.schedule("0 */6 * * *", runScheduler);

    // Also run once 30s after server start (so first alert fires quickly)
    setTimeout(runScheduler, 30_000);
}

module.exports = { startScheduler, runScheduler };
