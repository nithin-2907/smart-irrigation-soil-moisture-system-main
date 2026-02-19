import { useEffect, useState } from "react";
import api from "../services/api";

export default function History() {

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get('/history');
        setHistory(res.data);
      } catch (err) {
        console.error("Failed to fetch history", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  // Helper to format result based on type
  const formatResult = (item) => {
    if (item.type === 'CROP' || item.type === 'Crop Recommendation') return `Recommended: ${item.result}`;
    if (item.type === 'SOIL' || item.type === 'Soil Analysis') return `Health: ${item.result}`;
    if (item.type === 'YIELD') return `Predicted: ${item.result}`;
    if (item.type === 'DISEASE') return `Diagnosis: ${item.result}`;
    return item.result; // fallback
  };

  // Helper to format description/input
  const formatDescription = (item) => {
    if (!item.input) return "No details";
    // Create a readable string from input object keys/values 
    // e.g. "Temp: 30°C, Rain: 100mm"
    return Object.entries(item.input)
      .filter(([key]) => !['_id', 'createdAt', 'updatedAt'].includes(key))
      .map(([key, val]) => {
        // simple cleanup for keys like camelCase
        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        return `${label}: ${val}`;
      })
      .slice(0, 3) // limit to first 3 params to keep UI clean
      .join(', ') + (Object.keys(item.input).length > 3 ? '...' : '');
  };

  return (
    <div className="page-container">
      <h1 className="page-title">📜 Activity History</h1>

      <div className="card history-card">
        {loading ? (
          <p>Loading history...</p>
        ) : history.length === 0 ? (
          <p>No history found. Try using some features first!</p>
        ) : (
          <table className="history-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8f9fa", textAlign: "left" }}>
                <th style={{ padding: "12px", borderBottom: "2px solid #ddd" }}>Date</th>
                <th style={{ padding: "12px", borderBottom: "2px solid #ddd" }}>Type</th>
                <th style={{ padding: "12px", borderBottom: "2px solid #ddd" }}>Result</th>
                <th style={{ padding: "12px", borderBottom: "2px solid #ddd" }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item, index) => (
                <tr key={index} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "12px", color: "#666" }}>
                    {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td style={{ padding: "12px", fontWeight: "600", color: "#22c55e" }}>
                    {item.type === 'CROP' ? '🌾 Crop Rec.' :
                      item.type === 'SOIL' ? '🧪 Soil Test' :
                        item.type === 'YIELD' ? '📈 Yield Pred.' :
                          item.type}
                  </td>
                  <td style={{ padding: "12px", fontWeight: "bold" }}>
                    {formatResult(item)}
                  </td>
                  <td style={{ padding: "12px", color: "#555", fontSize: "0.9em" }}>
                    {formatDescription(item)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}