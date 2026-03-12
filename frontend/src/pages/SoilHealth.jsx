import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

// SoilGrids property → unit conversion helpers
// nitrogen: returned in cg/kg → convert to mg/kg (*10)
// phh2o: returned in pH*10 → divide by 10
// soc (organic carbon): returned in dg/kg → divide by 10 to get g/kg
// phosphorus: SoilGrids doesn't provide it → leave blank for user to fill
// potassium: SoilGrids doesn't provide extractable K → leave blank

// Fetches real soil data via our backend proxy (which calls SoilGrids server-side)
async function fetchSoilFromLocation(lat, lon) {
  const res = await api.get(`/ml/soil-location`, { params: { lat, lon } });
  return res.data; // { ph, nitrogen, soc, clay, sand, bdod, lat, lon }
}

const SoilHealth = () => {
  const [soil, setSoil] = useState({
    nitrogen: "",
    phosphorus: "",
    potassium: "",
    ph: "",
  });

  const [loading, setLoading] = useState(false);
  const [trainLoading, setTrainLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [modelMetrics, setModelMetrics] = useState(null);
  const [error, setError] = useState("");
  const [geoData, setGeoData] = useState(null); // extra SoilGrids data

  const [soilHistory, setSoilHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLimit, setHistoryLimit] = useState(10);
  const [historyTotal, setHistoryTotal] = useState(0);

  const handleChange = (e) => setSoil({ ...soil, [e.target.name]: e.target.value });

  const { user } = useAuth();

  // ── SoilGrids auto-fill ────────────────────────────────────────────────────
  const autoFillFromLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    setGeoLoading(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        try {
          const data = await fetchSoilFromLocation(lat, lon);
          setGeoData(data);
          setSoil({
            nitrogen: data.nitrogen !== null ? String(data.nitrogen) : "",
            phosphorus: data.phosphorus !== null ? String(data.phosphorus) : "",
            potassium: data.potassium !== null ? String(data.potassium) : "",
            ph: data.ph !== null ? String(data.ph) : "",
          });
          setError("");
        } catch (e) {
          setError(`SoilGrids fetch failed: ${e.message}`);
        } finally {
          setGeoLoading(false);
        }
      },
      (err) => {
        setGeoLoading(false);
        setError(`Location access denied: ${err.message}`);
      },
      { timeout: 10000 }
    );
  };

  // ── Analyze ────────────────────────────────────────────────────────────────
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

      const res = await api.post("/ml/predict-soil", { ...payload, userEmail: user?.email });
      const body = res.data;

      setPrediction({
        label: body.prediction.predictedLabel,
        probability: body.prediction.probability,
      });
      setModelMetrics(body.modelMetrics || null);
      await loadHistory();
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.error || err?.message || "Prediction failed.");
    } finally {
      setLoading(false);
    }
  };

  const trainSoilModel = async () => {
    setError("");
    setTrainLoading(true);
    try {
      const res = await api.post("/ml/train-soil");
      setModelMetrics(res.data.metrics || null);
      await loadHistory();
    } catch (err) {
      setError("Failed to train soil model.");
    } finally {
      setTrainLoading(false);
    }
  };

  const loadHistory = async (page = historyPage, limit = historyLimit) => {
    setHistoryLoading(true);
    try {
      const res = await api.get("/ml/soil-history", { params: { page, limit, email: user?.email } });
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

  useEffect(() => { loadHistory(historyPage, historyLimit); }, [historyPage, historyLimit]);

  // ── UI ─────────────────────────────────────────────────────────────────────
  return (
    <div className="page-container">
      <h1 className="page-title">🌱 Soil Health Analysis</h1>

      {/* FORM CARD */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>Enter Soil Details</h3>

          {/* Auto-fill button */}
          <button
            type="button"
            className="btn"
            onClick={autoFillFromLocation}
            disabled={geoLoading}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "linear-gradient(135deg, #22c55e, #16a34a)",
              color: "#fff", border: "none", borderRadius: 8,
              padding: "8px 16px", cursor: "pointer", fontWeight: 600,
              fontSize: 14, boxShadow: "0 2px 8px rgba(34,197,94,0.3)",
              transition: "opacity 0.2s",
            }}
          >
            {geoLoading ? (
              <>⏳ Fetching soil data…</>
            ) : (
              <>📍 Auto-fill from My Location</>
            )}
          </button>
        </div>

        {/* Location data banner */}
        {geoData && (
          <div style={{
            background: "linear-gradient(135deg, #f0fdf4, #dcfce7)",
            border: "1px solid #bbf7d0", borderRadius: 10,
            padding: "12px 16px", marginBottom: 16, fontSize: 13,
          }}>
            <div style={{ fontWeight: 700, color: "#15803d", marginBottom: 6 }}>
              📡 Live Soil Data — {geoData.lat.toFixed(4)}°N, {geoData.lon.toFixed(4)}°E
            </div>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap", color: "#166534" }}>
              <span>🧪 <strong>pH</strong>: {geoData.ph}</span>
              <span>🌿 <strong>N</strong>: {geoData.nitrogen} mg/kg</span>
              <span>⚗️ <strong>P</strong>: {geoData.phosphorus} mg/kg</span>
              <span>🔋 <strong>K</strong>: {geoData.potassium} mg/kg</span>
              {geoData.soilMoisture !== null && (
                <span>💧 <strong>Soil Moisture</strong>: {geoData.soilMoisture}%</span>
              )}
              {geoData.soilTemperature !== null && (
                <span>🌡️ <strong>Soil Temp</strong>: {geoData.soilTemperature}°C</span>
              )}
            </div>

          </div>
        )}

        <div className="form-grid">
          <div style={{ position: "relative" }}>
            <input
              type="number" name="nitrogen"
              placeholder="Nitrogen — N (mg/kg)"
              value={soil.nitrogen} onChange={handleChange}
              style={geoData?.nitrogen ? { borderColor: "#22c55e" } : {}}
            />
            {geoData?.nitrogen && <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "#22c55e", fontSize: 12 }}>📡</span>}
          </div>

          <input
            type="number" name="phosphorus"
            placeholder="Phosphorus — P (mg/kg)"
            value={soil.phosphorus} onChange={handleChange}
          />

          <input
            type="number" name="potassium"
            placeholder="Potassium — K (mg/kg)"
            value={soil.potassium} onChange={handleChange}
          />

          <div style={{ position: "relative" }}>
            <input
              type="number" name="ph" step="0.1"
              placeholder="pH Level (e.g. 6.5)"
              value={soil.ph} onChange={handleChange}
              style={geoData?.ph ? { borderColor: "#22c55e" } : {}}
            />
            {geoData?.ph && <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "#22c55e", fontSize: 12 }}>📡</span>}
          </div>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="primary-btn" onClick={analyzeSoil} disabled={loading}>
            {loading ? "Analyzing…" : "🔬 Analyze Soil"}
          </button>

          {user?.role === "admin" && (
            <button className="btn" onClick={trainSoilModel} disabled={trainLoading}>
              {trainLoading ? "Training…" : "Train soil model"}
            </button>
          )}
        </div>



        {error && <p className="msg error" style={{ marginTop: 8 }}>{error}</p>}
      </div>

      {/* RESULT CARDS */}
      <div className="dashboard-grid">
        <div className="dashboard-card card-temp">
          <div className="card-title">Nitrogen</div>
          <div className="card-value">{soil.nitrogen || "—"} <span style={{ fontSize: 12 }}>mg/kg</span></div>
        </div>
        <div className="dashboard-card card-humidity">
          <div className="card-title">Phosphorus</div>
          <div className="card-value">{soil.phosphorus || "—"} <span style={{ fontSize: 12 }}>mg/kg</span></div>
        </div>
        <div className="dashboard-card card-rain">
          <div className="card-title">Potassium</div>
          <div className="card-value">{soil.potassium || "—"} <span style={{ fontSize: 12 }}>mg/kg</span></div>
        </div>
        <div className="dashboard-card card-soil">
          <div className="card-title">pH Level</div>
          <div className="card-value">{soil.ph || "—"}</div>
        </div>

        {geoData && (
          <>
            <div className="dashboard-card" style={{ background: "linear-gradient(135deg, #fef3c7, #fde68a)" }}>
              <div className="card-title">🟤 Organic Carbon</div>
              <div className="card-value">{geoData.soc} <span style={{ fontSize: 12 }}>g/kg</span></div>
            </div>
            <div className="dashboard-card" style={{ background: "linear-gradient(135deg, #ede9fe, #ddd6fe)" }}>
              <div className="card-title">🏔️ Clay Content</div>
              <div className="card-value">{geoData.clay}<span style={{ fontSize: 12 }}>%</span></div>
            </div>
          </>
        )}

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
                    <th>N</th><th>P</th><th>K</th><th>pH</th>
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

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
                <div>
                  Showing {Math.min(historyTotal, (historyPage - 1) * historyLimit + 1)} –{" "}
                  {Math.min(historyTotal, historyPage * historyLimit)} of {historyTotal}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setHistoryPage((p) => Math.max(1, p - 1))} disabled={historyPage <= 1}>Prev</button>
                  <span>{historyPage}</span>
                  <button onClick={() => setHistoryPage((p) => p + 1)} disabled={historyPage * historyLimit >= historyTotal}>Next</button>
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
