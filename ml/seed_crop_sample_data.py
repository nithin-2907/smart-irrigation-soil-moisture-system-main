"""
Seed crop_samples with strongly-separated realistic data per crop.
Each crop has tightly-bounded parameter ranges so the Random Forest
can clearly learn decision boundaries.
"""
import random
from datetime import datetime
from pymongo import MongoClient

client = MongoClient("mongodb://127.0.0.1:27017/")
db = client["smart_irrigation"]
col = db["crop_samples"]

# Clear old noisy data
col.delete_many({})
print("Cleared old crop_samples data")

def gen(crop, n, temp, humi, rain, ph, moist, N, P, K, soils, seasons, regions):
    docs = []
    for _ in range(n):
        docs.append({
            "crop": crop,
            "temperature":  round(random.uniform(*temp),  1),
            "humidity":     round(random.uniform(*humi),  1),
            "rainfall":     round(random.uniform(*rain),  1),
            "soil_ph":      round(random.uniform(*ph),    2),
            "soilMoisture": round(random.uniform(*moist), 1),
            "nitrogen":     round(random.uniform(*N),     1),
            "phosphorus":   round(random.uniform(*P),     1),
            "potassium":    round(random.uniform(*K),     1),
            "soilType":     random.choice(soils),
            "season":       random.choice(seasons),
            "region":       random.choice(regions),
            "createdAt":    datetime.utcnow(),
        })
    return docs

# ───────────────────────────────────────────────
# Crop definitions — tightly controlled & distinct
# ───────────────────────────────────────────────
#           crop        n    temp        humi        rain         ph           moist         N            P            K          soils                   seasons            regions
data  = gen("Rice",  250, (22,32),  (75,95),  (160,280),  (5.5,7.0),  (50,80), (60,120),(25,55),(25,55), ["Clay","Loamy"],                ["Kharif"],          ["South","East","West"])
data += gen("Wheat", 250, (8,18),   (40,65),  (50,100),   (6.0,7.5),  (30,55), (80,120),(30,70),(35,65), ["Loamy","Sandy"],              ["Rabi"],            ["North","Central"])
data += gen("Corn",  200, (20,30),  (55,75),  (80,160),   (5.5,7.0),  (40,65), (70,110),(30,65),(30,60), ["Loamy","Clay"],               ["Kharif","Rabi"],   ["North","Central","West"])
data += gen("Millet",200, (25,35),  (30,55),  (25,70),    (5.5,7.5),  (15,40), (15,45), (10,40),(10,40), ["Sandy","Red","Loamy"],        ["Kharif","Zaid"],   ["South","West","Central"])
data += gen("Cotton",200, (28,40),  (50,70),  (60,120),   (6.0,8.0),  (30,55), (10,30), (10,30),(15,35), ["Black","Red","Sandy"],        ["Kharif"],          ["South","Central","West"])
data += gen("Jute",  200, (27,37),  (75,95),  (140,280),  (6.0,7.5),  (60,90), (60,100),(30,60),(30,60), ["Clay","Loamy"],               ["Kharif"],          ["East"])
data += gen("Apple", 200, (2,12),   (65,90),  (100,180),  (5.5,6.8),  (45,75), (40,75), (25,55),(30,60), ["Loamy","Sandy"],              ["Rabi"],            ["North"])
data += gen("Banana",200, (24,34),  (75,95),  (150,280),  (5.5,7.0),  (50,85), (80,120),(30,60),(50,90), ["Sandy","Loamy","Clay"],       ["Kharif","Zaid"],   ["South","East"])
data += gen("Grapes",200, (22,32),  (55,80),  (60,110),   (6.0,7.5),  (30,60), (20,55), (15,45),(30,65), ["Sandy","Loamy"],              ["Rabi"],            ["South","West"])
data += gen("Mango", 200, (25,38),  (45,80),  (80,150),   (5.5,7.5),  (35,65), (15,40), (10,30),(15,40), ["Sandy","Red","Loamy"],        ["Zaid","Kharif"],   ["South","Central"])
data += gen("Papaya",200, (24,34),  (65,90),  (100,200),  (6.0,7.5),  (45,80), (40,70), (20,50),(20,50), ["Clay","Loamy","Sandy"],       ["Kharif","Zaid"],   ["South","East","West"])
data += gen("Coconut",200,(24,34),  (75,95),  (150,250),  (5.5,7.0),  (55,85), (15,35), (10,30),(50,90), ["Sandy","Loamy"],              ["Kharif","Zaid"],   ["South"])
data += gen("Coffee",200, (18,26),  (70,95),  (120,240),  (5.5,6.5),  (55,85), (40,75), (20,50),(20,60), ["Clay","Loamy","Red"],         ["Kharif","Rabi"],   ["South"])
data += gen("Groundnut",150,(25,35),(40,65),(60,120),(5.5,7.0),(25,55),(15,40),(25,55),(20,50), ["Sandy","Loamy","Red"],       ["Kharif","Rabi"],   ["South","Central"])
data += gen("Chickpea",150,(18,27),(35,60),(50,90),(6.0,8.0),(20,45),(35,70),(55,90),(15,45),   ["Sandy","Loamy","Black"],     ["Rabi"],            ["North","Central","West"])
data += gen("Lentil",150,(14,22),(45,70),(55,100),(6.0,8.0),(25,50),(15,45),(20,55),(15,40),     ["Sandy","Loamy"],             ["Rabi"],            ["North","Central"])
data += gen("Sugarcane",150,(22,38),(60,90),(150,300),(6.0,7.5),(50,85),(70,120),(30,60),(15,55),["Clay","Loamy","Black"],      ["Kharif","Zaid"],   ["South","Central","West"])
data += gen("Kidneybeans",150,(16,26),(50,70),(80,150),(5.5,7.0),(35,65),(20,50),(55,90),(15,45),["Loamy","Sandy","Clay"],      ["Kharif"],          ["North","Central"])

# Insert all docs
col.insert_many(data)
total = col.count_documents({})
print(f"Seeded {total} documents across {len(set(d['crop'] for d in data))} crops")

# Show breakdown
from collections import Counter
counts = Counter(d['crop'] for d in data)
for crop, n in sorted(counts.items()):
    print(f"  {crop}: {n}")
