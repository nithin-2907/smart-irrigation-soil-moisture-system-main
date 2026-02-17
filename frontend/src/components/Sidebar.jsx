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
          Dashboard
        </NavLink>

        <NavLink 
          to="/login" 
          className={({ isActive }) =>
            isActive ? "sidebar-item active" : "sidebar-item"
          }
        >
          Login
        </NavLink>

        <NavLink 
          to="/crop" 
          className={({ isActive }) =>
            isActive ? "sidebar-item active" : "sidebar-item"
          }
        >
          Crop Recommendation
        </NavLink>

        <NavLink 
          to="/weather" 
          className={({ isActive }) =>
            isActive ? "sidebar-item active" : "sidebar-item"
          }
        >
          Weather & Irrigation
        </NavLink>

        <NavLink 
          to="/soil" 
          className={({ isActive }) =>
            isActive ? "sidebar-item active" : "sidebar-item"
          }
        >
          Soil Health
        </NavLink>

        <NavLink 
          to="/yield" 
          className={({ isActive }) =>
            isActive ? "sidebar-item active" : "sidebar-item"
          }
        >
          Yield Prediction
        </NavLink>

        <NavLink 
          to="/market" 
          className={({ isActive }) =>
            isActive ? "sidebar-item active" : "sidebar-item"
          }
        >
          Market Prices
        </NavLink>

        <NavLink 
          to="/translator" 
          className={({ isActive }) =>
            isActive ? "sidebar-item active" : "sidebar-item"
          }
        >
          Translator
        </NavLink>

        <NavLink 
          to="/history" 
          className={({ isActive }) =>
            isActive ? "sidebar-item active" : "sidebar-item"
          }
        >
          History
        </NavLink>

      </div>
    </div>
  );
}

export default Sidebar;