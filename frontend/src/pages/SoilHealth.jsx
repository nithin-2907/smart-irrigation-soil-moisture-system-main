import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const SoilHealth = () => {
  const [soil, setSoil] = useState({
    nitrogen: "",
    phosphorus: "",
    potassium: "",
    ph: "",
  });

  const [loading, setLoading] = useState(false);
  const [trainLoading, setTrainLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [modelMetrics, setModelMetrics] = useState(null);
  const [error, setError] = useState("");

  // history
  const [soilHistory, setSoilHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLimit, setHistoryLimit] = useState(10);
  const [historyTotal, setHistoryTotal] = useState(0);

  const handleChange = (e) => {
    setSoil({ ...soil, [e.target.name]: e.target.value });
  };

  const { user } = useAuth();

  const analyzeSoil = async (e) => {
    e && e.preventDefault();
    setError("");
    setLoading(true);
    setPrediction(null);

    try {
      const payload = {
        nitrogen: Number(soil.nitrogen),
        phosphorus: Number(soil.phosphorus),
        potassium: Number(soil.potassium),
        ph: Number(soil.ph),
      };

      const res = await api.post("/ml/predict-soil", payload);
      const body = res.data;

      setPrediction({
        label: body.prediction.predictedLabel,
        probability: body.prediction.probability,
      });

      setModelMetrics(body.modelMetrics || null);

      await loadHistory();
    } catch (err) {
      console.error(err);
      const serverMsg = err?.response?.data?.error || err?.message || '';
      setError(serverMsg || 'Prediction failed. The model is trained on the server and will be created automatically if missing.');
    } finally {
      setLoading(false);
    }
  };

  const trainSoilModel = async () => {
    setError("");
    setTrainLoading(true);

    try {
      const res = await api.post("/ml/train-soil");
      const metrics = res.data.metrics || null;
      setModelMetrics(metrics);
      await loadHistory();
    } catch (err) {
      console.error(err);
      setError("Failed to train soil model. Check backend logs.");
    } finally {
      setTrainLoading(false);
    }
  };

  const loadHistory = async (page = historyPage, limit = historyLimit) => {
    setHistoryLoading(true);

    try {
      const res = await api.get("/ml/soil-history", {
        params: { page, limit },
      });

      const body = res.data || {};
      setSoilHistory(body.rows || []);
      setHistoryTotal(body.total || 0);
      setHistoryPage(body.page || page);
      setHistoryLimit(body.limit || limit);
    } catch (err) {
      console.error("Failed to load soil history", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadHistory(historyPage, historyLimit);
  }, [historyPage, historyLimit]);

  return (
    <div className="page-container">
      <h1 className="page-title">🌱 Soil Health Analysis</h1>

      {/* FORM */}
      <div className="card">
        <h3>Enter Soil Details</h3>

        <div className="form-grid">
          <input type="number" name="nitrogen" placeholder="Nitrogen (N)" value={soil.nitrogen} onChange={handleChange} />
          <input type="number" name="phosphorus" placeholder="Phosphorus (P)" value={soil.phosphorus} onChange={handleChange} />
          <input type="number" name="potassium" placeholder="Potassium (K)" value={soil.potassium} onChange={handleChange} />
          <input type="number" name="ph" placeholder="pH Level" value={soil.ph} onChange={handleChange} />
        </div>

        <div style={{ marginTop: 12 }}>
          <button className="primary-btn" onClick={analyzeSoil} disabled={loading}>
            {loading ? "Analyzing…" : "Analyze Soil"}
          </button>

          {user?.role === 'admin' ? (
            <button className="btn" onClick={trainSoilModel} disabled={trainLoading} style={{ marginLeft: 12 }}>
              {trainLoading ? "Training…" : "Train soil model"}
            </button>
          ) : (
            <button className="btn" disabled style={{ marginLeft: 12, opacity: 0.6 }} title="Manual training is restricted to admin users">
              Train (admin only)
            </button>
          )}
        </div>

        <div style={{ marginTop: 8, fontSize: 12, color: '#555' }}>
          Model training runs on the server automatically if missing — farmers only need to enter values and click <strong>Analyze Soil</strong>.
        </div>

        {error && <p className="msg error">{error}</p>}
      </div>

      {/* RESULTS */}
      <div className="dashboard-grid">
        <div className="dashboard-card card-temp">
          <div className="card-title">Nitrogen</div>
          <div className="card-value">{soil.nitrogen || "--"} mg/kg</div>
        </div>

        <div className="dashboard-card card-humidity">
          <div className="card-title">Phosphorus</div>
          <div className="card-value">{soil.phosphorus || "--"} mg/kg</div>
        </div>

        <div className="dashboard-card card-rain">
          <div className="card-title">Potassium</div>
          <div className="card-value">{soil.potassium || "--"} mg/kg</div>
        </div>

        <div className="dashboard-card card-soil">
          <div className="card-title">pH Level</div>
          <div className="card-value">{soil.ph || "--"}</div>
        </div>

        <div className="dashboard-card card-pred-rain">
          <div className="card-title">🔬 Soil Health (ML)</div>
          <div className="card-value">{prediction ? prediction.label : "—"}</div>
          <div className="card-sub">
            {prediction?.probability
              ? `Confidence: ${Math.round(prediction.probability * 100)}%`
              : ""}
          </div>
        </div>
      </div>

      {/* HISTORY */}
      <div className="card" style={{ marginTop: 20 }}>
        <h3>🕘 Soil Predictions History</h3>

        <div style={{ overflowX: "auto", marginTop: 12 }}>
          {soilHistory.length === 0 ? (
            <div>{historyLoading ? "Loading history…" : "No soil predictions found."}</div>
          ) : (
            <>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th>When</th>
                    <th>N</th>
                    <th>P</th>
                    <th>K</th>
                    <th>pH</th>
                    <th>Prediction</th>
                    <th>Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {soilHistory.map((r) => (
                    <tr key={r._id}>
                      <td>{new Date(r.createdAt).toLocaleString()}</td>
                      <td>{r.nitrogen}</td>
                      <td>{r.phosphorus}</td>
                      <td>{r.potassium}</td>
                      <td>{r.ph}</td>
                      <td>{r.predictedLabel}</td>
                      <td>{r.probability ? `${Math.round(r.probability * 100)}%` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
                <div>
                  Showing{" "}
                  {Math.min(historyTotal, (historyPage - 1) * historyLimit + 1)} -{" "}
                  {Math.min(historyTotal, historyPage * historyLimit)} of{" "}
                  {historyTotal}
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setHistoryPage((p) => Math.max(1, p - 1))} disabled={historyPage <= 1}>
                    Prev
                  </button>

                  <span>{historyPage}</span>

                  <button onClick={() => setHistoryPage((p) => p + 1)} disabled={historyPage * historyLimit >= historyTotal}>
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SoilHealth;
