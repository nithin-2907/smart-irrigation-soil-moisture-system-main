import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {

  const navigate = useNavigate();
  const { login } = useAuth();
  const { user } = useAuth();

  useEffect(() => {
    if (user) navigate("/");
  }, []);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("farmer");

  const handleSubmit = (e) => {
    e.preventDefault();

    const userData = {
      name: name,
      email: email,
      role: role // 'farmer' or 'admin' (demo)
    };

    login(userData);

    navigate("/");
  };

  return (
    <div className="page-container">
      <h1 className="page-title">🔐 Farmer Login</h1>

      <div className="form-card">
        <form onSubmit={handleSubmit}>

          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="farmer">Farmer</option>
              <option value="admin">Admin</option>
            </select>
            <small style={{ color: '#666' }}>Choose <strong>Admin</strong> only for management tasks (demo).</small>
          </div>

          <button className="btn-primary">Login</button>

        </form>
      </div>
    </div>
  );
}