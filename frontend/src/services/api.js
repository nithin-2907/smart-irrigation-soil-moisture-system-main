import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 60000, // 60s — Python ML scripts need time to load the model
});

export default api;