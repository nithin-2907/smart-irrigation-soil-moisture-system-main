import sys
import json
import random
import os

# usage: predict_disease.py <image_path>

if len(sys.argv) < 2:
    print(json.dumps({"error": "No image path provided"}))
    sys.exit(1)

image_path = sys.argv[1]

# In a real scenario, we would load a model here:
# model = load_model('disease_model.h5')
# img = process_image(image_path)
# pred = model.predict(img)

# Disease database with cure and prevention details
diseases = [
    {
        "disease": "Tomato Early Blight",
        "confidence": 88.5,
        "recommendation": "Use copper-based fungicides. Remove infected leaves immediately.",
        "cure": [
            "Apply chlorothalonil or copper-based fungicide every 7–10 days",
            "Remove and destroy all infected leaves and stems",
            "Apply neem oil spray as an organic alternative",
            "Use baking soda solution (1 tbsp per gallon of water) as a mild fungicide"
        ],
        "prevention": [
            "Rotate crops — avoid planting tomatoes in the same spot for 2–3 years",
            "Water at the base of plants, avoid wetting foliage",
            "Ensure proper spacing for good air circulation",
            "Mulch around plants to prevent soil-borne spores from splashing",
            "Remove plant debris at end of season"
        ]
    },
    {
        "disease": "Potato Late Blight",
        "confidence": 92.1,
        "recommendation": "Apply metalaxyl or mancozeb. Destroy infected tubers.",
        "cure": [
            "Apply mancozeb or metalaxyl-based fungicide immediately upon detection",
            "Remove and destroy all infected plants — do not compost",
            "Harvest remaining healthy tubers as soon as possible",
            "Apply phosphorous acid foliar spray to protect uninfected plants"
        ],
        "prevention": [
            "Plant certified disease-free seed tubers only",
            "Avoid overhead irrigation — use drip irrigation instead",
            "Destroy volunteer potato plants that may harbor the pathogen",
            "Monitor weather — blight spreads fast in cool, humid conditions",
            "Apply preventive fungicide before rainy periods"
        ]
    },
    {
        "disease": "Healthy",
        "confidence": 99.0,
        "recommendation": "Plant is healthy! Continue regular care.",
        "cure": [],
        "prevention": [
            "Maintain consistent watering schedule",
            "Monitor soil nutrients with regular testing",
            "Inspect leaves weekly for early signs of disease",
            "Keep garden area clean of debris and weeds",
            "Use balanced fertilizer during growing season"
        ]
    },
    {
        "disease": "Corn Common Rust",
        "confidence": 76.4,
        "recommendation": "Apply fungicides if infection is detected early in the season.",
        "cure": [
            "Apply triazole-based fungicide (e.g., propiconazole) at first sign of pustules",
            "Apply strobilurin fungicide for broader protection",
            "Remove heavily infected lower leaves to reduce spore load",
            "Repeat fungicide application after 14 days if infection persists"
        ],
        "prevention": [
            "Plant rust-resistant corn hybrids (check seed label for resistance rating)",
            "Plant early to avoid peak rust season",
            "Avoid excessive nitrogen fertilization which promotes lush, susceptible growth",
            "Scout fields weekly during tasseling stage",
            "Maintain proper plant spacing for airflow"
        ]
    },
    {
        "disease": "Tomato Leaf Mold",
        "confidence": 84.2,
        "recommendation": "Improve ventilation and apply fungicide.",
        "cure": [
            "Apply copper-based or chlorothalonil fungicide",
            "Remove and destroy infected leaves immediately",
            "Reduce humidity in greenhouse — open vents and use fans",
            "Apply potassium bicarbonate spray as organic treatment"
        ],
        "prevention": [
            "Maintain relative humidity below 85% in greenhouses",
            "Space plants adequately for air circulation",
            "Water plants at the base — never on foliage",
            "Use resistant tomato varieties (look for 'Cf' resistance genes)",
            "Sanitize tools and stakes between plants"
        ]
    },
    {
        "disease": "Bacterial Leaf Spot",
        "confidence": 81.7,
        "recommendation": "Remove infected parts and apply copper spray.",
        "cure": [
            "Apply copper hydroxide or copper sulfate spray at first symptoms",
            "Prune and remove all infected leaves and branches",
            "Apply streptomycin spray for severe bacterial infections",
            "Avoid working with plants when foliage is wet"
        ],
        "prevention": [
            "Use certified disease-free seeds and transplants",
            "Practice 2–3 year crop rotation away from susceptible crops",
            "Avoid overhead watering — use drip irrigation",
            "Sterilize pruning tools with 10% bleach solution between cuts",
            "Remove all crop debris after harvest"
        ]
    },
    {
        "disease": "Powdery Mildew",
        "confidence": 90.3,
        "recommendation": "Apply sulfur-based fungicide and improve airflow.",
        "cure": [
            "Apply sulfur-based or potassium bicarbonate fungicide",
            "Spray neem oil solution (2 tbsp per gallon) every 7 days",
            "Use milk spray (40% milk to 60% water) as organic control",
            "Remove heavily infected leaves and destroy them"
        ],
        "prevention": [
            "Choose mildew-resistant plant varieties when available",
            "Ensure plants have adequate spacing for airflow",
            "Avoid excessive nitrogen fertilizer (promotes tender, susceptible growth)",
            "Water in the morning so foliage dries quickly",
            "Prune to open up plant canopy and improve air circulation"
        ]
    }
]

# Simulate prediction (mock)
result = random.choice(diseases)

# Return JSON
print(json.dumps(result))
