import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  // While Supabase is restoring the session, show a spinner instead of
  // instantly redirecting to /login (avoids false redirect on page refresh)
  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex",
        alignItems: "center", justifyContent: "center",
        background: "#020c1b", flexDirection: "column", gap: 16,
      }}>
        <div style={{
          width: 44, height: 44, border: "4px solid rgba(34,197,94,0.2)",
          borderTop: "4px solid #22c55e", borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: "#64748b", fontSize: 14 }}>Loading…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}