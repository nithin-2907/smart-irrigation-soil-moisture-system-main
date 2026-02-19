const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

mongoose.connect('mongodb://127.0.0.1:27017/smart_irrigation', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(async () => {
        try {
            const count = await mongoose.connection.db.collection('crop_samples').countDocuments();
            const filePath = path.join(__dirname, 'db_count.txt');
            fs.writeFileSync(filePath, `COUNT:${count}`);
            console.log(`Written count ${count} to ${filePath}`);
        } catch (err) {
            console.error('Error:', err);
            fs.writeFileSync(path.join(__dirname, 'db_count.txt'), `ERROR:${err.message}`);
        } finally {
            mongoose.connection.close();
        }
    })
    .catch(err => {
        fs.writeFileSync(path.join(__dirname, 'db_count.txt'), `CONN_ERROR:${err.message}`);
        console.error(err);
    });
