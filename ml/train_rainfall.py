from datetime import datetime

import joblib
import pandas as pd
from pymongo import MongoClient
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split

# Connect to MongoDB
client = MongoClient("mongodb://127.0.0.1:27017/")
db = client['smart_irrigation']
collection = db['weatherdatas']

# Load data
rows = list(collection.find().sort('createdAt', 1))
if len(rows) < 30:
    print('Not enough rows in weatherdatas to train rainfall model (need >= 30)')
    exit()

df = pd.DataFrame(rows)

# ensure datetime
if 'createdAt' in df.columns:
    df['createdAt'] = pd.to_datetime(df['createdAt'])
else:
    print('createdAt missing in weather data')

# Sort by createdAt
df = df.sort_values('createdAt').reset_index(drop=True)

# create lag feature: previous rainfall
df['rainfall_lag1'] = df['rainfall'].shift(1)

# day of year
df['dayofyear'] = df['createdAt'].dt.dayofyear

# use soilMoisture if available, else fill with median
if 'soilMoisture' not in df.columns:
    df['soilMoisture'] = df['soilMoisture'].fillna(50)
else:
    df['soilMoisture'] = df['soilMoisture'].fillna(df['soilMoisture'].median())

# drop rows with NaN (first row will have NaN lag)
df = df.dropna(subset=['rainfall_lag1', 'temperature', 'humidity', 'rainfall'])

# target is next-record rainfall (shift -1)
df['target_rainfall'] = df['rainfall'].shift(-1)
df = df.dropna(subset=['target_rainfall'])

# features
FEATURES = ['temperature', 'humidity', 'soilMoisture', 'rainfall_lag1', 'dayofyear']
X = df[FEATURES]
y = df['target_rainfall']

# train/test
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# evaluate
pred = model.predict(X_test)
# some sklearn versions don't support squared=False — compute RMSE manually
mse = mean_squared_error(y_test, pred)
rmse = float(mse ** 0.5)
mae = mean_absolute_error(y_test, pred)
r2 = r2_score(y_test, pred)

# save model
joblib.dump(model, 'rainfall_model.pkl')

# save a small test-set to DB for inspection
test_docs = []
for i, row in X_test.iterrows():
    test_docs.append({
        'temperature': float(row['temperature']),
        'humidity': float(row['humidity']),
        'soilMoisture': float(row['soilMoisture']),
        'rainfall_lag1': float(row['rainfall_lag1']),
        'dayofyear': int(row['dayofyear']),
        'actual_rainfall_next': float(y_test.loc[i]),
        'createdAt': datetime.utcnow()
    })

if len(test_docs) > 0:
    db['rainfall_test_set'].delete_many({})
    db['rainfall_test_set'].insert_many(test_docs)

metrics_doc = {
    'createdAt': datetime.utcnow(),
    'rmse': float(rmse),
    'mae': float(mae),
    'r2': float(r2),
    'test_rows': len(X_test)
}

db['rainfall_metrics'].insert_one(metrics_doc)

print(f"Model trained — RMSE={rmse:.4f}, MAE={mae:.4f}, R2={r2:.4f}")
print('Saved model to rainfall_model.pkl and test rows to rainfall_test_set')
