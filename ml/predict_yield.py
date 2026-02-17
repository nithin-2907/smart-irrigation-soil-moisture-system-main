import json
import os
import sys

import joblib
import numpy as np

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# search candidate locations for the model
candidates = [
    os.path.join(BASE_DIR, 'yield_model.pkl'),
    os.path.join(BASE_DIR, '..', 'yield_model.pkl'),
    os.path.join(BASE_DIR, '..', '..', 'yield_model.pkl'),
]
model_path = None
for c in candidates:
    if os.path.exists(c):
        model_path = os.path.abspath(c)
        break

if not model_path:
    print(json.dumps({'error': 'model-not-found'}))
    sys.exit(2)

payload = joblib.load(model_path)
model = payload['model']
ohe_cats = payload.get('ohe_categories', [])
feature_columns = payload.get('feature_columns', [])

if len(sys.argv) < 5:
    print(json.dumps({'error': 'missing-args', 'usage': 'predict_yield.py <area> <rainfall> <temperature> <crop> [fertilizer]'}))
    sys.exit(2)

area = float(sys.argv[1])
rainfall = float(sys.argv[2])
temperature = float(sys.argv[3])
crop = str(sys.argv[4])
fertilizer = float(sys.argv[5]) if len(sys.argv) > 5 else 0.0

# build input row matching feature_columns
row = { 'area': area, 'rainfall': rainfall, 'temperature': temperature, 'fertilizer': fertilizer }
# add OHE crop columns
for c in ohe_cats:
    row[f'crop_{c}'] = 1.0 if c.lower() == crop.lower() else 0.0

# ensure column order
X = np.array([row.get(col, 0.0) for col in feature_columns]).reshape(1, -1)

pred = model.predict(X)
pred_value = float(pred[0])

print(json.dumps({'predicted_yield_per_ha': pred_value}))
