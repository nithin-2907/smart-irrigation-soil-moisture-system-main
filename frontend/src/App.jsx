import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";

import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import CropRecommendation from "./pages/CropRecommendation";
import Weather from "./pages/Weather";
import SoilHealth from "./pages/SoilHealth";
import YieldPrediction from "./pages/YieldPrediction";
import MarketPrices from "./pages/MarketPrices";
import Translator from "./pages/Translator";
import History from "./pages/History";
import Profile from "./pages/Profile";
import ProtectedRoute from "./components/ProtectedRoute";
import Chatbot from "./components/Chatbot";
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
      <Chatbot/>
    </Router>
  );
}

export default App;