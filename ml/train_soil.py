import json
from datetime import datetime

import joblib
import pandas as pd
from pymongo import MongoClient
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, f1_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

# Connect to MongoDB
client = MongoClient("mongodb://127.0.0.1:27017/")
db = client['smart_irrigation']
collection = db['soil_samples']

# If not enough samples, seed synthetic data programmatically
count = collection.count_documents({})
if count < 80:
    print('Not enough soil samples in DB — seeding synthetic data...')
    from seed_soil_sample_data import \
        sample_docs as _sample_docs  # re-use seeder
    collection.insert_many(_sample_docs)
    count = collection.count_documents({})

rows = list(collection.find().sort('createdAt', 1))
if len(rows) < 30:
    print('ERROR: not enough soil samples to train (need >= 30)')
    exit(1)

df = pd.DataFrame(rows)
# ensure numeric dtype
for c in ['nitrogen', 'phosphorus', 'potassium', 'ph']:
    df[c] = pd.to_numeric(df[c], errors='coerce')

# drop NaNs
df = df.dropna(subset=['nitrogen', 'phosphorus', 'potassium', 'ph', 'label'])

FEATURES = ['nitrogen', 'phosphorus', 'potassium', 'ph']
X = df[FEATURES]
y = df['label']

# encode labels
le = LabelEncoder()
y_enc = le.fit_transform(y)

X_train, X_test, y_train, y_test = train_test_split(X, y_enc, test_size=0.2, random_state=42)

model = RandomForestClassifier(n_estimators=200, random_state=42)
model.fit(X_train, y_train)

# evaluate
pred = model.predict(X_test)
acc = accuracy_score(y_test, pred)
f1 = f1_score(y_test, pred, average='macro')
report = classification_report(y_test, pred, output_dict=True)

# save model + label classes together
joblib.dump({'model': model, 'classes': list(le.classes_)}, 'soil_model.pkl')

# save test rows to DB
test_docs = []
for idx in range(len(X_test)):
    row = X_test.iloc[idx]
    actual_label = le.inverse_transform([y_test[idx]])[0]
    test_docs.append({
        'nitrogen': float(row['nitrogen']),
        'phosphorus': float(row['phosphorus']),
        'potassium': float(row['potassium']),
        'ph': float(row['ph']),
        'actual_label': actual_label,
        'createdAt': datetime.utcnow()
    })

if len(test_docs) > 0:
    db['soil_test_set'].delete_many({})
    db['soil_test_set'].insert_many(test_docs)

metrics_doc = {
    'createdAt': datetime.utcnow(),
    'accuracy': float(acc),
    'f1_macro': float(f1),
    'report': report,
    'test_rows': len(X_test)
}

db['soil_metrics'].insert_one(metrics_doc)

print(f"Model trained — accuracy={acc:.4f}, f1_macro={f1:.4f}")
print('Saved model to soil_model.pkl and test rows to soil_test_set')
# print JSON-serializable metrics (convert datetime to ISO)
print(json.dumps({**{k: (v.isoformat() if k == 'createdAt' else v) for k, v in metrics_doc.items()}}))