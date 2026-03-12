import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
const API = `${API_BASE}/api/crop`;

export const predictCrop = async (formData) => {
  const res = await axios.post(`${API}/predict`, formData);
  return res.data;
};

// ML-backed prediction (uses backend Python model)
export const predictCropML = async ({ temperature, humidity, rainfall }) => {
  const res = await axios.post(`${API_BASE}/api/ml/predict-crop`, {
    temperature,
    humidity,
    rainfall
  });
  return res.data;
};

export const getHistory = async () => {
  const res = await axios.get(`${API}/history`);
  return res.data;
};
