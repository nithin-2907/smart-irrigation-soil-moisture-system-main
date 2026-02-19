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

# Mock Logic: Randomly return a result to demonstrate the UI
diseases = [
    {
        "disease": "Tomato Early Blight",
        "confidence": 88.5,
        "recommendation": "Use copper-based fungicides. Remove infected leaves immediately. Improve air circulation."
    },
    {
        "disease": "Potato Late Blight",
        "confidence": 92.1,
        "recommendation": "Apply metalaxyl or mancozeb. Destroy infected tubers. Avoid overhead irrigation."
    },
    {
        "disease": "Healthy",
        "confidence": 99.0,
        "recommendation": "Plant is healthy! Keep monitoring water and nutrient levels."
    },
    {
        "disease": "Corn Common Rust",
        "confidence": 76.4,
        "recommendation": "Plant resistant varieties. Apply fungicides if infection is severe early in the season."
    }
]

# Simulate processing time? No need for mock.
result = random.choice(diseases)

# Return JSON
print(json.dumps(result))
