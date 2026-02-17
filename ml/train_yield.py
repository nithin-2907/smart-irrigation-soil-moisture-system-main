import json
from datetime import datetime

import joblib
import pandas as pd
from pymongo import MongoClient
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder

# Connect to MongoDB
client = MongoClient("mongodb://127.0.0.1:27017/")
db = client['smart_irrigation']
collection = db['yield_samples']

# Seed synthetic data if not enough rows
count = collection.count_documents({})
if count < 100:
    print('Not enough yield samples in DB — seeding synthetic data...')
    from seed_yield_sample_data import sample_docs as _sample_docs
    collection.insert_many(_sample_docs)
    count = collection.count_documents({})

rows = list(collection.find().sort('createdAt', 1))
if len(rows) < 30:
    print('ERROR: not enough yield samples to train (need >= 30)')
    exit(1)

# Build DataFrame
df = pd.DataFrame(rows)
# ensure numeric dtype
for c in ['area', 'rainfall', 'temperature', 'fertilizer', 'yield_per_ha']:
    df[c] = pd.to_numeric(df[c], errors='coerce')

# Drop any missing values
df = df.dropna(subset=['area', 'rainfall', 'temperature', 'fertilizer', 'crop', 'yield_per_ha'])

FEATURES_NUM = ['area', 'rainfall', 'temperature', 'fertilizer']
X_num = df[FEATURES_NUM]

# encode crop with OneHotEncoder
ohe = OneHotEncoder(sparse_output=False, handle_unknown='ignore')
crop_ohe = ohe.fit_transform(df[['crop']])
# handle case where categories_ may be a list of arrays
cats = ohe.categories_[0] if hasattr(ohe, 'categories_') else []
crop_cols = [f"crop_{c}" for c in cats]

X = pd.concat([X_num.reset_index(drop=True), pd.DataFrame(crop_ohe, columns=crop_cols)], axis=1)
Y = df['yield_per_ha']

# split
X_train, X_test, y_train, y_test = train_test_split(X, Y, test_size=0.20, random_state=42)

model = RandomForestRegressor(n_estimators=200, random_state=42)
model.fit(X_train, y_train)

# evaluate
preds = model.predict(X_test)
# compute RMSE in a sklearn-version-compatible way
mse = mean_squared_error(y_test, preds)
rmse = float(mse ** 0.5)
r2 = r2_score(y_test, preds)

import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# save model + encoder metadata (write to ml/ so predict_yield finds it)
model_path = os.path.join(BASE_DIR, 'yield_model.pkl')
joblib.dump({'model': model, 'ohe_categories': list(ohe.categories_[0]), 'feature_columns': list(X.columns)}, model_path)

# save test rows to DB (strip OHE columns; keep original inputs + actual)
test_docs = []
for i in range(len(X_test)):
    # find matching original row by index in the test split (approx)
    row = X_test.iloc[i]
    # reconstruct crop from OHE columns
    crop_name = None
    for c in crop_cols:
        if c in row.index and row[c] == 1:
            crop_name = c.replace('crop_', '')
            break
    test_docs.append({
        'area': float(row['area']),
        'rainfall': float(row['rainfall']),
        'temperature': float(row['temperature']) if 'temperature' in row.index else None,
        'fertilizer': float(row['fertilizer']) if 'fertilizer' in row.index else None,
        'crop': crop_name,
        'actual_yield_per_ha': float(y_test.iloc[i]),
        'createdAt': datetime.utcnow()
    })

if len(test_docs) > 0:
    db['yield_test_set'].delete_many({})
    db['yield_test_set'].insert_many(test_docs)

metrics_doc = {
    'createdAt': datetime.utcnow(),
    'rmse': float(rmse),
    'r2': float(r2),
    'test_rows': len(X_test)
}

db['yield_metrics'].insert_one(metrics_doc)

print(f"Yield model trained — rmse={rmse:.4f}, r2={r2:.4f}")
print('Saved model to yield_model.pkl and test rows to yield_test_set')
# prepare JSON-serializable metrics (exclude MongoDB ObjectId if present)
out_metrics = {k: (v.isoformat() if k == 'createdAt' else v) for k, v in metrics_doc.items() if k != '_id'}
print(json.dumps(out_metrics))
