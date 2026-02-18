import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import Sidebar from "./components/Sidebar";

import Chatbot from "./components/Chatbot";
import MarketPrices from "./components/MarketPrices";
import ProtectedRoute from "./components/ProtectedRoute";
import CropRecommendation from "./pages/CropRecommendation";
import Dashboard from "./pages/Dashboard";
import History from "./pages/History";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import SoilHealth from "./pages/SoilHealth";
import Translator from "./pages/Translator";
import Weather from "./pages/Weather";
import YieldPrediction from "./pages/YieldPrediction";
import "./styles.css";

function App() {
  return (
    <Router>
      <div className="app-layout">
        <Sidebar />

        <div className="main-content">
          <Routes>

            <Route path="/login" element={<Login />} />

            <Route path="/" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />

            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />

            <Route path="/crop" element={
              <ProtectedRoute>
                <CropRecommendation />
              </ProtectedRoute>
            } />

            <Route path="/weather" element={
              <ProtectedRoute>
                <Weather />
              </ProtectedRoute>
            } />

            <Route path="/soil" element={
              <ProtectedRoute>
                <SoilHealth />
              </ProtectedRoute>
            } />

            <Route path="/yield" element={
              <ProtectedRoute>
                <YieldPrediction />
              </ProtectedRoute>
            } />

            <Route path="/market" element={
              <ProtectedRoute>
                <MarketPrices />
              </ProtectedRoute>
            } />

            <Route path="/translator" element={
              <ProtectedRoute>
                <Translator />
              </ProtectedRoute>
            } />

            <Route path="/history" element={
              <ProtectedRoute>
                <History />
              </ProtectedRoute>
            } />

          </Routes>
        </div>
      </div>
      <Chatbot />
    </Router>
  );
}

export default App;