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

async function check() {
    try {
        await mongoose.connect(ATLAS_URI);
        const latest = await WeatherData.find().sort({ createdAt: -1 }).limit(5);
        console.log("LATEST_RECORDS_START");
        latest.forEach(d => console.log(`${d.city} | ${d.createdAt} | Moisture: ${d.soilMoisture}%`));
        console.log("LATEST_RECORDS_END");

        const cities = await WeatherData.distinct('city');
        console.log("CITIES: " + cities.join(', '));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
