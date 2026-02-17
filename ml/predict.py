import json
import os
import sys

import joblib
import numpy as np

# get current file directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# search for model file in likely locations
candidates = [
    os.path.join(BASE_DIR, 'model.pkl'),
    os.path.join(BASE_DIR, '..', 'model.pkl'),
    os.path.join(BASE_DIR, '..', '..', 'model.pkl')
]
model_path = None
for c in candidates:
    if os.path.exists(c):
        model_path = os.path.abspath(c)
        break

if not model_path:
    print(json.dumps({'error': 'model-not-found'}))
    sys.exit(2)

raw = joblib.load(model_path)
# support legacy payload (raw model) and newer dict payload
if isinstance(raw, dict) and 'model' in raw:
    payload = raw
    model = payload.get('model')
    feature_columns = payload.get('feature_columns', [])
    cat_values = payload.get('categorical_values', {})
else:
    # legacy: raw is the model object trained on [temperature, humidity, rainfall]
    model = raw
    feature_columns = ['temperature', 'humidity', 'rainfall']
    cat_values = {}

# expected arg order (positional): temperature humidity rainfall [soil_ph soilMoisture nitrogen phosphorus potassium soilType region season]
if len(sys.argv) < 4:
    print(json.dumps({'error': 'missing-args', 'usage': 'predict.py <temperature> <humidity> <rainfall> [soil_ph] [soilMoisture] [nitrogen] [phosphorus] [potassium] [soilType] [region] [season]'}))
    sys.exit(2)

# required
temperature = float(sys.argv[1])
humidity = float(sys.argv[2])
rainfall = float(sys.argv[3])

# optional - provide defaults
soil_ph = float(sys.argv[4]) if len(sys.argv) > 4 and sys.argv[4] != 'None' else 6.5
soilMoisture = float(sys.argv[5]) if len(sys.argv) > 5 and sys.argv[5] != 'None' else 40.0
nitrogen = float(sys.argv[6]) if len(sys.argv) > 6 and sys.argv[6] != 'None' else 40.0
phosphorus = float(sys.argv[7]) if len(sys.argv) > 7 and sys.argv[7] != 'None' else 20.0
potassium = float(sys.argv[8]) if len(sys.argv) > 8 and sys.argv[8] != 'None' else 30.0
soilType = str(sys.argv[9]) if len(sys.argv) > 9 else ''
region = str(sys.argv[10]) if len(sys.argv) > 10 else ''
season = str(sys.argv[11]) if len(sys.argv) > 11 else ''

# build input row matching feature_columns
row = {
    'temperature': temperature,
    'humidity': humidity,
    'rainfall': rainfall,
    'soil_ph': soil_ph,
    'soilMoisture': soilMoisture,
    'nitrogen': nitrogen,
    'phosphorus': phosphorus,
    'potassium': potassium,
    'soilType': soilType,
    'region': region,
    'season': season
}

# if model was trained with one-hot encoded categorical columns, ensure those columns appear
for cat_col, values in cat_values.items():
    for v in values:
        col_name = f"{cat_col}_{v}"
        row[col_name] = 1.0 if str(row.get(cat_col, '')).lower() == str(v).lower() else 0.0

# ensure column order
X = np.array([row.get(col, 0.0) for col in feature_columns]).reshape(1, -1)

pred = model.predict(X)
pred_label = str(pred[0])

print(json.dumps({'predictedCrop': pred_label}))
