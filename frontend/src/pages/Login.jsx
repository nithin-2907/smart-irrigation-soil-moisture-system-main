import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState("login");   // "login" | "signup"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess(""); setLoading(true);

    try {
      if (mode === "signup") {
        if (password !== confirm) {
          setError("Passwords do not match."); setLoading(false); return;
        }
        if (password.length < 6) {
          setError("Password must be at least 6 characters."); setLoading(false); return;
        }
        await signup(email, password, name);
        setSuccess(
          "✅ Account created! Check your email to confirm, then log in."
        );
      } else {
        await login(email, password);
        navigate("/");
      }
    } catch (err) {
      // Map Supabase error messages to friendly ones
      const msg = err.message || "";
      if (msg.includes("Invalid login credentials"))
        setError("Incorrect email or password. Please try again.");
      else if (msg.includes("Email not confirmed"))
        setError("Please confirm your email before logging in.");
      else if (msg.includes("User already registered"))
        setError("An account with this email already exists. Please log in.");
      else
        setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #020c1b 0%, #0a1628 40%, #071a0c 100%)",
    }}>
      <div style={{
        width: "100%", maxWidth: 420,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 20, padding: "40px 36px",
        backdropFilter: "blur(20px)",
        boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 48 }}>🌱</div>
          <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: "8px 0 4px" }}>
            Smart Irrigation
          </h1>
          <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>
            {mode === "login" ? "Sign in to your account" : "Create a new account"}
          </p>
        </div>

        {/* Mode Toggle */}
        <div style={{
          display: "flex", background: "rgba(255,255,255,0.06)",
          borderRadius: 10, padding: 4, marginBottom: 28,
        }}>
          {["login", "signup"].map(m => (
            <button key={m} onClick={() => { setMode(m); setError(""); setSuccess(""); }}
              style={{
                flex: 1, padding: "8px 0", border: "none", borderRadius: 8,
                fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
                background: mode === m ? "#22c55e" : "transparent",
                color: mode === m ? "#fff" : "#94a3b8",
              }}>
              {m === "login" ? "Login" : "Sign Up"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {mode === "signup" && (
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Full Name</label>
              <input type="text" placeholder="Your name" value={name}
                onChange={e => setName(e.target.value)} required style={inputStyle} />
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Email</label>
            <input type="email" placeholder="you@example.com" value={email}
              onChange={e => setEmail(e.target.value)} required style={inputStyle} />
          </div>

          <div style={{ marginBottom: mode === "signup" ? 16 : 24 }}>
            <label style={labelStyle}>Password</label>
            <input type="password" placeholder="Min 6 characters" value={password}
              onChange={e => setPassword(e.target.value)} required style={inputStyle} />
          </div>

          {mode === "signup" && (
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Confirm Password</label>
              <input type="password" placeholder="Repeat password" value={confirm}
                onChange={e => setConfirm(e.target.value)} required style={inputStyle} />
            </div>
          )}

          {error && (
            <div style={{
              background: "#fef2f2", border: "1px solid #fca5a5",
              borderRadius: 8, padding: "10px 14px",
              color: "#dc2626", fontSize: 13, marginBottom: 16,
            }}>{error}</div>
          )}

          {success && (
            <div style={{
              background: "#f0fdf4", border: "1px solid #86efac",
              borderRadius: 8, padding: "10px 14px",
              color: "#16a34a", fontSize: 13, marginBottom: 16,
            }}>{success}</div>
          )}

          <button type="submit" disabled={loading} style={{
            width: "100%", padding: "12px 0", border: "none", borderRadius: 10,
            fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
            background: loading
              ? "rgba(34,197,94,0.5)"
              : "linear-gradient(135deg, #22c55e, #16a34a)",
            color: "#fff", transition: "opacity 0.2s",
            boxShadow: "0 4px 15px rgba(34,197,94,0.3)",
          }}>
            {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 12, marginTop: 24 }}>
          {mode === "login"
            ? <>No account? <span onClick={() => setMode("signup")} style={linkStyle}>Sign up</span></>
            : <>Already have an account? <span onClick={() => setMode("login")} style={linkStyle}>Sign in</span></>
          }
        </p>
      </div>
    </div>
  );
}

const labelStyle = {
  display: "block", color: "#94a3b8", fontSize: 12,
  fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em",
};

const inputStyle = {
  width: "100%", padding: "11px 14px",
  background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 9, color: "#f1f5f9", fontSize: 14, outline: "none",
  transition: "border-color 0.2s", boxSizing: "border-box",
};

const linkStyle = {
  color: "#22c55e", cursor: "pointer", fontWeight: 600,
};