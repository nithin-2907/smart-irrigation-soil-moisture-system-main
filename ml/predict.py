"""
predict.py — loads model.pkl (trained by train_direct.py or train_model.py)
and outputs a JSON { predictedCrop: "..." } to stdout.

Args (positional):
  temperature humidity rainfall [soil_ph] [soilMoisture] [nitrogen] [phosphorus] [potassium] [soilType] [region] [season]
"""
import json
import os
import sys
import warnings
warnings.filterwarnings("ignore")

import joblib
import pandas as pd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ── Load model ────────────────────────────────────────────────────────────────
model_path = os.path.join(BASE_DIR, "model.pkl")
if not os.path.exists(model_path):
    print(json.dumps({"error": "model-not-found"}))
    sys.exit(2)

raw = joblib.load(model_path)
if isinstance(raw, dict) and "model" in raw:
    model          = raw["model"]
    feature_cols   = raw["feature_columns"]       # exact list used at training time
    cat_values     = raw.get("categorical_values", {})  # {soilType: [...], region: [...], season: [...]}
else:
    # legacy 3-feature model (temp/hum/rain only)
    model        = raw
    feature_cols = ["temperature", "humidity", "rainfall"]
    cat_values   = {}

# ── Parse args ────────────────────────────────────────────────────────────────
if len(sys.argv) < 4:
    print(json.dumps({"error": "need at least temperature humidity rainfall"}))
    sys.exit(2)

def safe_float(v, default):
    try:
        return float(v) if v and v != "None" else default
    except ValueError:
        return default

temperature  = safe_float(sys.argv[1], 25.0)
humidity     = safe_float(sys.argv[2], 60.0)
rainfall     = safe_float(sys.argv[3], 100.0)
soil_ph      = safe_float(sys.argv[4] if len(sys.argv) > 4 else None, 6.5)
soilMoisture = safe_float(sys.argv[5] if len(sys.argv) > 5 else None, 40.0)
nitrogen     = safe_float(sys.argv[6] if len(sys.argv) > 6 else None, 40.0)
phosphorus   = safe_float(sys.argv[7] if len(sys.argv) > 7 else None, 20.0)
potassium    = safe_float(sys.argv[8] if len(sys.argv) > 8 else None, 30.0)
soilType     = sys.argv[9]  if len(sys.argv) > 9  else ""
region       = sys.argv[10] if len(sys.argv) > 10 else ""
season       = sys.argv[11] if len(sys.argv) > 11 else ""

# ── Build feature row matching training format ────────────────────────────────
# numeric features
row = {
    "temperature":  temperature,
    "humidity":     humidity,
    "rainfall":     rainfall,
    "soil_ph":      soil_ph,
    "soilMoisture": soilMoisture,
    "nitrogen":     nitrogen,
    "phosphorus":   phosphorus,
    "potassium":    potassium,
}

# One-hot encode categoricals exactly as pandas get_dummies did during training
# Column names: soilType_Clay, soilType_Sandy, region_North, season_Kharif, ...
input_cats = {"soilType": soilType, "region": region, "season": season}
for cat_col, values in cat_values.items():
    user_val = input_cats.get(cat_col, "")
    for v in values:
        col_name = f"{cat_col}_{v}"
        # exact string match (training used raw strings, not lowercased)
        row[col_name] = 1.0 if user_val == v else 0.0

# Assemble in exact training column order, default 0 for any missing col
X_values = [row.get(col, 0.0) for col in feature_cols]
X = pd.DataFrame([X_values], columns=feature_cols)

# ── Predict ───────────────────────────────────────────────────────────────────
pred = model.predict(X)
pred_label = str(pred[0])

print(json.dumps({"predictedCrop": pred_label}))
