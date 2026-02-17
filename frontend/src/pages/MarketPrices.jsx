import { useState } from "react";

export default function MarketPrices() {
  const [search, setSearch] = useState("");

  const data = [
    { crop: "Rice", market: "Chennai", price: "₹2200 / Quintal" },
    { crop: "Wheat", market: "Delhi", price: "₹2100 / Quintal" },
    { crop: "Maize", market: "Bangalore", price: "₹1850 / Quintal" },
    { crop: "Sugarcane", market: "Coimbatore", price: "₹320 / Ton" },
    { crop: "Cotton", market: "Mumbai", price: "₹6200 / Quintal" },
  ];

  const filtered = data.filter((item) =>
    item.crop.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page">
      <h1 className="page-title">💰 Market Prices</h1>

      {/* Search */}
      <div className="card search-card">
        <input
          type="text"
          placeholder="Search crop..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="card table-card">
        <table className="price-table">
          <thead>
            <tr>
              <th>Crop</th>
              <th>Market</th>
              <th>Price</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((item, index) => (
              <tr key={index}>
                <td>{item.crop}</td>
                <td>{item.market}</td>
                <td className="price">{item.price}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}