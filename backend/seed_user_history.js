const mongoose = require('mongoose');
const ATLAS_URI = "mongodb+srv://nithinrn04_db_user:Darkdevil%40077@cluster0.yejjqy9.mongodb.net/smart_irrigation?retryWrites=true&w=majority&appName=Cluster0";

const WeatherSchema = new mongoose.Schema({
    temperature: Number,
    humidity: Number,
    rainfall: Number,
    windSpeed: Number,
    pressure: Number,
    soilMoisture: Number,
    city: String,
}, { timestamps: true });

const WeatherData = mongoose.model("WeatherData", WeatherSchema);

const rand = (min, max) => +(Math.random() * (max - min) + min).toFixed(1);
const daysAgo = (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
};

async function seed() {
    try {
        console.log("🔗 Connecting to Atlas...");
        await mongoose.connect(ATLAS_URI);

        const city = "Coimbatore";
        console.log(`📍 Re-Seeding realistic data (NO RAIN) for: ${city}`);

        // 1. Clear OLD data for this city to ensure we use the new dry data
        await WeatherData.deleteMany({ city: { $regex: new RegExp(`^${city}$`, 'i') } });
        console.log(`🗑️ Cleared previous data for ${city}`);

        // 2. Generate 14 days of data
        const weatherDocs = [];
        for (let i = 14; i >= 0; i--) {
            for (let hour = 0; hour < 24; hour += 6) {
                const date = daysAgo(i);
                date.setHours(hour, 0, 0, 0);

                // Coimbatore dry season profile
                const temp = rand(26, 33);
                const hum = rand(40, 65);
                const rain = 0; // User confirmed it hasn't rained

                // Low moisture due to no rain and heat
                let soilMoisture = (hum * 0.3) - (temp * 0.15) + 15;
                soilMoisture = Math.max(12, Math.min(35, soilMoisture));

                weatherDocs.push({
                    temperature: temp,
                    humidity: hum,
                    rainfall: rain,
                    windSpeed: rand(10, 20),
                    pressure: rand(1007, 1012),
                    soilMoisture: parseFloat(soilMoisture.toFixed(1)),
                    city: city,
                    createdAt: date
                });
            }
        }

        console.log(`⌛ Inserting ${weatherDocs.length} dry-weather records...`);
        await WeatherData.insertMany(weatherDocs);

        console.log("✅ Seeding complete! Please hard-refresh your dashboard.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Error:", err);
        process.exit(1);
    }
}

seed();
