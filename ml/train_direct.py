"""
train_direct.py — Self-contained model trainer.
Generates realistic, crop-specific training data entirely in Python (no MongoDB),
trains a Random Forest, and saves model.pkl so predict.py can use it immediately.
Run: python ml/train_direct.py
"""
import random
import os
import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report

# ── reproducible results ──────────────────────────────────────────────────────
random.seed(42)

def rnd(lo, hi, n=1):
    return [round(lo + random.random() * (hi - lo), 2) for _ in range(n)]

def gen(crop, n, temp, hum, rain, ph, moist, N, P, K, soils, seasons, regions):
    rows = []
    for _ in range(n):
        rows.append({
            "crop":        crop,
            "temperature": round(random.uniform(*temp), 1),
            "humidity":    round(random.uniform(*hum),  1),
            "rainfall":    round(random.uniform(*rain),  1),
            "soil_ph":     round(random.uniform(*ph),    2),
            "soilMoisture":round(random.uniform(*moist), 1),
            "nitrogen":    round(random.uniform(*N),     1),
            "phosphorus":  round(random.uniform(*P),     1),
            "potassium":   round(random.uniform(*K),     1),
            "soilType":    random.choice(soils),
            "season":      random.choice(seasons),
            "region":      random.choice(regions),
        })
    return rows

# ── Crop definitions — tightly-bounded, realistic and DISTINCT ────────────────
# Each crop occupies a clearly different zone in feature space
rows = []
rows += gen("Rice",      300, (22,32),(75,95),(160,280),(5.5,7.0),(50,80),(60,120),(25,55),(25,55), ["Clay","Loamy"],         ["Kharif"],        ["South","East","West"])
rows += gen("Wheat",     300, (8,18), (40,65),(50,100), (6.0,7.5),(30,55),(80,120),(30,70),(35,65), ["Loamy","Sandy"],        ["Rabi"],           ["North","Central"])
rows += gen("Corn",      250, (20,30),(55,75),(80,160), (5.5,7.0),(40,65),(70,110),(30,65),(30,60), ["Loamy","Clay"],         ["Kharif","Rabi"],  ["North","Central","West"])
rows += gen("Millet",    250, (25,35),(30,55),(25,70),  (5.5,7.5),(15,40),(15,45),(10,40),(10,40),  ["Sandy","Red","Loamy"],  ["Kharif","Zaid"],  ["South","West"])
rows += gen("Cotton",    250, (28,40),(50,70),(60,120), (6.0,8.0),(30,55),(10,30),(10,30),(15,35),  ["Black","Red","Sandy"],  ["Kharif"],         ["South","Central"])
rows += gen("Jute",      200, (27,37),(75,95),(140,280),(6.0,7.5),(60,90),(60,100),(30,60),(30,60), ["Clay","Loamy"],         ["Kharif"],         ["East"])
rows += gen("Apple",     250, (2,12), (65,90),(100,180),(5.5,6.8),(45,75),(40,75),(25,55),(30,60),  ["Loamy","Sandy"],        ["Rabi"],           ["North"])
rows += gen("Banana",    250, (24,34),(75,95),(150,280),(5.5,7.0),(50,85),(80,120),(30,60),(50,90), ["Sandy","Loamy"],        ["Kharif","Zaid"],  ["South","East"])
rows += gen("Grapes",    200, (22,32),(55,80),(60,110), (6.0,7.5),(30,60),(20,55),(15,45),(30,65),  ["Sandy","Loamy"],        ["Rabi"],           ["South","West"])
rows += gen("Mango",     200, (26,38),(45,80),(80,150), (5.5,7.5),(35,65),(15,40),(10,30),(15,40),  ["Sandy","Red","Loamy"],  ["Zaid","Kharif"],  ["South","Central"])
rows += gen("Papaya",    200, (24,34),(65,90),(100,200),(6.0,7.5),(45,80),(40,70),(20,50),(20,50),  ["Clay","Loamy"],         ["Kharif","Zaid"],  ["South","East"])
rows += gen("Coconut",   200, (24,34),(75,95),(150,250),(5.5,7.0),(55,85),(15,35),(10,30),(50,90),  ["Sandy","Loamy"],        ["Kharif","Zaid"],  ["South"])
rows += gen("Coffee",    200, (18,26),(70,95),(120,240),(5.5,6.5),(55,85),(40,75),(20,50),(20,60),  ["Clay","Red"],           ["Kharif","Rabi"],  ["South"])
rows += gen("Sugarcane", 200, (23,38),(60,90),(150,300),(6.0,7.5),(50,85),(70,120),(30,60),(15,55), ["Clay","Loamy","Black"], ["Kharif","Zaid"],  ["South","Central"])
rows += gen("Chickpea",  200, (18,27),(35,60),(50,90),  (6.0,8.0),(20,45),(35,70),(55,90),(15,45), ["Sandy","Loamy","Black"],["Rabi"],           ["North","Central"])
rows += gen("Lentil",    200, (14,22),(45,70),(55,100), (6.0,8.0),(25,50),(15,45),(20,55),(15,40), ["Sandy","Loamy"],        ["Rabi"],           ["North","Central"])
rows += gen("Groundnut", 200, (25,35),(40,65),(60,120), (5.5,7.0),(25,55),(15,40),(25,55),(20,50), ["Sandy","Loamy","Red"],  ["Kharif","Rabi"],  ["South","Central"])

print(f"Total training samples: {len(rows)}")

df = pd.DataFrame(rows)
print("Crops:", df["crop"].value_counts().to_dict())

# ── Feature engineering ────────────────────────────────────────────────────────
numeric_cols = ["temperature","humidity","rainfall","soil_ph","soilMoisture","nitrogen","phosphorus","potassium"]
cat_cols     = ["soilType","region","season"]

X_num = df[numeric_cols].astype(float)
X_cat = pd.get_dummies(df[cat_cols].astype(str), prefix=cat_cols)
X = pd.concat([X_num.reset_index(drop=True), X_cat.reset_index(drop=True)], axis=1)
y = df["crop"]

print(f"Feature matrix: {X.shape[0]} rows × {X.shape[1]} columns")

# ── Train ──────────────────────────────────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

model = RandomForestClassifier(n_estimators=200, max_depth=None, random_state=42, n_jobs=-1)
model.fit(X_train, y_train)

y_pred = model.predict(X_test)
acc = accuracy_score(y_test, y_pred)
print(f"\n✅ Test Accuracy: {acc*100:.1f}%")
print(classification_report(y_test, y_pred))

# ── Save model payload ─────────────────────────────────────────────────────────
# Capture categorical values seen during training so predict.py can OHE correctly
cat_values = {}
for c in cat_cols:
    cat_values[c] = sorted(df[c].unique().tolist())

payload = {
    "model":               model,
    "feature_columns":     list(X.columns),
    "categorical_values":  cat_values,
}

# Save to ml/model.pkl (same location predict.py looks for)
out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "model.pkl")
joblib.dump(payload, out_path)
print(f"\n✅ Model saved → {out_path}")
print(f"   Features: {len(payload['feature_columns'])}")
print(f"   Categorical values: { {k: len(v) for k,v in cat_values.items()} }")
