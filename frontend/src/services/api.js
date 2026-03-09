import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 60000, // 60s — Python ML scripts need time to load the model
});

export default api;