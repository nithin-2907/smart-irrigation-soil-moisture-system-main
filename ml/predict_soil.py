import json
import os
import sys

import joblib

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# search candidate locations for the model
candidates = [
    os.path.join(BASE_DIR, 'soil_model.pkl'),
    os.path.join(BASE_DIR, '..', 'soil_model.pkl'),
    os.path.join(BASE_DIR, '..', '..', 'soil_model.pkl'),
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
classes = payload.get('classes', [])

if len(sys.argv) < 5:
    print(json.dumps({'error': 'missing-args', 'usage': 'predict_soil.py <nitrogen> <phosphorus> <potassium> <ph>'}))
    sys.exit(2)

nitrogen = float(sys.argv[1])
phosphorus = float(sys.argv[2])
potassium = float(sys.argv[3])
ph = float(sys.argv[4])

pred = model.predict([[nitrogen, phosphorus, potassium, ph]])
proba = None
if hasattr(model, 'predict_proba'):
    probs = model.predict_proba([[nitrogen, phosphorus, potassium, ph]])
    proba = float(max(probs[0]))

label = classes[int(pred[0])] if len(classes) > 0 else str(int(pred[0]))

print(json.dumps({'predicted_label': label, 'probability': proba}))