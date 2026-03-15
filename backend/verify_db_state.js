const mongoose = require('mongoose');
const User = require('./models/User');
const WeatherData = require('./models/WeatherData');
require('dotenv').config();

async function verify() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        const users = await User.find();
        console.log("\n--- Users ---");
        users.forEach(u => console.log(`Email: ${u.email}, Location: ${u.location}, Name: ${u.name}`));

        const weatherCount = await WeatherData.countDocuments();
        console.log(`\nTotal WeatherData records: ${weatherCount}`);

        const cities = await WeatherData.distinct('city');
        console.log(`Distinct cities in records: ${cities.join(', ')}`);

        for (const city of cities) {
            const count = await WeatherData.countDocuments({ city });
            const latest = await WeatherData.findOne({ city }).sort({ createdAt: -1 });
            console.log(`City: ${city}, Records: ${count}, Latest: ${latest ? latest.createdAt : 'N/A'}`);
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

verify();
