import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

export default function YieldPrediction() {
  const { user } = useAuth();

  const [form, setForm] = useState({
    city: "",
    area: "",
    rainfall: "",
    temperature: "",
    crop: "",
    fertilizer: ""
  });

  const [yieldResult, setYieldResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [trainLoading, setTrainLoading] = useState(false);

  // history
  const [history, setHistory] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [autoFillLoading, setAutoFillLoading] = useState(false);

  // Fallback dictionary for approximate annual rainfall (in mm)
  const ANNUAL_RAINFALL_MAP = {
    "coimbatore": 600,
    "chennai": 1400,
    "bangalore": 900,
    "mumbai": 2200,
    "delhi": 700,
    "kolkata": 1600,
    "pune": 700,
    "hyderabad": 800,
    "ahmedabad": 800,
    "kochi": 3000,
    "jaipur": 600,
    "lucknow": 1000,
    "bhopal": 1100,
    "patna": 1200,
    "trivandrum": 1800,
    "guwahati": 1600,
    "chandigarh": 1000,
    "surat": 1200
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const loadHistory = async (p = page, l = limit) => {
    setHistoryLoading(true);
    try {
      const res = await api.get('/yield/history', { params: { page: p, limit: l, email: user?.email } });
      setHistory(res.data.rows || []);
      setTotal(res.data.total || 0);
      setPage(res.data.page || p);
      setLimit(res.data.limit || l);
    } catch (err) {
      console.error('Failed to load history', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => { loadHistory(); }, [page, limit]);

  const handleAutoFill = async () => {
    if (!form.city) {
      setError("Please enter a City name to auto-fill weather data.");
      return;
    }
    
    setAutoFillLoading(true);
    setError("");

    try {
      // 1. Fetch current live temperature using the existing weather API endpoint
      const res = await api.get('/weather/collect', { params: { city: form.city } });
      const currentTemp = Math.round(res.data.weather.temperature);

      // 2. Fetch approximate annual rainfall from the fallback dictionary
      const normalizedCity = form.city.toLowerCase().trim();
      let annualRainfall = ANNUAL_RAINFALL_MAP[normalizedCity] || "";

      // 3. Update the form
      setForm((prev) => ({
        ...prev,
        temperature: currentTemp,
        // Only update rainfall automatically if we found it in our dictionary
        ...(annualRainfall ? { rainfall: annualRainfall } : {})
      }));

      if (!annualRainfall) {
        alert(`Fetched temperature: ${currentTemp}°C. \nWe don't have historical annual rainfall data for "${form.city}". Please enter the expected seasonal rainfall manually.`);
      }

    } catch (err) {
      console.error(err);
      setError("Could not fetch weather data. Please check the city name or try again later.");
    } finally {
      setAutoFillLoading(false);
    }
  };

  const handlePredict = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setYieldResult(null);

    try {
      const payload = {
        area: Number(form.area),
        rainfall: Number(form.rainfall),
        temperature: Number(form.temperature),
        crop: form.crop,
        fertilizer: Number(form.fertilizer || 0),
        userEmail: user?.email
      };

      const res = await api.post('/yield/predict', payload);
      const val = res.data?.prediction?.predictedYield;
      setYieldResult(val ? `${val.toFixed(2)} Tons / Hectare` : '—');
      await loadHistory(1, limit);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.error || 'Prediction failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <h1 className="page-title">📈 Yield Prediction</h1>

      {/* Form Card */}
      <div className="card form-card">
        <h3>Enter Farm Data</h3>

        {/* Auto-Fill Section */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'center' }}>
          <input
            type="text"
            name="city"
            placeholder="City (e.g. Coimbatore)"
            value={form.city}
            onChange={handleChange}
            style={{ flex: 1, marginBottom: 0 }}
          />
          <button 
            type="button" 
            className="btn" 
            onClick={handleAutoFill} 
            disabled={autoFillLoading}
            style={{ whiteSpace: 'nowrap' }}
          >
            {autoFillLoading ? 'Fetching...' : '☁️ Auto-Fill Weather'}
          </button>
        </div>

        <form onSubmit={handlePredict} className="form-grid">

          <input
            type="number"
            name="area"
            placeholder="Farm Area (Hectares)"
            value={form.area}
            onChange={handleChange}
          />

          <input
            type="number"
            name="rainfall"
            placeholder="Rainfall (mm)"
            value={form.rainfall}
            onChange={handleChange}
          />

          <input
            type="number"
            name="temperature"
            placeholder="Temperature (°C)"
            value={form.temperature}
            onChange={handleChange}
          />

          <input
            type="number"
            name="fertilizer"
            placeholder="Fertilizer (kg/ha)"
            value={form.fertilizer}
            onChange={handleChange}
          />

          <select
            name="crop"
            value={form.crop}
            onChange={handleChange}
          >
            <option value="">Select Crop</option>
            <option>Rice</option>
            <option>Wheat</option>
            <option>Maize</option>
            <option>Sugarcane</option>
            <option>Cotton</option>
          </select>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="primary-btn" disabled={loading}>
              {loading ? 'Predicting…' : 'Predict Yield'}
            </button>

            {user?.role === 'admin' && (
              <button type="button" className="btn" onClick={async () => {
                setTrainLoading(true);
                try { const r = await api.post('/yield/train'); alert('Training finished'); } catch (e) { alert('Training failed'); }
                setTrainLoading(false);
              }} disabled={trainLoading}>
                {trainLoading ? 'Training…' : 'Train model'}
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Result */}
      {yieldResult && (
        <div className="card result-card">
          <h3>Estimated Yield</h3>
          <p className="result-text">{yieldResult}</p>
        </div>
      )}

      {/* History */}
      <div className="card" style={{ marginTop: 16 }}>
        <h3>Yield Predictions History</h3>
        {historyLoading ? (
          <div>Loading…</div>
        ) : history.length === 0 ? (
          <div>No history found.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>When</th>
                <th>Crop</th>
                <th>Area</th>
                <th>Rainfall</th>
                <th>Temp</th>
                <th>Fertilizer</th>
                <th>Predicted (t/ha)</th>
              </tr>
            </thead>
            <tbody>
              {history.map((r) => (
                <tr key={r._id}>
                  <td>{new Date(r.createdAt).toLocaleString()}</td>
                  <td>{r.crop}</td>
                  <td>{r.area}</td>
                  <td>{r.rainfall}</td>
                  <td>{r.temperature}</td>
                  <td>{r.fertilizer}</td>
                  <td>{r.predictedYield?.toFixed(2) ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
          <div>Showing {Math.min(total, (page - 1) * limit + 1)} - {Math.min(total, page * limit)} of {total}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Prev</button>
            <span>{page}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page * limit >= total}>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}