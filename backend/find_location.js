const mongoose = require('mongoose');
const ATLAS_URI = "mongodb+srv://nithinrn04_db_user:Darkdevil%40077@cluster0.yejjqy9.mongodb.net/smart_irrigation?retryWrites=true&w=majority&appName=Cluster0";

const UserSchema = new mongoose.Schema({
    name: String,
    email: String,
    location: String
});
const User = mongoose.model("User", UserSchema);

async function check() {
    try {
        await mongoose.connect(ATLAS_URI);
        const user = await User.findOne({ location: { $ne: "" } }).sort({ createdAt: -1 });
        if (user) {
            console.log(`FOUND_USER_LOCATION:${user.location}`);
            console.log(`FOUND_USER_EMAIL:${user.email}`);
        } else {
            console.log("NO_USER_FOUND");
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
