"""
predict_server.py — Persistent HTTP prediction server.
Loads the ML model ONCE at startup, then serves fast predictions via HTTP.
Start: python ml/predict_server.py  (runs on port 5001)
"""
import json
import os
import sys
import warnings
warnings.filterwarnings("ignore")

from http.server import HTTPServer, BaseHTTPRequestHandler
import joblib
import pandas as pd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PORT = 5001

# ── Load model once at startup ────────────────────────────────────────────────
model_path = os.path.join(BASE_DIR, "model.pkl")
if not os.path.exists(model_path):
    print(json.dumps({"error": "model-not-found", "path": model_path}), flush=True)
    sys.exit(2)

print(f"Loading model from {model_path} ...", flush=True)
raw = joblib.load(model_path)
if isinstance(raw, dict) and "model" in raw:
    model        = raw["model"]
    feature_cols = raw["feature_columns"]
    cat_values   = raw.get("categorical_values", {})
else:
    model        = raw
    feature_cols = ["temperature", "humidity", "rainfall"]
    cat_values   = {}

print(f"Model loaded. Features: {len(feature_cols)}. Ready on port {PORT}.", flush=True)


def predict(data):
    """Run inference and return {'predictedCrop': '...'}."""
    def safe_float(v, default):
        try:
            return float(v) if v not in (None, "", "None") else default
        except (ValueError, TypeError):
            return default

    temperature  = safe_float(data.get("temperature"),  25.0)
    humidity     = safe_float(data.get("humidity"),     60.0)
    rainfall     = safe_float(data.get("rainfall"),    100.0)
    soil_ph      = safe_float(data.get("soil_ph"),       6.5)
    soilMoisture = safe_float(data.get("soilMoisture"), 40.0)
    nitrogen     = safe_float(data.get("nitrogen"),     40.0)
    phosphorus   = safe_float(data.get("phosphorus"),   20.0)
    potassium    = safe_float(data.get("potassium"),    30.0)
    soilType     = data.get("soilType", "")
    region       = data.get("region",   "")
    season       = data.get("season",   "")

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

    input_cats = {"soilType": soilType, "region": region, "season": season}
    for cat_col, values in cat_values.items():
        user_val = input_cats.get(cat_col, "")
        for v in values:
            row[f"{cat_col}_{v}"] = 1.0 if user_val == v else 0.0

    X_values = [row.get(col, 0.0) for col in feature_cols]
    X = pd.DataFrame([X_values], columns=feature_cols)
    pred = model.predict(X)
    return {"predictedCrop": str(pred[0])}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # suppress request logs

    def do_GET(self):
        if self.path == "/health":
            self._respond(200, {"status": "ok", "features": len(feature_cols)})
        else:
            self._respond(404, {"error": "not found"})

    def do_POST(self):
        if self.path == "/predict-crop":
            try:
                length = int(self.headers.get("Content-Length", 0))
                body   = self.rfile.read(length)
                data   = json.loads(body)
                result = predict(data)
                self._respond(200, result)
            except Exception as e:
                self._respond(500, {"error": str(e)})
        else:
            self._respond(404, {"error": "not found"})

    def _respond(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    server = HTTPServer(("127.0.0.1", PORT), Handler)
    print(f"Prediction server listening on http://127.0.0.1:{PORT}", flush=True)
    server.serve_forever()
