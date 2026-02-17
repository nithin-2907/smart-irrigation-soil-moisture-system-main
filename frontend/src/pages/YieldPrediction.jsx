import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

export default function YieldPrediction() {
  const { user } = useAuth();

  const [form, setForm] = useState({
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

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const loadHistory = async (p = page, l = limit) => {
    setHistoryLoading(true);
    try {
      const res = await api.get('/yield/history', { params: { page: p, limit: l } });
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
        fertilizer: Number(form.fertilizer || 0)
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

            {user?.role === 'admin' ? (
              <button type="button" className="btn" onClick={async () => {
                setTrainLoading(true);
                try { const r = await api.post('/yield/train'); alert('Training finished'); } catch(e) { alert('Training failed'); }
                setTrainLoading(false);
              }} disabled={trainLoading}>
                {trainLoading ? 'Training…' : 'Train model'}
              </button>
            ) : (
              <button type="button" className="btn" disabled title="Admin only">Train (admin)</button>
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