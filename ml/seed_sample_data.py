from datetime import datetime

from pymongo import MongoClient

client = MongoClient("mongodb://127.0.0.1:27017/")
db = client["smart_irrigation"]
collection = db["weatherdatas"]

# Generate deterministic sample data for each crop rule
sample_docs = []

# Rice-like rows (high rainfall, moderate temp)
for i in range(20):
    sample_docs.append({
        "temperature": 25 + (i % 3) * 0.5,
        "humidity": 70 + (i % 5),
        "rainfall": 110 + (i % 10),
        "soilMoisture": 60 + (i % 10),
        "city": "SampleCity",
        "createdAt": datetime.utcnow(),
    })

# Cotton-like rows (high temperature)
for i in range(20):
    sample_docs.append({
        "temperature": 33 + (i % 3) * 0.5,
        "humidity": 30 + (i % 5),
        "rainfall": 10 + (i % 5),
        "soilMoisture": 25 + (i % 10),
        "city": "SampleCity",
        "createdAt": datetime.utcnow(),
    })

# Millet-like rows (low rainfall / moderate temp)
for i in range(20):
    sample_docs.append({
        "temperature": 28 + (i % 2) * 0.5,
        "humidity": 40 + (i % 7),
        "rainfall": 30 + (i % 10),
        "soilMoisture": 40 + (i % 10),
        "city": "SampleCity",
        "createdAt": datetime.utcnow(),
    })

# insert into DB
collection.insert_many(sample_docs)
print(f"Inserted {len(sample_docs)} sample weather records into 'weatherdatas'.")