import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

export default function Dashboard() {

  const { user } = useAuth();

  const name = user?.name || "Farmer";

  return (
    <div className="page-container">

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 className="page-title">🌱 Smart Farm Dashboard</h1>

        <Link to="/profile" className="user-badge">
          👤 {name}
        </Link>
      </div>

      <div className="welcome-card">
        <h3>Welcome back, <b>{name}</b> 👋</h3>
        <p>Here’s your farm overview.</p>
      </div>

      <div className="card-grid">

        <div className="dashboard-card card-temp">
          <div className="card-title">🌡 Temperature</div>
          <div className="card-value">29.6 °C</div>
        </div>

        <div className="dashboard-card card-humidity">
          <div className="card-title">💧 Humidity</div>
          <div className="card-value">62 %</div>
        </div>

        <div className="dashboard-card card-rain">
          <div className="card-title">🌧 Rainfall</div>
          <div className="card-value">0 mm</div>
        </div>

        <div className="dashboard-card card-soil">
          <div className="card-title">🌱 Soil Moisture</div>
          <div className="card-value">-- %</div>
        </div>

      </div>

    </div>
  );
}