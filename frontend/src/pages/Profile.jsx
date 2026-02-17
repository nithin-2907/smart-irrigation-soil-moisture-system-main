import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Profile() {

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (!user) {
    return (
      <div className="page-container">
        <h2>Please login to view profile</h2>
      </div>
    );
  }

  return (
    <div className="page-container">

      <h1 className="page-title">👤 User Profile</h1>

      <div className="profile-card">

        {/* Avatar */}
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div
            style={{
              width: "90px",
              height: "90px",
              borderRadius: "50%",
              background: "#22c55e",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "32px",
              fontWeight: "bold",
              margin: "auto"
            }}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
        </div>

        {/* User Details */}
        <div style={{ marginBottom: "15px" }}>
          <strong>Name</strong>
          <p>{user.name}</p>
        </div>

        <div style={{ marginBottom: "25px" }}>
          <strong>Email</strong>
          <p>{user.email}</p>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <strong>Role</strong>
          <p>{user.role || 'farmer'}</p>
        </div>

        {/* Logout */}
        <button className="btn-primary" onClick={handleLogout}>
          Logout
        </button>

      </div>

    </div>
  );
}