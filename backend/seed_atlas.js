/**
 * seed_atlas.js
 * Run once to populate Atlas with 14 days of sample data.
 * Usage: node seed_atlas.js
 */

const mongoose = require("mongoose");

const ATLAS_URI =
    "mongodb+srv://nithinrn04_db_user:Darkdevil%40077@cluster0.yejjqy9.mongodb.net/smart_irrigation?retryWrites=true&w=majority&appName=Cluster0";

// ── Schemas ─────────────────────────────────────────────────────────────────
const WeatherData = mongoose.model(
    "WeatherData",
    new mongoose.Schema(
        {
            temperature: Number,
            humidity: Number,
            rainfall: Number,
            windSpeed: Number,
            pressure: Number,
            soilMoisture: Number,
            city: String,
        },
        { timestamps: true }
    )
);

const History = mongoose.model(
    "History",
    new mongoose.Schema(
        {
            type: { type: String, required: true },
            input: { type: Object, required: true },
            result: { type: String, required: true },
        },
        { timestamps: true }
    )
);

// ── Helpers ──────────────────────────────────────────────────────────────────
const rand = (min, max) => +(Math.random() * (max - min) + min).toFixed(1);
const daysAgo = (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
};

// ── Generate 14 days of weather + soil data ──────────────────────────────────
const weatherDocs = [];
for (let i = 13; i >= 0; i--) {
    weatherDocs.push({
        temperature: rand(22, 34),
        humidity: rand(45, 85),
        rainfall: rand(0, 12),
        windSpeed: rand(5, 25),
        pressure: rand(1008, 1020),
        soilMoisture: rand(30, 70),
        city: "Hyderabad",
        createdAt: daysAgo(i),
        updatedAt: daysAgo(i),
    });
}

// ── Sample crop predictions ──────────────────────────────────────────────────
const crops = ["Rice", "Wheat", "Maize", "Cotton", "Sugarcane", "Groundnut"];
const historyDocs = [];
for (let i = 6; i >= 0; i--) {
    const temp = rand(22, 32);
    const hum = rand(50, 80);
    const rain = rand(50, 200);
    historyDocs.push({
        type: "Crop Prediction",
        input: { temperature: temp, humidity: hum, rainfall: rain },
        result: crops[Math.floor(Math.random() * crops.length)],
        createdAt: daysAgo(i),
        updatedAt: daysAgo(i),
    });
}

// ── Seed ─────────────────────────────────────────────────────────────────────
(async () => {
    try {
        console.log("🔗 Connecting to Atlas...");
        await mongoose.connect(ATLAS_URI);
        console.log("✅ Connected!\n");

        // Clear old data
        await WeatherData.deleteMany({});
        await History.deleteMany({});
        console.log("🗑️  Cleared existing data");

        // Insert
        await WeatherData.insertMany(weatherDocs);
        console.log(`✅ Inserted ${weatherDocs.length} weather/soil records`);

        await History.insertMany(historyDocs);
        console.log(`✅ Inserted ${historyDocs.length} prediction history records`);

        console.log("\n🎉 Seeding complete! Your dashboard should now show data.");
    } catch (err) {
        console.error("❌ Error:", err.message);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
})();
