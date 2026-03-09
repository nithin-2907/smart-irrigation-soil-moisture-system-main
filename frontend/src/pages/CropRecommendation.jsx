import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

// Detect Indian crop season from current month
function detectSeason() {
  const month = new Date().getMonth() + 1; // 1–12
  if (month >= 6 && month <= 11) return "Kharif";   // Jun–Nov (monsoon)
  if (month >= 11 || month <= 3) return "Rabi";     // Nov–Mar (winter)
  return "Zaid";                                      // Apr–Jun (summer)
}

export default function CropRecommendation() {
  const { user } = useAuth();

  const [form, setForm] = useState({
    temperature: "",
    humidity: "",
    rainfall: "",
    soilType: "",
    soil_ph: "",
    soilMoisture: "",
    nitrogen: "",
    phosphorus: "",
    potassium: "",
    region: "",
    season: ""
  });

  const [result, setResult] = useState(null);
  const [trainLoading, setTrainLoading] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoData, setGeoData] = useState(null); // banner info
  const [geoError, setGeoError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // ── Auto-fill from GPS ────────────────────────────────────────────────────
  const autoFill = () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      return;
    }
    setGeoLoading(true);
    setGeoError("");
    setGeoData(null);

    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude: lat, longitude: lon } }) => {
        try {
          // Parallel: soil data (our backend) + weather (Open-Meteo)
          const [soilRes, weatherRes] = await Promise.all([
            api.get("/ml/soil-location", { params: { lat, lon } }),
            fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
              `&current=temperature_2m,relative_humidity_2m,rain,precipitation` +
              `&daily=precipitation_sum&forecast_days=7&timezone=auto`
            ).then(r => r.json())
          ]);

          const soil = soilRes.data;
          const curr = weatherRes?.current || {};
          const daily = weatherRes?.daily || {};

          // Total rainfall this week from daily sums
          const weeklyRain = daily?.precipitation_sum
            ? daily.precipitation_sum.reduce((s, v) => s + (v || 0), 0).toFixed(1)
            : null;

          const detectedSeason = detectSeason();

          setForm(prev => ({
            ...prev,
            temperature: curr.temperature_2m != null ? String(curr.temperature_2m) : prev.temperature,
            humidity: curr.relative_humidity_2m != null ? String(curr.relative_humidity_2m) : prev.humidity,
            rainfall: weeklyRain != null ? weeklyRain : prev.rainfall,
            soil_ph: soil.ph != null ? String(soil.ph) : prev.soil_ph,
            soilMoisture: soil.soilMoisture != null ? String(soil.soilMoisture) : prev.soilMoisture,
            nitrogen: soil.nitrogen != null ? String(soil.nitrogen) : prev.nitrogen,
            phosphorus: soil.phosphorus != null ? String(soil.phosphorus) : prev.phosphorus,
            potassium: soil.potassium != null ? String(soil.potassium) : prev.potassium,
            soilType: soil.soilType || prev.soilType,
            season: detectedSeason,
          }));

          setGeoData({
            lat: parseFloat(lat).toFixed(4),
            lon: parseFloat(lon).toFixed(4),
            temp: curr.temperature_2m,
            humidity: curr.relative_humidity_2m,
            rain: weeklyRain,
            ph: soil.ph,
            nitrogen: soil.nitrogen,
            phosphorus: soil.phosphorus,
            potassium: soil.potassium,
            soilMoisture: soil.soilMoisture,
            soilType: soil.soilType,
            season: detectedSeason,
          });
        } catch (err) {
          setGeoError(`Auto-fill failed: ${err.message}`);
        } finally {
          setGeoLoading(false);
        }
      },
      (err) => {
        setGeoLoading(false);
        setGeoError(`Location access denied: ${err.message}`);
      },
      { timeout: 12000 }
    );
  };

  const handlePredict = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        temperature: Number(form.temperature),
        humidity: Number(form.humidity),
        rainfall: Number(form.rainfall),
        soil_ph: form.soil_ph ? Number(form.soil_ph) : undefined,
        soilMoisture: form.soilMoisture ? Number(form.soilMoisture) : undefined,
        nitrogen: form.nitrogen ? Number(form.nitrogen) : undefined,
        phosphorus: form.phosphorus ? Number(form.phosphorus) : undefined,
        potassium: form.potassium ? Number(form.potassium) : undefined,
        soilType: form.soilType || undefined,
        region: form.region || undefined,
        season: form.season || undefined
      };
      const res = await api.post('/ml/predict-crop', payload);
      setResult(res.data.predictedCrop + " 🌾");
    } catch (err) {
      console.error(err);
      setResult("❌ Prediction failed");
    }
  };

  // helper: was this field auto-filled?
  const filled = (key) => geoData && geoData[key] != null;

  const gps = (key) => filled(key)
    ? { borderColor: "#22c55e", paddingRight: "28px" }
    : {};

  return (
    <div className="page">
      <h1 className="page-title">🌱 Crop Recommendation</h1>

      {/* Form Card */}
      <div className="card form-card">
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>Enter Farm Conditions</h3>

          {/* Auto-fill button */}
          <button
            type="button"
            onClick={autoFill}
            disabled={geoLoading}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "linear-gradient(135deg, #22c55e, #16a34a)",
              color: "#fff", border: "none", borderRadius: 8,
              padding: "8px 16px", cursor: "pointer", fontWeight: 600,
              fontSize: 14, boxShadow: "0 2px 8px rgba(34,197,94,0.3)",
              transition: "opacity 0.2s", opacity: geoLoading ? 0.7 : 1,
            }}
          >
            {geoLoading ? "⏳ Fetching data…" : "📍 Auto-fill from My Location"}
          </button>
        </div>

        {/* Auto-fill info banner */}
        {geoData && (
          <div style={{
            background: "linear-gradient(135deg, #f0fdf4, #dcfce7)",
            border: "1px solid #bbf7d0", borderRadius: 10,
            padding: "12px 16px", marginBottom: 16, fontSize: 13,
          }}>
            <div style={{ fontWeight: 700, color: "#15803d", marginBottom: 6 }}>
              📡 Live Data — {geoData.lat}°N, {geoData.lon}°E
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", color: "#166534" }}>
              <span>🌡️ <strong>Temp</strong>: {geoData.temp}°C</span>
              <span>💧 <strong>Humidity</strong>: {geoData.humidity}%</span>
              <span>🌧️ <strong>Rainfall (7d)</strong>: {geoData.rain} mm</span>
              <span>🧪 <strong>pH</strong>: {geoData.ph}</span>
              <span>🌿 <strong>N</strong>: {geoData.nitrogen} mg/kg</span>
              <span>⚗️ <strong>P</strong>: {geoData.phosphorus} mg/kg</span>
              <span>🔋 <strong>K</strong>: {geoData.potassium} mg/kg</span>
              <span>💦 <strong>Soil Moisture</strong>: {geoData.soilMoisture}%</span>
              <span>🏔️ <strong>Soil Type</strong>: {geoData.soilType}</span>
              <span>📅 <strong>Season</strong>: {geoData.season}</span>
            </div>
            <div style={{ marginTop: 6, color: "#6b7280", fontSize: 12 }}>
              ✅ All fields auto-filled. Weather from Open-Meteo · Soil from regional model · Season auto-detected.
            </div>
          </div>
        )}

        {geoError && (
          <p style={{ color: "#ef4444", marginBottom: 12, fontSize: 13 }}>⚠️ {geoError}</p>
        )}

        <form onSubmit={handlePredict} className="form-grid">

          {/* Temperature */}
          <div style={{ position: "relative" }}>
            <input type="number" name="temperature" placeholder="Temperature (°C)"
              value={form.temperature} onChange={handleChange} style={gps("temp")} />
            {filled("temp") && <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "#22c55e", fontSize: 12 }}>📡</span>}
          </div>

          {/* Humidity */}
          <div style={{ position: "relative" }}>
            <input type="number" name="humidity" placeholder="Humidity (%)"
              value={form.humidity} onChange={handleChange} style={gps("humidity")} />
            {filled("humidity") && <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "#22c55e", fontSize: 12 }}>📡</span>}
          </div>

          {/* Rainfall */}
          <div style={{ position: "relative" }}>
            <input type="number" name="rainfall" placeholder="Rainfall (mm)"
              value={form.rainfall} onChange={handleChange} style={gps("rain")} />
            {filled("rain") && <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "#22c55e", fontSize: 12 }}>📡</span>}
          </div>

          {/* Soil Type */}
          <div style={{ position: "relative" }}>
            <select name="soilType" value={form.soilType} onChange={handleChange}
              style={gps("soilType")}>
              <option value="">Select Soil Type</option>
              <option>Clay</option>
              <option>Sandy</option>
              <option>Loamy</option>
              <option>Black</option>
              <option>Red</option>
            </select>
            {filled("soilType") && <span style={{ position: "absolute", right: 24, top: "50%", transform: "translateY(-50%)", color: "#22c55e", fontSize: 12 }}>📡</span>}
          </div>

          {/* Soil pH */}
          <div style={{ position: "relative" }}>
            <input type="number" name="soil_ph" placeholder="Soil pH (e.g. 6.5)"
              value={form.soil_ph} onChange={handleChange} step="0.1" style={gps("ph")} />
            {filled("ph") && <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "#22c55e", fontSize: 12 }}>📡</span>}
          </div>

          {/* Soil Moisture */}
          <div style={{ position: "relative" }}>
            <input type="number" name="soilMoisture" placeholder="Soil Moisture (%)"
              value={form.soilMoisture} onChange={handleChange} style={gps("soilMoisture")} />
            {filled("soilMoisture") && <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "#22c55e", fontSize: 12 }}>📡</span>}
          </div>

          {/* Nitrogen */}
          <div style={{ position: "relative" }}>
            <input type="number" name="nitrogen" placeholder="N (kg/ha)"
              value={form.nitrogen} onChange={handleChange} style={gps("nitrogen")} />
            {filled("nitrogen") && <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "#22c55e", fontSize: 12 }}>📡</span>}
          </div>

          {/* Phosphorus */}
          <div style={{ position: "relative" }}>
            <input type="number" name="phosphorus" placeholder="P (kg/ha)"
              value={form.phosphorus} onChange={handleChange} style={gps("phosphorus")} />
            {filled("phosphorus") && <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "#22c55e", fontSize: 12 }}>📡</span>}
          </div>

          {/* Potassium */}
          <div style={{ position: "relative" }}>
            <input type="number" name="potassium" placeholder="K (kg/ha)"
              value={form.potassium} onChange={handleChange} style={gps("potassium")} />
            {filled("potassium") && <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "#22c55e", fontSize: 12 }}>📡</span>}
          </div>

          {/* Region */}
          <select name="region" value={form.region} onChange={handleChange}>
            <option value="">Region (optional)</option>
            <option>North</option>
            <option>South</option>
            <option>East</option>
            <option>West</option>
            <option>Central</option>
          </select>

          {/* Season */}
          <div style={{ position: "relative" }}>
            <select name="season" value={form.season} onChange={handleChange}
              style={gps("season")}>
              <option value="">Season (optional)</option>
              <option>Kharif</option>
              <option>Rabi</option>
              <option>Zaid</option>
            </select>
            {filled("season") && <span style={{ position: "absolute", right: 24, top: "50%", transform: "translateY(-50%)", color: "#22c55e", fontSize: 12 }}>📡</span>}
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button type="submit" className="primary-btn">
              Predict Crop
            </button>

            {user?.role === 'admin' && (
              <>
                <button type="button" className="btn" disabled={trainLoading} onClick={async () => {
                  setTrainLoading(true);
                  try { await api.post('/ml/train'); alert('Training finished'); } catch (e) { alert('Training failed'); }
                  setTrainLoading(false);
                }}>{trainLoading ? 'Training…' : 'Train model'}</button>

                <button type="button" className="btn" disabled={seedLoading} onClick={async () => {
                  setSeedLoading(true);
                  try { await api.post('/ml/seed-crop'); alert('Seeded crop_samples'); } catch (e) { alert('Seeding failed'); }
                  setSeedLoading(false);
                }}>{seedLoading ? 'Seeding…' : 'Seed crop dataset'}</button>
              </>
            )}
          </div>
        </form>

        <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
          💡 Click <strong>📍 Auto-fill from My Location</strong> to instantly populate all fields using real-time weather and soil data from your GPS location.
        </div>
      </div>

      {/* Result Card */}
      {result && (
        <div className="card result-card">
          <h3>Recommended Crop</h3>
          <p className="result-text">{result}</p>
        </div>
      )}
    </div>
  );
}