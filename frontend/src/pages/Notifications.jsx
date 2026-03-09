import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

export default function Notifications() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    const typeStyles = {
        "irrigate": { bg: "rgba(239,68,68,0.1)", border: "rgba(252,165,165,0.5)", icon: "🔴", badge: "#dc2626" },
        "caution": { bg: "rgba(234,179,8,0.1)", border: "rgba(252,211,77,0.5)", icon: "🟡", badge: "#d97706" },
        "no-action": { bg: "rgba(34,197,94,0.08)", border: "rgba(134,239,172,0.4)", icon: "✅", badge: "#16a34a" },
    };

    const fetchNotifications = async () => {
        if (!user?.email) return;
        setLoading(true);
        try {
            const res = await api.get(`/notifications?userId=${encodeURIComponent(user.email)}`);
            setNotifications(res.data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const markRead = async (id) => {
        await api.patch(`/notifications/${id}/read`);
        setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    };

    const markAllRead = async () => {
        await api.patch(`/notifications/read-all?userId=${encodeURIComponent(user.email)}`);
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    };

    const triggerNow = async () => {
        await api.post("/profile/trigger-alert");
        setTimeout(fetchNotifications, 3000);
        alert("Alert check triggered! Notifications will appear in ~5 seconds.");
    };

    useEffect(() => { fetchNotifications(); }, [user]);

    const timeAgo = (date) => {
        const s = Math.floor((Date.now() - new Date(date)) / 1000);
        if (s < 60) return `${s}s ago`;
        if (s < 3600) return `${Math.floor(s / 60)}m ago`;
        if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
        return `${Math.floor(s / 86400)}d ago`;
    };

    const unread = notifications.filter(n => !n.isRead).length;

    return (
        <div className="page-container">
            <h1 className="page-title">🔔 Irrigation Alerts</h1>

            <div className="card" style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                    <div>
                        {unread > 0
                            ? <span style={{ fontWeight: 600, color: "#dc2626" }}>{unread} unread alert{unread > 1 ? "s" : ""}</span>
                            : <span style={{ color: "var(--text-muted)" }}>All caught up ✅</span>
                        }
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                        {unread > 0 && (
                            <button className="btn" onClick={markAllRead}
                                style={{ padding: "6px 14px", fontSize: 13 }}>
                                Mark all read
                            </button>
                        )}
                        <button className="primary-btn" onClick={triggerNow}
                            style={{ padding: "6px 14px", fontSize: 13 }}>
                            ⚡ Run check now
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="card" style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
                    Loading notifications…
                </div>
            ) : notifications.length === 0 ? (
                <div className="card" style={{ textAlign: "center", padding: 40 }}>
                    <div style={{ fontSize: 48 }}>🔔</div>
                    <div style={{ marginTop: 12, color: "var(--text-muted)" }}>No alerts yet.</div>
                    <div style={{ marginTop: 4, fontSize: 13, color: "var(--text-muted)" }}>
                        Set your location in <strong>Profile</strong> to start receiving automated irrigation alerts.
                    </div>
                    <button className="primary-btn" style={{ marginTop: 16 }} onClick={() => navigate("/profile")}>
                        Go to Profile →
                    </button>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {notifications.map(n => {
                        const s = typeStyles[n.type] || typeStyles["caution"];
                        return (
                            <div key={n._id}
                                onClick={() => !n.isRead && markRead(n._id)}
                                style={{
                                    background: s.bg,
                                    border: `1.5px solid ${s.border}`,
                                    borderRadius: 12,
                                    padding: "14px 18px",
                                    cursor: n.isRead ? "default" : "pointer",
                                    opacity: n.isRead ? 0.65 : 1,
                                    transition: "opacity 0.2s",
                                    display: "flex",
                                    gap: 14,
                                    alignItems: "flex-start",
                                }}
                            >
                                <div style={{ fontSize: 28, lineHeight: 1 }}>{s.icon}</div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 4 }}>
                                        <strong style={{ fontSize: 15 }}>{n.title}</strong>
                                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{timeAgo(n.createdAt)}</span>
                                    </div>
                                    <div style={{ marginTop: 4, fontSize: 14, lineHeight: 1.5 }}>{n.message}</div>
                                    {n.weatherSummary && (
                                        <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-muted)" }}>
                                            📍 {n.location} &nbsp;|&nbsp; {n.weatherSummary}
                                        </div>
                                    )}
                                    {!n.isRead && (
                                        <div style={{ marginTop: 6, fontSize: 11, color: s.badge, fontWeight: 600 }}>
                                            TAP TO MARK AS READ
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
