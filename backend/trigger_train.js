const fetch = require('node-fetch') || global.fetch;

async function run() {
    console.log('Seeding crop dataset...');
    const res1 = await fetch('https://smart-irrigation-soil-moisture-system.onrender.com/api/ml/seed-data');
    console.log('Seed response:', await res1.text());

    console.log('Training model...');
    const res2 = await fetch('https://smart-irrigation-soil-moisture-system.onrender.com/api/ml/train', { method: 'POST' });
    console.log('Train response:', await res2.text());
}
run().catch(console.error);
