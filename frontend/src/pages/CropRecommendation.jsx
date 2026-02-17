import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

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

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
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
      const predicted = res.data.predictedCrop;
      setResult(predicted + " 🌾");
    } catch (err) {
      console.error(err);
      setResult("❌ Prediction failed");
    }
  };

  return (
    <div className="page">
      <h1 className="page-title">🌱 Crop Recommendation</h1>

      {/* Form Card */}
      <div className="card form-card">
        <h3>Enter Farm Conditions</h3>

        <form onSubmit={handlePredict} className="form-grid">
          <input
            type="number"
            name="temperature"
            placeholder="Temperature (°C)"
            value={form.temperature}
            onChange={handleChange}
          />

          <input
            type="number"
            name="humidity"
            placeholder="Humidity (%)"
            value={form.humidity}
            onChange={handleChange}
          />

          <input
            type="number"
            name="rainfall"
            placeholder="Rainfall (mm)"
            value={form.rainfall}
            onChange={handleChange}
          />

          <select
            name="soilType"
            value={form.soilType}
            onChange={handleChange}
          >
            <option value="">Select Soil Type</option>
            <option>Clay</option>
            <option>Sandy</option>
            <option>Loamy</option>
            <option>Black</option>
            <option>Red</option>
          </select>

          <input
            type="number"
            name="soil_ph"
            placeholder="Soil pH (e.g. 6.5)"
            value={form.soil_ph}
            onChange={handleChange}
            step="0.1"
          />

          <input
            type="number"
            name="soilMoisture"
            placeholder="Soil Moisture (%)"
            value={form.soilMoisture}
            onChange={handleChange}
          />

          <input
            type="number"
            name="nitrogen"
            placeholder="N (kg/ha)"
            value={form.nitrogen}
            onChange={handleChange}
          />

          <input
            type="number"
            name="phosphorus"
            placeholder="P (kg/ha)"
            value={form.phosphorus}
            onChange={handleChange}
          />

          <input
            type="number"
            name="potassium"
            placeholder="K (kg/ha)"
            value={form.potassium}
            onChange={handleChange}
          />

          <input
            type="text"
            name="region"
            placeholder="Region/Zone (optional)"
            value={form.region}
            onChange={handleChange}
          />

          <select name="season" value={form.season} onChange={handleChange}>
            <option value="">Season (optional)</option>
            <option>Kharif</option>
            <option>Rabi</option>
            <option>Zaid</option>
          </select>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="primary-btn">
              Predict Crop
            </button>

            {user?.role === 'admin' ? (
              <>
                <button type="button" className="btn" disabled={trainLoading} onClick={async () => {
                  setTrainLoading(true);
                  try { await api.post('/ml/train'); alert('Training finished'); } catch(e) { alert('Training failed'); }
                  setTrainLoading(false);
                }}>{trainLoading ? 'Training…' : 'Train model'}</button>

                <button type="button" className="btn" disabled={seedLoading} onClick={async () => {
                  setSeedLoading(true);
                  try { await api.post('/ml/seed-crop'); alert('Seeded crop_samples'); } catch(e) { alert('Seeding failed'); }
                  setSeedLoading(false);
                }}>{seedLoading ? 'Seeding…' : 'Seed crop dataset'}</button>
              </>
            ) : (
              <button type="button" className="btn" disabled title="Admin only">Train / Seed (admin)</button>
            )}
          </div>
        </form>
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