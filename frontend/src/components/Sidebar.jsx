import {
  FaChartLine,
  FaCloudSun,
  FaFlask,
  FaHistory,
  FaHome,
  FaLanguage,
  FaLeaf,
  FaSeedling,
  FaSignInAlt,
  FaStore,
  FaUserCircle
} from "react-icons/fa";
import { NavLink } from "react-router-dom";
import "./Sidebar.css";

function Sidebar() {
  return (
    <div className="sidebar">

      {/* Logo */}
      <div className="sidebar-logo">
        🌱 Smart Irrigation
      </div>

      {/* Menu Links */}
      <div className="sidebar-menu">

        <NavLink
          to="/"
          className={({ isActive }) =>
            isActive ? "sidebar-item active" : "sidebar-item"
          }
        >
          <FaHome style={{ marginRight: '8px' }} /> Dashboard
        </NavLink>

        <NavLink
          to="/login"
          className={({ isActive }) =>
            isActive ? "sidebar-item active" : "sidebar-item"
          }
        >
          <FaSignInAlt style={{ marginRight: '8px' }} /> Login
        </NavLink>

        <NavLink
          to="/crop"
          className={({ isActive }) =>
            isActive ? "sidebar-item active" : "sidebar-item"
          }
        >
          <FaSeedling style={{ marginRight: '8px' }} /> Crop Recommendation
        </NavLink>

        <NavLink
          to="/weather"
          className={({ isActive }) =>
            isActive ? "sidebar-item active" : "sidebar-item"
          }
        >
          <FaCloudSun style={{ marginRight: '8px' }} /> Weather & Irrigation
        </NavLink>

        <NavLink
          to="/soil"
          className={({ isActive }) =>
            isActive ? "sidebar-item active" : "sidebar-item"
          }
        >
          <FaFlask style={{ marginRight: '8px' }} /> Soil Health
        </NavLink>

        <NavLink
          to="/yield"
          className={({ isActive }) =>
            isActive ? "sidebar-item active" : "sidebar-item"
          }
        >
          <FaChartLine style={{ marginRight: '8px' }} /> Yield Prediction
        </NavLink>

        <NavLink
          to="/disease"
          className={({ isActive }) =>
            isActive ? "sidebar-item active" : "sidebar-item"
          }
        >
          <FaLeaf style={{ marginRight: '8px' }} /> Leaf Diagnosis
        </NavLink>

        <NavLink
          to="/market"
          className={({ isActive }) =>
            isActive ? "sidebar-item active" : "sidebar-item"
          }
        >
          <FaStore style={{ marginRight: '8px' }} /> Market Prices
        </NavLink>

        <NavLink
          to="/translator"
          className={({ isActive }) =>
            isActive ? "sidebar-item active" : "sidebar-item"
          }
        >
          <FaLanguage style={{ marginRight: '8px' }} /> Translator
        </NavLink>

        <NavLink
          to="/history"
          className={({ isActive }) =>
            isActive ? "sidebar-item active" : "sidebar-item"
          }
        >
          <FaHistory style={{ marginRight: '8px' }} /> History
        </NavLink>

        <NavLink
          to="/profile"
          className={({ isActive }) =>
            isActive ? "sidebar-item active" : "sidebar-item"
          }
        >
          <FaUserCircle style={{ marginRight: '8px' }} /> Profile & Logout
        </NavLink>

      </div>
    </div>
  );
}

export default Sidebar;