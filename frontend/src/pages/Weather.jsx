import { useState } from "react";
import api from "../services/api";

export default function Weather() {
  const [city, setCity] = useState("");
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Helper: Get Recommendation based on Rain & Soil
  const getIrrigationRecommendation = (predictedRain, soilMoisture) => {
    // 1. If heavy rain is coming, don't irrigate regardless of soil
    if (predictedRain > 10) {
      return {
        status: "Wait for Rain 🌧️",
        color: "#eab308", // Yellow/Orange (Caution)
        reason: `Heavy rain (${predictedRain}mm) expected. Save water.`
      };
    }

    // 2. If soil is wet, don't irrigate
    if (soilMoisture > 60) {
      return {
        status: "No Irrigation Needed 💧",
        color: "#22c55e", // Green
        reason: "Soil moisture is sufficient."
      };
    }

    // 3. If soil is moderate
    if (soilMoisture >= 30 && soilMoisture <= 60) {
      return {
        status: "Monitor Soil 👁️",
        color: "#3b82f6", // Blue
        reason: "Moisture levels are okay for now."
      };
    }

    // 4. If soil is dry AND little/no rain expected
    return {
      status: "Irrigation Required 🚿",
      color: "#ef4444", // Red
      reason: "Soil is dry and no significant rain expected."
    };
  };

  const getSoilStatus = (moisture) => {
    if (moisture > 60) return { label: "Wet / Sufficient", color: "#22c55e" };
    if (moisture >= 30) return { label: "Moderate", color: "#eab308" };
    return { label: "Dry", color: "#ef4444" };
  };

  const handleFetch = async (e) => {
    e && e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const params = { city: city || 'Coimbatore' };

      // 1. Collect Weather Data
      const res = await api.get('/weather/collect', { params });
      const w = res.data.weather;

      // 2. Get Prediction
      let predictedRain = 0;
      try {
        const predRes = await api.get('/weather/predict', { params });
        const p = predRes.data || {};
        predictedRain = typeof p.predictedRainfall_mm === 'number'
          ? Math.round(p.predictedRainfall_mm * 10) / 10
          : 0;
      } catch (err) {
        console.warn("Prediction not available, defaulting to 0");
      }

      // 3. Construct UI Object
      const soilMoisture = w.soilMoisture;
      const irrigation = getIrrigationRecommendation(predictedRain, soilMoisture);
      const soilStatus = getSoilStatus(soilMoisture);

      setWeather({
        temperature: Math.round(w.temperature),
        humidity: Math.round(w.humidity),
        rainfall: w.rainfall || 0,
        windSpeed: w.windSpeed || 0, // NEW
        pressure: w.pressure || 0,   // NEW
        predictedRain: predictedRain,
        soilMoisture: soilMoisture,
        soilStatus: soilStatus,
        irrigation: irrigation
      });

    } catch (err) {
      console.error(err);
      setError("Could not fetch weather data. Please check your connection or API key.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <h1 className="page-title">🌦️ Weather & Irrigation Dashboard</h1>

      {/* SECTION 1: INPUT */}
      <div className="form-card" style={{ maxWidth: "600px", marginBottom: "30px" }}>
        <form onSubmit={handleFetch} style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            placeholder="Enter City (e.g. Coimbatore)"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit" className="primary-btn" disabled={loading}>
            {loading ? 'Loading...' : 'Get Weather'}
          </button>
        </form>
        {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
      </div>

      {weather && (
        <>
          {/* SECTION 2: WEATHER METRICS */}
          <div className="card-grid" style={{ marginBottom: '30px' }}>

            {/* Temperature */}
            <div className="dashboard-card" style={{ borderLeft: '5px solid #ff4d4d' }}>
              <div className="card-title">🌡️ Temperature</div>
              <div className="card-value">{weather.temperature}°C</div>
            </div>

            {/* Humidity */}
            <div className="dashboard-card" style={{ borderLeft: '5px solid #3b82f6' }}>
              <div className="card-title">💧 Humidity</div>
              <div className="card-value">{weather.humidity}%</div>
            </div>

            {/* Wind Speed (NEW) */}
            <div className="dashboard-card" style={{ borderLeft: '5px solid #0ea5e9' }}>
              <div className="card-title">🍃 Wind Speed</div>
              <div className="card-value">{weather.windSpeed} m/s</div>
            </div>

            {/* Pressure (NEW) */}
            <div className="dashboard-card" style={{ borderLeft: '5px solid #64748b' }}>
              <div className="card-title">⏲️ Pressure</div>
              <div className="card-value">{weather.pressure} hPa</div>
            </div>

            {/* Rainfall Today */}
            <div className="dashboard-card" style={{ borderLeft: '5px solid #8b5cf6' }}>
              <div className="card-title">🌧️ Rainfall Today</div>
              <div className="card-value">{weather.rainfall} mm</div>
            </div>

            {/* Predicted Rainfall */}
            <div className="dashboard-card" style={{ borderLeft: '5px solid #a855f7' }}>
              <div className="card-title">🔮 Predicted Rainfall</div>
              <div className="card-value">{weather.predictedRain} mm</div>
              <div style={{ fontSize: '12px', color: '#666' }}>Expected tomorrow</div>
            </div>

          </div>

          {/* SECTION 3: SOIL & IRRIGATION HIGHLIGHTS */}
          <div className="card-grid">

            {/* Soil Moisture */}
            <div className="dashboard-card" style={{ borderLeft: `5px solid ${weather.soilStatus?.color || '#ccc'}` }}>
              <div className="card-title">🌱 Soil Moisture Level</div>
              <div className="card-value">{weather.soilMoisture}%</div>
              <div style={{
                marginTop: '5px',
                fontWeight: '600',
                color: weather.soilStatus?.color || '#ccc'
              }}>
                {weather.soilStatus?.label || 'Unknown'}
              </div>
            </div>

            {/* Irrigation Recommendation */}
            <div className="dashboard-card" style={{ borderLeft: `5px solid ${weather.irrigation?.color || '#ccc'}`, backgroundColor: '#fdfdfd' }}>
              <div className="card-title">🚿 Irrigation Recommendation</div>
              <div className="card-value" style={{ color: weather.irrigation?.color || '#ccc' }}>
                {weather.irrigation?.status || 'Unknown'}
              </div>
              <div style={{ fontSize: '13px', color: '#666', marginTop: '5px' }}>
                {weather.irrigation?.reason || 'Based on available data'}
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}