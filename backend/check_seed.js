const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/smart_irrigation', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(async () => {
        console.log('MongoDB Connected');

        try {
            const count = await mongoose.connection.db.collection('crop_samples').countDocuments();
            console.log(`CROP_SAMPLES_COUNT: ${count}`);

            // Check if we have any data
            if (count > 0) {
                const sample = await mongoose.connection.db.collection('crop_samples').findOne();
                console.log('SAMPLE_DOC:', JSON.stringify(sample, null, 2));
            }

        } catch (err) {
            console.error('Error:', err);
        } finally {
            mongoose.connection.close();
        }
    })
    .catch(err => console.error('Connection Error:', err));
