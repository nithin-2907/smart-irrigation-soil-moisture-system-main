const { computeIrrigationSchedule } = require("./backend/services/waterBalance");
const dotenv = require("dotenv");
const path = require("path");
const mongoose = require("mongoose");

// Load env vars
dotenv.config({ path: path.join(__dirname, "backend/.env") });

// Mock WeatherData to avoid DB dependency
const WeatherData = require("./backend/models/WeatherData");
WeatherData.findOne = () => ({
    sort: () => Promise.resolve({ soilMoisture: 45 })
});

async function test() {
    console.log("Testing Irrigation Enhancement (Mocked DB)...");
    try {
        const result = await computeIrrigationSchedule({
            location: "Coimbatore",
            crop: "tomato",
            plantingDate: "2026-02-15",
            soilType: "sandy",
            fieldSize: 500 // 500 m2
        });

        console.log("\nResults for Tomato on Sandy soil (500m2):");
        console.log(`Suggested Type: ${result.suggestedIrrigationType}`);
        console.log(`Total Water Needed (mm): ${result.totalIrrigationNeeded}`);
        console.log(`Total Volume (Liters): ${result.totalVolumeLiters}`);
        
        console.log("\n7-Day Schedule Excerpt:");
        result.schedule.slice(0, 3).forEach(day => {
            console.log(`${day.date}: ${day.action} | Method: ${day.suggestedMethod}`);
        });

        const result2 = await computeIrrigationSchedule({
            location: "Coimbatore",
            crop: "rice",
            plantingDate: "2026-02-15",
            soilType: "clay",
            fieldSize: 1000 // 1000 m2
        });

        console.log("\nResults for Rice on Clay soil (1000m2):");
        console.log(`Suggested Type: ${result2.suggestedIrrigationType}`);
        console.log(`Total Water Needed (mm): ${result2.totalIrrigationNeeded}`);
        console.log(`Total Volume (Liters): ${result2.totalVolumeLiters}`);

    } catch (err) {
        console.error("Test failed:", err.message);
    } finally {
        process.exit(0);
    }
}

test();
