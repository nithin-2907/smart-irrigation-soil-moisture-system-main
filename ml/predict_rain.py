import os
import sys
from datetime import datetime

import joblib

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# look for model in ml/ then parent folders (trained scripts may save to different cwd)
candidates = [
    os.path.join(BASE_DIR, 'rainfall_model.pkl'),
    os.path.join(BASE_DIR, '..', 'rainfall_model.pkl'),
    os.path.join(BASE_DIR, '..', '..', 'rainfall_model.pkl'),
    os.path.join(BASE_DIR, '..', '..', 'backend', 'rainfall_model.pkl')
]
model_path = None
for c in candidates:
    if os.path.exists(c):
        model_path = os.path.abspath(c)
        break

if not model_path:
    print('ERROR: model not found')
    sys.exit(2)

model = joblib.load(model_path)

# expected args: temperature humidity soilMoisture rainfall_lag1 dayofyear
if len(sys.argv) < 6:
    print('ERROR: missing args')
    print('usage: predict_rain.py <temperature> <humidity> <soilMoisture> <rainfall_lag1> <dayofyear>')
    sys.exit(2)

temperature = float(sys.argv[1])
humidity = float(sys.argv[2])
soilMoisture = float(sys.argv[3])
rainfall_lag1 = float(sys.argv[4])
dayofyear = int(sys.argv[5])

pred = model.predict([[temperature, humidity, soilMoisture, rainfall_lag1, dayofyear]])
print(float(pred[0]))
