import { useEffect, useState } from 'react';
import { Area, AreaChart, Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const city = user?.location;
        const [statsRes, historyRes] = await Promise.all([
          api.get('/dashboard/stats', { params: { city } }),
          api.get('/dashboard/history', { params: { city } })
        ]);
        setStats(statsRes.data);
        setHistory(historyRes.data);
      } catch (err) {
        console.error("Dashboard Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.location]);

  const name = user?.name || "Farmer";

  if (loading) return <div className="page-container" style={{ color: "var(--text-secondary)" }}>Loading Dashboard...</div>;

  const kpiCards = [
    { title: "Avg Soil Moisture", value: stats?.avgMoisture ? `${stats.avgMoisture}%` : "--", icon: "🌱", color: "#22c55e", sub: "7-day avg" },
    { title: "Total Rainfall", value: stats?.totalRain ? `${stats.totalRain} mm` : "0 mm", icon: "🌧", color: "#3b82f6", sub: "This week" },
    { title: "Avg Temperature", value: stats?.avgTemp ? `${stats.avgTemp} °C` : "--", icon: "🌡", color: "#f97316", sub: "" },
    { title: "Crop Stress", value: stats?.cropStress || "Unknown", icon: "🩺", color: stats?.cropStress === 'High' ? "#ef4444" : "#22c55e", sub: "" }
  ];

  return (
    <div className="page-container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: '20px' }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: '5px' }}>📊 Farm Command Center</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Welcome, <b>{name}</b></p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="user-badge" style={{ float: 'none', display: 'inline-block' }}>{new Date().toLocaleDateString()}</div>
        </div>
      </div>

      {/* KPI SECTION */}
      <div className="card-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", marginBottom: "30px" }}>
        {kpiCards.map((card, index) => (
          <div key={index} className="dashboard-card" style={{ borderLeft: `4px solid ${card.color}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div className="card-title">{card.icon} {card.title}</div>
                <div className="card-value">{card.value}</div>
                {card.sub && <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>{card.sub}</div>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '24px', marginBottom: '24px' }}>

        {/* CHART 1: Soil Moisture Trend */}
        <div className="dashboard-card">
          <h3 style={{ marginBottom: "20px", fontWeight: "600", color: "var(--text-primary)" }}>🌱 Soil Moisture Trend (Last 14 Days)</h3>
          <div style={{ height: "300px", width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="colorMoisture" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" />
                <YAxis unit="%" />
                <Tooltip />
                <Area type="monotone" dataKey="moisture" stroke="#22c55e" fillOpacity={1} fill="url(#colorMoisture)" name="Soil Moisture" connectNulls={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: Weather Overview */}
        <div className="dashboard-card">
          <h3 style={{ marginBottom: "20px", fontWeight: "600", color: "var(--text-primary)" }}>🌦 Weather vs Moisture Impact</h3>
          <div style={{ height: "300px", width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={history}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" unit="mm" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="right" dataKey="rainfall" barSize={20} fill="#3b82f6" name="Rainfall (mm)" />
                <Line yAxisId="left" type="monotone" dataKey="temperature" stroke="#f97316" name="Temp (°C)" connectNulls={false} />
                <Line yAxisId="left" type="monotone" dataKey="moisture" stroke="#22c55e" strokeWidth={2} dot={false} name="Moisture (%)" connectNulls={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* INSIGHTS & ALERTS ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>

        {/* Weekly Insights */}
        <div className="dashboard-card">
          <h3 style={{ marginBottom: "15px", fontWeight: "600", color: "var(--text-primary)" }}>📅 Weekly Insights</h3>
          {history.length > 0 ? (
            <ul style={{ paddingLeft: "20px", lineHeight: "1.8", color: "var(--text-secondary)" }}>
              <li>Avg Soil Moisture is <b>{stats?.avgMoisture}%</b>.</li>
              <li>Total Rainfall recorded: <b>{stats?.totalRain} mm</b>.</li>
              <li>Highest Temperature: <b>{Math.max(...history.map(h => h.temperature || 0))}°C</b>.</li>
              <li>Data points analyzed: <b>{stats?.dataPoints}</b>.</li>
            </ul>
          ) : (
            <p style={{ color: "var(--text-muted)" }}>Not enough data for insights yet.</p>
          )}
        </div>

        {/* Actionable Alerts */}
        <div className="dashboard-card" style={{
          background: stats?.cropStress === 'High' ? 'rgba(254, 202, 202, 0.15)' : 'rgba(34, 197, 94, 0.08)',
          border: '1px solid ' + (stats?.cropStress === 'High' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.2)')
        }}>
          <h3 style={{ marginBottom: "15px", fontWeight: "600", color: stats?.cropStress === 'High' ? "#ef4444" : "#16a34a" }}>
            {stats?.cropStress === 'High' ? '🚨 Action Required' : '✅ Farm Status Healthy'}
          </h3>
          <p style={{ fontSize: "15px", marginBottom: "10px", color: "var(--text-secondary)" }}>
            {stats?.cropStress === 'High'
              ? "Soil moisture is critically low. Irrigate immediately."
              : "Moisture levels are healthy. No action needed."}
          </p>
          {stats?.cropStress === 'High' && (
            <button className="primary-btn" style={{ background: "#ef4444", marginTop: "10px" }}>View Irrigation Plan</button>
          )}
        </div>

      </div>

    </div>
  );
}