import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: "", phone: "", location: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user?.email) return;
    api.get(`/profile?email=${encodeURIComponent(user.email)}`)
      .then(r => setForm({ name: r.data.name || user.name || "", phone: r.data.phone || "", location: r.data.location || "" }))
      .catch(() => setForm({ name: user.name || "", phone: "", location: "" }));
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put("/profile", { email: user.email, ...form });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      alert("Save failed: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => { logout(); navigate("/login"); };

  if (!user) return <div className="page-container"><h2>Please login</h2></div>;

  return (
    <div className="page-container">
      <h1 className="page-title">👤 User Profile</h1>

      <div className="profile-card">
        {/* Avatar */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{
            width: 90, height: 90, borderRadius: "50%",
            background: "linear-gradient(135deg, #22c55e, #16a34a)",
            color: "#fff", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 32, fontWeight: "bold", margin: "auto",
          }}>
            {(form.name || user.name || "?").charAt(0).toUpperCase()}
          </div>
        </div>

        {/* Email (read-only) */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontWeight: 600, fontSize: 13, color: "#6b7280" }}>EMAIL</label>
          <p style={{ marginTop: 4 }}>{user.email}</p>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontWeight: 600, fontSize: 13, color: "#6b7280" }}>ROLE</label>
          <p style={{ marginTop: 4 }}>{user.role || "farmer"}</p>
        </div>

        <hr style={{ margin: "20px 0", borderColor: "#e5e7eb" }} />
        <div style={{ marginBottom: 8, fontWeight: 700, color: "#15803d" }}>
          🌾 Alert Settings
        </div>
        <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
          Set your phone number and farm location to receive automated SMS irrigation alerts.
        </div>

        {/* Name */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontWeight: 600, fontSize: 13, color: "#374151", display: "block", marginBottom: 4 }}>Name</label>
          <input type="text" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Your name" style={{ width: "100%" }}
          />
        </div>

        {/* Phone */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontWeight: 600, fontSize: 13, color: "#374151", display: "block", marginBottom: 4 }}>
            📱 Phone Number <span style={{ color: "#9ca3af", fontWeight: 400 }}>(with country code)</span>
          </label>
          <input type="tel" value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            placeholder="+919876543210"
            style={{ width: "100%" }}
          />
        </div>

        {/* Location */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontWeight: 600, fontSize: 13, color: "#374151", display: "block", marginBottom: 4 }}>
            📍 Farm Location (City Name)
          </label>
          <input type="text" value={form.location}
            onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
            placeholder="e.g. Bangalore, Mumbai, Chennai"
            style={{ width: "100%" }}
          />
          <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
            Used to fetch weather data for automated irrigation alerts every 6 hours.
          </div>
        </div>

        <button className="primary-btn" onClick={handleSave} disabled={saving}
          style={{ width: "100%", marginBottom: 12 }}>
          {saving ? "Saving…" : saved ? "✅ Saved!" : "💾 Save Alert Settings"}
        </button>

        <button className="btn" onClick={handleLogout} style={{ width: "100%" }}>
          🚪 Logout
        </button>
      </div>
    </div>
  );
}