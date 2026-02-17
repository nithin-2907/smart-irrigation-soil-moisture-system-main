import random
from datetime import datetime

from pymongo import MongoClient

client = MongoClient("mongodb://127.0.0.1:27017/")
db = client["smart_irrigation"]
collection = db["crop_samples"]

SOIL_TYPES = ["Clay", "Sandy", "Loamy", "Black", "Red"]
REGIONS = ["North", "South", "East", "West", "Central"]
SEASONS = ["Kharif", "Rabi", "Zaid"]

# helper to clamp values
def clamp(v, a, b):
    return max(a, min(b, v))

sample_docs = []

# generate Rice-like rows (wet, flooded-tolerant soils)
for i in range(80):
    temp = round(random.uniform(22, 30), 1)
    hum = round(random.uniform(65, 90), 1)
    rain = round(random.uniform(100, 300), 1)
    soil_m = round(random.uniform(55, 80), 1)
    soil_ph = round(random.uniform(5.5, 7.5), 2)
    n = round(random.uniform(40, 160), 1)
    p = round(random.uniform(15, 80), 1)
    k = round(random.uniform(20, 120), 1)
    soil = random.choice(["Clay", "Loamy"])
    region = random.choice(REGIONS)
    season = "Kharif"
    sample_docs.append({
        "temperature": temp,
        "humidity": hum,
        "rainfall": rain,
        "soilMoisture": soil_m,
        "soil_ph": soil_ph,
        "nitrogen": n,
        "phosphorus": p,
        "potassium": k,
        "soilType": soil,
        "region": region,
        "season": season,
        "crop": "Rice",
        "createdAt": datetime.utcnow(),
    })

# Cotton-like rows (hot, drier)
for i in range(80):
    temp = round(random.uniform(30, 38), 1)
    hum = round(random.uniform(20, 50), 1)
    rain = round(random.uniform(10, 80), 1)
    soil_m = round(random.uniform(20, 50), 1)
    soil_ph = round(random.uniform(6.0, 8.0), 2)
    n = round(random.uniform(20, 120), 1)
    p = round(random.uniform(10, 50), 1)
    k = round(random.uniform(10, 80), 1)
    soil = random.choice(["Black", "Loamy"])
    region = random.choice(REGIONS)
    season = random.choice(["Kharif", "Rabi"])
    sample_docs.append({
        "temperature": temp,
        "humidity": hum,
        "rainfall": rain,
        "soilMoisture": soil_m,
        "soil_ph": soil_ph,
        "nitrogen": n,
        "phosphorus": p,
        "potassium": k,
        "soilType": soil,
        "region": region,
        "season": season,
        "crop": "Cotton",
        "createdAt": datetime.utcnow(),
    })

# Millet-like rows (arid / low rainfall)
for i in range(80):
    temp = round(random.uniform(24, 34), 1)
    hum = round(random.uniform(15, 50), 1)
    rain = round(random.uniform(5, 40), 1)
    soil_m = round(random.uniform(10, 45), 1)
    soil_ph = round(random.uniform(6.0, 8.0), 2)
    n = round(random.uniform(10, 60), 1)
    p = round(random.uniform(5, 40), 1)
    k = round(random.uniform(5, 60), 1)
    soil = "Sandy"
    region = random.choice(REGIONS)
    season = random.choice(SEASONS)
    sample_docs.append({
        "temperature": temp,
        "humidity": hum,
        "rainfall": rain,
        "soilMoisture": soil_m,
        "soil_ph": soil_ph,
        "nitrogen": n,
        "phosphorus": p,
        "potassium": k,
        "soilType": soil,
        "region": region,
        "season": season,
        "crop": "Millet",
        "createdAt": datetime.utcnow(),
    })

# Groundnut-like rows (sandy/loamy, moderate rain)
for i in range(60):
    temp = round(random.uniform(24, 32), 1)
    hum = round(random.uniform(30, 70), 1)
    rain = round(random.uniform(40, 120), 1)
    soil_m = round(random.uniform(20, 55), 1)
    soil_ph = round(random.uniform(5.5, 7.5), 2)
    n = round(random.uniform(10, 80), 1)
    p = round(random.uniform(8, 60), 1)
    k = round(random.uniform(8, 80), 1)
    soil = random.choice(["Sandy", "Loamy"])
    region = random.choice(REGIONS)
    season = random.choice(SEASONS)
    sample_docs.append({
        "temperature": temp,
        "humidity": hum,
        "rainfall": rain,
        "soilMoisture": soil_m,
        "soil_ph": soil_ph,
        "nitrogen": n,
        "phosphorus": p,
        "potassium": k,
        "soilType": soil,
        "region": region,
        "season": season,
        "crop": "Groundnut",
        "createdAt": datetime.utcnow(),
    })

# Wheat-like rows (cooler-season crop)
for i in range(60):
    temp = round(random.uniform(10, 25), 1)
    hum = round(random.uniform(40, 70), 1)
    rain = round(random.uniform(30, 120), 1)
    soil_m = round(random.uniform(30, 65), 1)
    soil_ph = round(random.uniform(6.0, 8.0), 2)
    n = round(random.uniform(20, 120), 1)
    p = round(random.uniform(10, 80), 1)
    k = round(random.uniform(10, 100), 1)
    soil = random.choice(["Loamy", "Black"])
    region = random.choice(REGIONS)
    season = "Rabi"
    sample_docs.append({
        "temperature": temp,
        "humidity": hum,
        "rainfall": rain,
        "soilMoisture": soil_m,
        "soil_ph": soil_ph,
        "nitrogen": n,
        "phosphorus": p,
        "potassium": k,
        "soilType": soil,
        "region": region,
        "season": season,
        "crop": "Wheat",
        "createdAt": datetime.utcnow(),
    })

# insert into DB
if sample_docs:
    collection.insert_many(sample_docs)
    print(f"Inserted {len(sample_docs)} sample rows into 'crop_samples'.")
else:
    print("No sample docs to insert.")
