from datetime import datetime

import joblib
import pandas as pd
from pymongo import MongoClient
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (accuracy_score, classification_report,
                             confusion_matrix)
from sklearn.model_selection import train_test_split

# --- MongoDB connection ---
client = MongoClient("mongodb://127.0.0.1:27017/")
db = client["smart_irrigation"]
# prefer crop_samples if available (richer feature set)
if 'crop_samples' in db.list_collection_names() and db['crop_samples'].count_documents({}) >= 20:
    source_collection = db['crop_samples']
    print("Using 'crop_samples' collection for training (rich feature set)")
else:
    source_collection = db['weatherdatas']

test_collection = db["ml_test_set"]
metrics_collection = db["ml_metrics"]

# load data
data = list(source_collection.find())

MIN_ROWS = 10
if len(data) < MIN_ROWS:
    print(f"Not enough data to train model (need >= {MIN_ROWS} rows). Found: {len(data)}")
    exit()

# Convert to DataFrame
df = pd.DataFrame(data)

# determine feature set based on collection
if source_collection.name == 'crop_samples':
    required_cols = ["temperature", "humidity", "rainfall", "soil_ph", "soilMoisture", "nitrogen", "phosphorus", "potassium", "soilType", "crop"]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        print("Missing required columns in 'crop_samples':", missing)
        exit()

    # features / labels (include numeric + OHE soilType)
    X_num = df[["temperature", "humidity", "rainfall", "soil_ph", "soilMoisture", "nitrogen", "phosphorus", "potassium"]].astype(float)
    # One-hot encode soilType (and optionally region/season if present)
    cat_cols = []
    if 'soilType' in df.columns:
        cat_cols.append('soilType')
    if 'region' in df.columns:
        cat_cols.append('region')
    if cat_cols:
        # use pandas.get_dummies for simplicity
        X_cat = pd.get_dummies(df[cat_cols].astype(str), prefix=cat_cols)
        X = pd.concat([X_num.reset_index(drop=True), X_cat.reset_index(drop=True)], axis=1)
    else:
        X = X_num

    y = df['crop'].astype(str)

else:
    # fallback to simple weather-based features
    required_cols = ["temperature", "humidity", "rainfall"]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        print("Missing required columns in DB:", missing)
        exit()

    # Create label (rule-based) when crop is not present
    def crop_label(row):
        if row["rainfall"] > 100 and row["temperature"] < 30:
            return "Rice"
        elif row["temperature"] > 30:
            return "Cotton"
        else:
            return "Millet"

    if 'crop' not in df.columns:
        df['crop'] = df.apply(crop_label, axis=1)

    X = df[["temperature", "humidity", "rainfall"]].astype(float)
    y = df['crop'].astype(str)

# split train / test
TEST_SIZE = 0.2
try:
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=42, stratify=y
    )
except ValueError:
    # fallback when stratify fails (e.g. single class present)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=42
    )

# Persist test dataset to MongoDB (replace previous test docs)
print(f"Saving {len(X_test)} rows to 'ml_test_set' collection...")
test_collection.delete_many({})
if len(X_test) > 0:
    docs = []
    if source_collection.name == 'crop_samples':
        # include rich original input fields for crop samples
        for idx in X_test.index:
            src_row = df.loc[idx]
            docs.append({
                "temperature": float(src_row["temperature"]),
                "humidity": float(src_row["humidity"]),
                "rainfall": float(src_row["rainfall"]),
                "soil_ph": float(src_row.get("soil_ph", None)) if src_row.get("soil_ph", None) is not None else None,
                "soilMoisture": float(src_row.get("soilMoisture", None)) if src_row.get("soilMoisture", None) is not None else None,
                "nitrogen": float(src_row.get("nitrogen", None)) if src_row.get("nitrogen", None) is not None else None,
                "phosphorus": float(src_row.get("phosphorus", None)) if src_row.get("phosphorus", None) is not None else None,
                "potassium": float(src_row.get("potassium", None)) if src_row.get("potassium", None) is not None else None,
                "soilType": str(src_row.get("soilType", "")),
                "region": str(src_row.get("region", "")),
                "season": str(src_row.get("season", "")),
                "crop": str(y_test.loc[idx]),
                "createdAt": datetime.utcnow(),
            })
    else:
        for idx, row in X_test.iterrows():
            docs.append({
                "temperature": float(row["temperature"]),
                "humidity": float(row["humidity"]),
                "rainfall": float(row["rainfall"]),
                "crop": str(y_test.loc[idx]),
                "createdAt": datetime.utcnow(),
            })
    test_collection.insert_many(docs)
    print(f"Inserted {len(docs)} test rows into 'ml_test_set'")

# Train model on training split
print("Training model on training split...")
model = RandomForestClassifier(random_state=42)
model.fit(X_train, y_train)

# Save model payload: include feature columns + categorical values so predict script can build inputs
model_payload = { 'model': model, 'feature_columns': list(X.columns) }
# capture categorical value lists (for any prefixed get_dummies columns)
cat_values = {}
for c in ['soilType', 'region', 'season']:
    if c in df.columns:
        cat_values[c] = list(df[c].astype(str).unique())
if cat_values:
    model_payload['categorical_values'] = cat_values

joblib.dump(model_payload, "model.pkl")
print("Model trained and saved as model.pkl")

# Evaluate on test split
if len(X_test) > 0:
    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    report_text = classification_report(y_test, y_pred)
    conf_mat = confusion_matrix(y_test, y_pred).tolist()

    metrics_doc = {
        "createdAt": datetime.utcnow(),
        "accuracy": float(acc),
        "classification_report": report_text,
        "confusion_matrix": conf_mat,
        "test_rows": len(X_test),
    }
    metrics_collection.insert_one(metrics_doc)

    print(f"Test accuracy: {acc:.4f}")
    print(report_text)
else:
    print("No test rows available to evaluate.")
