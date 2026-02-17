/* eslint-disable no-unused-vars */
import { useState } from "react";
import api from "../services/api";

export default function CropForm() {
  const [soilType, setSoilType] = useState("");
  const [rainfall, setRainfall] = useState("");
  const [temperature, setTemperature] = useState("");
  const [humidity, setHumidity] = useState("");
  const [result, setResult] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      soilType,
      rainfall: Number(rainfall),
      temperature: Number(temperature),
      humidity: Number(humidity)
    };

    try {
      const res = await api.post('/ml/predict-crop', {
        temperature: payload.temperature,
        humidity: payload.humidity,
        rainfall: payload.rainfall
      });

      setResult(res.data.predictedCrop);
    } catch (err) {
      alert("Server error");
    }
  };

  return (
    <div className="form-box">
      <h3>Crop Recommendation</h3>

      <form onSubmit={handleSubmit}>
        <select
          value={soilType}
          onChange={(e) => setSoilType(e.target.value)}
          required
        >
          <option value="">Select Soil Type</option>
          <option value="loamy">Loamy</option>
          <option value="sandy">Sandy</option>
          <option value="clay">Clay</option>
        </select>

        <input
          type="number"
          placeholder="Rainfall (mm)"
          value={rainfall}
          onChange={(e) => setRainfall(e.target.value)}
          required
        />

        <input
          type="number"
          placeholder="Humidity (%)"
          value={humidity}
          onChange={(e) => setHumidity(e.target.value)}
          required
        />

        <input
          type="number"
          placeholder="Temperature (°C)"
          value={temperature}
          onChange={(e) => setTemperature(e.target.value)}
          required
        />

        <button type="submit">Predict Crop</button>
      </form>

      {result && (
        <div className="result-box">
          🌱 Recommended Crop: <strong>{result}</strong>
        </div>
      )}
    </div>
  );
}
