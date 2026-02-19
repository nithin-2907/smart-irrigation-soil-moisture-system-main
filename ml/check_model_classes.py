import joblib
import sys
import os

try:
    path = os.path.join(os.path.dirname(__file__), 'model.pkl')
    raw = joblib.load(path)
    
    if isinstance(raw, dict) and 'model' in raw:
        model = raw['model']
    else:
        model = raw

    print("Classes:", model.classes_)
except Exception as e:
    print("Error:", e)
