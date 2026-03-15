import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const CROPS = ["rice", "wheat", "maize", "cotton", "sugarcane", "potato", "tomato", "onion", "banana", "chickpea", "mungbean", "jute", "coffee"];
const SOILS = ["loamy", "sandy", "clay", "red", "black"];

const STAGE_COLOR = { "Initial": "#22c55e", "Mid-season": "#f59e0b", "Late": "#f97316", "Harvest": "#6366f1" };

export default function IrrigationScheduler() {
    const { user } = useAuth();
    const [form, setForm] = useState({ location: "", crop: "rice", plantingDate: "", soilType: "loamy", fieldSize: "100" });
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true); setError(""); setResult(null);
        try {
            const params = new URLSearchParams({ ...form });
            const res = await api.get(`/irrigation/schedule?${params}`);
            setResult(res.data);
        } catch (err) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setLoading(false);
        }
    };

    const getMoistureColor = (pct) => {
        if (pct < 35) return "#ef4444";
        if (pct < 55) return "#f59e0b";
        return "#22c55e";
    };

    return (
        <div className="page-container">
            <h1 className="page-title">💧 Irrigation Scheduler</h1>


            {/* Form */}
            <div className="card" style={{ marginBottom: 24 }}>
                <h3 style={{ marginBottom: 16 }}>Farm Details</h3>
                <form onSubmit={handleSubmit}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        <div className="form-group">
                            <label>📍 Location (City)</label>
                            <input type="text" placeholder="e.g. Coimbatore"
                                value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} required />
                        </div>
                        <div className="form-group">
                            <label>🌾 Crop</label>
                            <select value={form.crop} onChange={e => setForm(f => ({ ...f, crop: e.target.value }))}>
                                {CROPS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>📅 Planting Date</label>
                            <input type="date" value={form.plantingDate}
                                onChange={e => setForm(f => ({ ...f, plantingDate: e.target.value }))} />
                        </div>
                        <div className="form-group">
                            <label>🏔️ Soil Type</label>
                            <select value={form.soilType} onChange={e => setForm(f => ({ ...f, soilType: e.target.value }))}>
                                {SOILS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>📏 Field Size (m²)</label>
                            <input type="number" placeholder="e.g. 500"
                                value={form.fieldSize} onChange={e => setForm(f => ({ ...f, fieldSize: e.target.value }))} />
                        </div>
                    </div>
                    {error && <p className="msg error" style={{ marginTop: 8 }}>{error}</p>}
                    <button type="submit" className="primary-btn" disabled={loading} style={{ marginTop: 16 }}>
                        {loading ? "⏳ Calculating schedule…" : "📊 Generate 7-Day Schedule"}
                    </button>
                </form>
            </div>

            {/* Results */}
            {result && (
                <>
                    {/* Summary Cards */}
                    <div className="dashboard-grid" style={{ marginBottom: 24 }}>
                        <div className="dashboard-card card-temp">
                            <div className="card-title">Growth Stage</div>
                            <div className="card-value" style={{ fontSize: 22 }}>
                                {result.currentGrowthStage.emoji} {result.currentGrowthStage.stage}
                            </div>
                            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                                Day {result.daysSincePlanting} · {result.currentGrowthStage.pct}% through stage
                            </div>
                        </div>
                        <div className="dashboard-card card-rain">
                            <div className="card-title">💧 Daily ET Replenishment</div>
                            <div style={{ fontSize: 24, color: "#3b82f6", fontWeight: 700, marginTop: 8 }}>
                                {result.totalETReplenishmentLiters ? result.totalETReplenishmentLiters.toLocaleString() : "0"} <span style={{ fontSize: 14 }}>Liters / 7 days</span>
                            </div>
                            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                                Total water lost to evaporation & transpiration
                            </div>
                        </div>
                        <div className="dashboard-card card-temp">
                            <div className="card-title">🚜 Suggested Irrigation</div>
                            <div className="card-value" style={{ fontSize: 20, color: "#6366f1" }}>
                                {result.suggestedIrrigationType || "Drip Irrigation"}
                            </div>
                            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                                Optimized for {result.soilType} soil & {result.crop}
                            </div>
                        </div>
                        <div className="dashboard-card card-humidity">
                            <div className="card-title">💰 Water Saved vs Flood</div>
                            <div className="card-value" style={{ color: "#22c55e" }}>
                                {result.waterSavedVsFlood} <span style={{ fontSize: 14 }}>mm saved</span>
                            </div>
                            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>vs. traditional flood irrigation</div>
                        </div>
                        <div className="dashboard-card card-soil">
                            <div className="card-title">📍 Location · Soil</div>
                            <div className="card-value" style={{ fontSize: 18 }}>{result.location}</div>
                            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                                {result.soilType} soil · {result.crop}
                            </div>
                        </div>
                    </div>

                    {/* 7-Day Schedule Table */}
                    <div className="card">
                        <h3 style={{ marginBottom: 16 }}>📅 7-Day Irrigation Schedule</h3>
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                                <thead>
                                    <tr style={{ background: "var(--table-header-bg)", borderBottom: "2px solid var(--border-color)" }}>
                                        {["Date", "ET₀", "ETc", "Rainfall", "Moisture", "Daily Requirement (L)", "Method", "Action"].map(h => (
                                            <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: "var(--text-primary)", fontWeight: 600 }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {result.schedule.map((day, i) => (
                                        <tr key={day.date} style={{
                                            background: day.needsIrrigation ? "rgba(239,68,68,0.08)" : "var(--bg-card)",
                                            borderBottom: "1px solid var(--table-border)",
                                        }}>
                                            <td style={{ padding: "10px 12px", fontWeight: 600 }}>{day.date}</td>
                                            <td style={{ padding: "10px 12px" }}>{day.ET0}</td>
                                            <td style={{ padding: "10px 12px" }}>{day.ETc}</td>
                                            <td style={{ padding: "10px 12px", color: "#3b82f6" }}>{day.rainfall} mm</td>
                                            <td style={{ padding: "10px 12px" }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                    <div style={{
                                                        width: 60, height: 8, borderRadius: 4,
                                                        background: "#e5e7eb", overflow: "hidden",
                                                    }}>
                                                        <div style={{
                                                            width: `${day.soilMoisture}%`, height: "100%",
                                                            background: getMoistureColor(day.soilMoisture),
                                                            borderRadius: 4,
                                                        }} />
                                                    </div>
                                                    <span style={{ color: getMoistureColor(day.soilMoisture), fontWeight: 600 }}>
                                                        {day.soilMoisture}%
                                                    </span>
                                                </div>
                                            </td>
                                            <td style={{ padding: "10px 12px", fontWeight: 600, color: "#3b82f6" }}>
                                                {day.dailyReqLiters > 0 ? `${day.dailyReqLiters.toLocaleString()} L` : "0 L"}
                                            </td>
                                            <td style={{ padding: "10px 12px", fontSize: 13, color: "var(--text-muted)" }}>
                                                {day.suggestedMethod}
                                            </td>
                                            <td style={{
                                                padding: "10px 12px", fontWeight: 600,
                                                color: day.needsIrrigation ? "#dc2626" : "#16a34a"
                                            }}>
                                                {day.action}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div style={{ marginTop: 12, fontSize: 12, color: "var(--text-muted)" }}>
                            ET₀ = Reference evapotranspiration · ETc = Crop water demand · Kc = Crop coefficient (FAO-56)
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
