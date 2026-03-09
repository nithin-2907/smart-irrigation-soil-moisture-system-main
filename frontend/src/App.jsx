import { Navigate, Route, BrowserRouter as Router, Routes, useLocation } from "react-router-dom";
import Sidebar from "./components/Sidebar";

import Chatbot from "./components/Chatbot";
import MarketPrices from "./components/MarketPrices";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import CropRecommendation from "./pages/CropRecommendation";
import Dashboard from "./pages/Dashboard";
import History from "./pages/History";
import IrrigationScheduler from "./pages/IrrigationScheduler";
import LeafDisease from "./pages/LeafDisease";
import Login from "./pages/Login";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import SoilHealth from "./pages/SoilHealth";
import Weather from "./pages/Weather";
import YieldPrediction from "./pages/YieldPrediction";
import "./styles.css";

// Redirects logged-in users away from /login back to dashboard
function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null; // wait for session restore
  return user ? <Navigate to="/" replace /> : children;
}

// Only show sidebar when not on the login page
function AppLayout() {
  const location = useLocation();
  const isLogin = location.pathname === "/login";

  return (
    <div className="app-layout">
      {!isLogin && <Sidebar />}
      <div className="main-content" style={isLogin ? { marginLeft: 0, padding: 0 } : undefined}>
        <Routes>

          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/crop" element={<ProtectedRoute><CropRecommendation /></ProtectedRoute>} />
          <Route path="/weather" element={<ProtectedRoute><Weather /></ProtectedRoute>} />
          <Route path="/soil" element={<ProtectedRoute><SoilHealth /></ProtectedRoute>} />
          <Route path="/yield" element={<ProtectedRoute><YieldPrediction /></ProtectedRoute>} />
          <Route path="/market" element={<ProtectedRoute><MarketPrices /></ProtectedRoute>} />
          <Route path="/disease" element={<ProtectedRoute><LeafDisease /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/irrigation" element={<ProtectedRoute><IrrigationScheduler /></ProtectedRoute>} />

        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AppLayout />
        <Chatbot />
      </Router>
    </ThemeProvider>
  );
}

export default App;