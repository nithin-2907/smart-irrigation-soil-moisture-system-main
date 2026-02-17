import random
from datetime import datetime

# Synthetic yield samples for demo purposes
crops = [
    ("Rice", 4.0),
    ("Wheat", 3.0),
    ("Maize", 5.0),
    ("Sugarcane", 80.0),
    ("Cotton", 1.5),
]

sample_docs = []
for i in range(400):
    crop, base = random.choice(crops)
    area = round(random.uniform(0.5, 10.0), 2)             # hectares
    rainfall = round(random.uniform(50, 800), 1)            # mm over season
    temperature = round(random.uniform(12, 36), 1)          # °C
    fertilizer = round(random.uniform(0, 300), 1)           # kg/ha (synthetic)

    # yield per hectare — synthetic rule-based generator with noise
    climate_factor = max(0.3, 1.0 - abs(temperature - 25) / 40)
    rain_factor = min(1.8, 0.5 + (rainfall / 800.0) * 1.5)
    fert_factor = 0.6 + (fertilizer / 300.0) * 1.4

    yield_per_ha = base * climate_factor * rain_factor * fert_factor
    # add some noise and keep realistic bounds
    yield_per_ha = max(0.1, round(yield_per_ha * random.uniform(0.85, 1.15), 2))

    sample_docs.append({
        'crop': crop,
        'area': float(area),
        'rainfall': float(rainfall),
        'temperature': float(temperature),
        'fertilizer': float(fertilizer),
        'yield_per_ha': float(yield_per_ha),
        'createdAt': datetime.utcnow()
    })

# exported variable used by train script
if __name__ == '__main__':
    print(f"Prepared {len(sample_docs)} synthetic yield samples")
