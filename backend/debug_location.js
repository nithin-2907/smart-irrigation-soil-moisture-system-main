const mongoose = require('mongoose');
const ATLAS_URI = "mongodb+srv://nithinrn04_db_user:Darkdevil%40077@cluster0.yejjqy9.mongodb.net/smart_irrigation?retryWrites=true&w=majority&appName=Cluster0";

const UserSchema = new mongoose.Schema({
    location: String,
    email: String
});
const User = mongoose.model("User", UserSchema);

const WeatherSchema = new mongoose.Schema({
    city: String,
}, { timestamps: true });
const WeatherData = mongoose.model("WeatherData", WeatherSchema);

async function check() {
    try {
        await mongoose.connect(ATLAS_URI);
        const users = await User.find({ location: { $ne: "" } });
        console.log("USERS_WITH_LOCATION_START");
        users.forEach(u => console.log(`'${u.email}' | '${u.location}'`));
        console.log("USERS_WITH_LOCATION_END");

        const cities = await WeatherData.distinct('city');
        console.log("CITIES_IN_DB_START");
        cities.forEach(c => console.log(`'${c}'`));
        console.log("CITIES_IN_DB_END");

        process.exit(0);
    } catch (err) {
        process.exit(1);
    }
}
check();
