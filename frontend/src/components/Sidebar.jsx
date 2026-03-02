import { useEffect, useState } from "react";
import {
  FaBell,
  FaChartLine,
  FaCloudSun,
  FaFlask,
  FaHistory,
  FaHome,
  FaLeaf,
  FaSeedling,
  FaSignInAlt,
  FaStore,
  FaTint,
  FaUserCircle
} from "react-icons/fa";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import "./Sidebar.css";

function Sidebar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.email) return;
    const fetchCount = async () => {
      try {
        const res = await api.get(`/notifications/unread-count?userId=${encodeURIComponent(user.email)}`);
        setUnreadCount(res.data.count || 0);
      } catch { /* silent */ }
    };
    fetchCount();
    // Poll every 60 seconds
    const id = setInterval(fetchCount, 60_000);
    return () => clearInterval(id);
  }, [user]);

  return (
    <div className="sidebar">

      {/* Logo + Bell Row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
        <div className="sidebar-logo" style={{ margin: 0 }}>🌱 Smart Irrigation</div>
        {user && (
          <button
            title="Irrigation Alerts"
            onClick={() => navigate("/notifications")}
            style={{
              position: "relative", background: "transparent", border: "none",
              cursor: "pointer", color: "#cbd5e1", fontSize: 20, padding: 4,
              transition: "color 0.2s",
            }}
            onMouseEnter={e => e.currentTarget.style.color = "#22c55e"}
            onMouseLeave={e => e.currentTarget.style.color = unreadCount > 0 ? "#f87171" : "#cbd5e1"}
          >
            <FaBell style={{ color: unreadCount > 0 ? "#f87171" : "inherit" }} />
            {unreadCount > 0 && (
              <span style={{
                position: "absolute", top: -4, right: -4,
                background: "#dc2626", color: "#fff",
                borderRadius: "50%", fontSize: 10, fontWeight: 700,
                minWidth: 18, height: 18, display: "flex",
                alignItems: "center", justifyContent: "center",
                padding: "0 3px",
              }}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Menu Links */}
      <div className="sidebar-menu">

        <NavLink to="/" className={({ isActive }) => isActive ? "sidebar-item active" : "sidebar-item"}>
          <FaHome style={{ marginRight: 8 }} /> Dashboard
        </NavLink>

        <NavLink to="/login" className={({ isActive }) => isActive ? "sidebar-item active" : "sidebar-item"}>
          <FaSignInAlt style={{ marginRight: 8 }} /> Login
        </NavLink>

        <NavLink to="/crop" className={({ isActive }) => isActive ? "sidebar-item active" : "sidebar-item"}>
          <FaSeedling style={{ marginRight: 8 }} /> Crop Recommendation
        </NavLink>

        <NavLink to="/weather" className={({ isActive }) => isActive ? "sidebar-item active" : "sidebar-item"}>
          <FaCloudSun style={{ marginRight: 8 }} /> Weather &amp; Irrigation
        </NavLink>

        <NavLink to="/soil" className={({ isActive }) => isActive ? "sidebar-item active" : "sidebar-item"}>
          <FaFlask style={{ marginRight: 8 }} /> Soil Health
        </NavLink>

        <NavLink to="/yield" className={({ isActive }) => isActive ? "sidebar-item active" : "sidebar-item"}>
          <FaChartLine style={{ marginRight: 8 }} /> Yield Prediction
        </NavLink>

        <NavLink to="/irrigation" className={({ isActive }) => isActive ? "sidebar-item active" : "sidebar-item"}>
          <FaTint style={{ marginRight: 8 }} /> Irrigation Schedule
        </NavLink>

        <NavLink to="/disease" className={({ isActive }) => isActive ? "sidebar-item active" : "sidebar-item"}>
          <FaLeaf style={{ marginRight: 8 }} /> Leaf Diagnosis
        </NavLink>

        <NavLink to="/market" className={({ isActive }) => isActive ? "sidebar-item active" : "sidebar-item"}>
          <FaStore style={{ marginRight: 8 }} /> Market Prices
        </NavLink>

        <NavLink to="/history" className={({ isActive }) => isActive ? "sidebar-item active" : "sidebar-item"}>
          <FaHistory style={{ marginRight: 8 }} /> History
        </NavLink>

        <NavLink to="/notifications" className={({ isActive }) => isActive ? "sidebar-item active" : "sidebar-item"}>
          <FaBell style={{ marginRight: 8, color: unreadCount > 0 ? "#f87171" : "inherit" }} />
          Alerts
          {unreadCount > 0 && (
            <span style={{
              marginLeft: 8, background: "#dc2626", color: "#fff",
              borderRadius: 10, fontSize: 11, fontWeight: 700,
              padding: "1px 7px",
            }}>{unreadCount}</span>
          )}
        </NavLink>

        <NavLink to="/profile" className={({ isActive }) => isActive ? "sidebar-item active" : "sidebar-item"}>
          <FaUserCircle style={{ marginRight: 8 }} /> Profile &amp; Logout
        </NavLink>

      </div>
    </div>
  );
}

export default Sidebar;