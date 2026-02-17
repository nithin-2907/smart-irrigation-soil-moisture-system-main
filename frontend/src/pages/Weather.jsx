import { useState } from "react";
import api from "../services/api";

export default function Weather() {

  const [city, setCity] = useState("");
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const computeIrrigation = (w) => {
    // simple rules — tweak as needed:
    if (!w) return "Unknown";
    if ((w.rainfall || 0) > 0) return "Not Required 💧 (recent rain)";
    if (w.soilMoisture !== undefined && w.soilMoisture >= 40) return "Not Required 💧";
    if ((w.temperature || 0) >= 35 && (w.humidity || 0) <= 40) return "Irrigation Required 🚿";
    return "Optional — monitor soil moisture";
  };

  const useMockWeather = () => {
    const mock = {
      temperature: 29.6,
      humidity: 62,
      rainfall: 0,
      soilMoisture: 55,
      irrigation: "Not Required 💧",
      // demo prediction fields for the mock
      predictedRainfall: 8.5,
      irrigationSuggestion: { required: false, reason: 'Light rain expected' },
      predictionSource: 'demo-model',
      weatherProvider: 'OpenWeather'
    };
    setWeather(mock);
  };

  const handleFetch = async (e) => {
    e && e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const params = { city: city || 'Coimbatore' };
      const res = await api.get('/weather/collect', { params });
      const w = res.data.weather;

      const uiWeather = {
        temperature: Number(w.temperature?.toFixed ? w.temperature : w.temperature),
        humidity: Math.round(w.humidity),
        rainfall: w.rainfall || 0,
        soilMoisture: w.soilMoisture,
        irrigation: computeIrrigation(w),
        weatherProvider: res.data.provider || 'OpenWeather'
      };

      setWeather(uiWeather);

      // fetch ML prediction (predicted rainfall + irrigation suggestion)
      try {
        const predRes = await api.get('/weather/predict', { params });
        const p = predRes.data || {};
        const predicted = typeof p.predictedRainfall_mm === 'number'
          ? Math.round(p.predictedRainfall_mm * 100) / 100
          : p.predictedRainfall_mm;

        setWeather(prev => ({
          ...prev,
          predictedRainfall: predicted,
          irrigationSuggestion: p.irrigation,
          predictionSource: p.predictionSource || 'Local ML (rainfall_model.pkl)',
          modelMetrics: p.modelMetrics || null
        }));
      } catch (predErr) {
        // prediction not available (model not trained or error) — surface minimal feedback
        console.warn('Prediction error', predErr?.response?.data || predErr?.message);
        setWeather(prev => ({ ...prev, predictedRainfall: null, irrigationSuggestion: null, predictionSource: null }));
        const msg = predErr?.response?.data?.error || predErr?.message || '';
        if (msg.toLowerCase().includes('model') || msg.toLowerCase().includes('not available')) {
          setError('Rainfall model not trained — run POST /api/ml/train-rainfall to enable ML predictions.');
        }
      }

    } catch (err) {
      console.error(err);
      // helpful error when OPENWEATHER_API_KEY is missing or unauthorized
      const status = err?.response?.status || 0;
      if (status === 401 || (err?.response?.data?.error && err.response.data.error.includes('401'))) {
        setError('OpenWeather API key is missing or invalid. Add OPENWEATHER_API_KEY to backend/.env');
      } else {
        setError('Could not fetch weather from backend. Using mock data instead.');
        useMockWeather();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">

      <h1 className="page-title">🌦️ Weather & Irrigation</h1>

      {/* SEARCH FORM */}
      <div className="form-card" style={{ maxWidth: "500px", marginBottom: "30px" }}>

        <form onSubmit={handleFetch}>

          <div className="form-group">
            <label>Enter City</label>
            <input
              type="text"
              placeholder="e.g Coimbatore (leave empty for default)"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Getting…' : 'Get Weather'}
          </button>

          <button type="button" className="btn" onClick={useMockWeather} style={{ marginLeft: 12 }}>
            Use sample data
          </button>

          {error && <p className="msg error" style={{ marginTop: 12 }}>{error}</p>}

        </form>

      </div>

      {/* WEATHER CARDS */}
      {weather && (
        <div className="dashboard-grid">

          <div className="dashboard-card card-temp">
            <div className="card-title">🌡 Temperature</div>
            <div className="card-value">{weather.temperature} °C</div>
          </div>

          <div className="dashboard-card card-humidity">
            <div className="card-title">💧 Humidity</div>
            <div className="card-value">{weather.humidity} %</div>
          </div>

          <div className="dashboard-card card-rain">
            <div className="card-title">🌧 Observed Rainfall</div>
            <div className="card-value">{weather.rainfall} mm</div>
            <div className="card-sub">Provider: {weather.weatherProvider || 'OpenWeather'}</div>
          </div>

          <div className="dashboard-card card-soil">
            <div className="card-title">🚿 Irrigation Status</div>
            <div className="card-value">{weather.irrigation}</div>
          </div>

          <div className="dashboard-card card-pred-rain">
            <div className="card-title">🔮 Predicted Rainfall</div>
            <div className="card-value">
              {weather.predictedRainfall !== undefined && weather.predictedRainfall !== null
                ? `${weather.predictedRainfall} mm`
                : '—'}
            </div>
            <div className="card-sub">Source: {weather.predictionSource || 'Local ML model'}</div>
            {weather.modelMetrics && (
              <div className="card-sub">
                Model RMSE: {Math.round(weather.modelMetrics.rmse * 100) / 100} mm · R²: {Math.round((weather.modelMetrics.r2 ?? 0) * 100) / 100}
              </div>
            )}
          </div>

          <div className="dashboard-card card-irrigation-pred">
            <div className="card-title">💡 ML Irrigation Suggestion</div>
            <div className="card-value">
              {weather.irrigationSuggestion
                ? (weather.irrigationSuggestion.required ? 'Irrigation Recommended' : 'No irrigation required')
                : '—'}
            </div>
            <div className="card-sub">
              {weather.irrigationSuggestion ? `${weather.irrigationSuggestion.reason}${weather.irrigationSuggestion.suggested_mm ? ` · ${weather.irrigationSuggestion.suggested_mm} mm suggested` : ''}` : ''}
            </div>
            <div className="card-sub">Provider: ML model</div>
          </div>

          <div style={{ gridColumn: '1 / -1', fontSize: 12, color: '#666', marginTop: 12 }}>
            Data provider: {weather.weatherProvider || 'OpenWeather API'} · Prediction source: {weather.predictionSource || 'Local ML model'}
          </div>

        </div>
      )}

    </div>
  );
}