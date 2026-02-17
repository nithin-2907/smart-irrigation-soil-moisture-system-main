import { useState } from "react";

export default function History() {

  // Mock history data (replace with API later)
  const [history] = useState([
    {
      type: "Crop Recommendation",
      description: "Recommended crop: Rice",
      date: "2026-02-15"
    },
    {
      type: "Soil Analysis",
      description: "Soil health checked",
      date: "2026-02-14"
    },
    {
      type: "Weather Check",
      description: "Fetched weather for Coimbatore",
      date: "2026-02-13"
    },
    {
      type: "Yield Prediction",
      description: "Estimated yield calculated",
      date: "2026-02-12"
    }
  ]);

  return (
    <div className="page">
      <h1 className="page-title">📜 Activity History</h1>

      <div className="card history-card">

        <table className="history-table">

          <thead>
            <tr>
              <th>Type</th>
              <th>Description</th>
              <th>Date</th>
            </tr>
          </thead>

          <tbody>
            {history.map((item, index) => (
              <tr key={index}>
                <td>{item.type}</td>
                <td>{item.description}</td>
                <td>{item.date}</td>
              </tr>
            ))}
          </tbody>

        </table>

      </div>
    </div>
  );
}