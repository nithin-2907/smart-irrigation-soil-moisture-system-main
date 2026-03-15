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

const UserSchema = new mongoose.Schema({
    location: String
});
const User = mongoose.model("User", UserSchema);

const rand = (min, max) => +(Math.random() * (max - min) + min).toFixed(1);
const daysAgo = (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
};

(async () => {
    try {
        await mongoose.connect(ATLAS_URI);
        console.log("Connected to Atlas");

        const user = await User.findOne({ location: { $ne: "" } });
        if (!user) {
            console.log("No user with location found");
            process.exit(1);
        }

        const city = user.location;
        console.log(`Seeding data for city: ${city}`);

        // Generate 14 days of history
        const docs = [];
        for (let i = 14; i >= 1; i--) {
            for (let hour = 0; hour < 24; hour += 6) {
                const date = daysAgo(i);
                date.setHours(hour, 0, 0, 0);
                docs.push({
                    temperature: rand(22, 34),
                    humidity: rand(50, 85),
                    rainfall: rand(0, 5),
                    windSpeed: rand(5, 15),
                    pressure: rand(1008, 1015),
                    soilMoisture: rand(25, 45), // matches the "High Stress" state user is seeing
                    city: city,
                    createdAt: date,
                    updatedAt: date
                });
            }
        }

        await WeatherData.insertMany(docs);
        console.log(`Successfully seeded ${docs.length} records for ${city}`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
