import axios from "axios";
import { useEffect, useState } from "react";

export default function MarketPrices() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // States likely available in the API dataset
    const states = ["Andhra Pradesh", "Telangana", "Karnataka", "Maharashtra", "Tamil Nadu"];

    const [filters, setFilters] = useState({
        state: "Andhra Pradesh",
        district: "",
        commodity: ""
    });

    const fetchPrices = async () => {
        setLoading(true);
        setError("");
        try {
            const response = await axios.get("http://localhost:5000/api/market", {
                params: {
                    state: filters.state,
                    district: filters.district,
                    limit: 20
                }
            });

            // The OGD API structure usually returns records in `records` array
            if (response.data.records) {
                setData(response.data.records);
            } else {
                setData([]);
            }
        } catch (err) {
            console.error("Market API Error:", err);
            const errorMessage = err.response?.data?.error
                ? `${err.response.data.error}: ${JSON.stringify(err.response.data.details || '')}`
                : "Failed to fetch market prices. Check API Key or try again later.";
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPrices();
    }, []);

    return (
        <div className="page-container">
            <h1 className="page-title">💰 Daily Market Prices</h1>

            <div className="form-card search-card">
                <h3 className="card-title">Filter Prices</h3>
                <div className="form-grid">
                    <div>
                        <label>State</label>
                        <select
                            value={filters.state}
                            onChange={(e) => setFilters({ ...filters, state: e.target.value })}
                        >
                            <option value="">Select State</option>
                            {states.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label>District</label>
                        <input
                            placeholder="e.g. Chittoor"
                            value={filters.district}
                            onChange={(e) => setFilters({ ...filters, district: e.target.value })}
                        />
                    </div>
                </div>
                <button className="primary-btn" onClick={fetchPrices}>
                    {loading ? "Loading..." : "Search Prices"}
                </button>
            </div>

            {error && <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}

            <div className="table-card">
                {data.length === 0 && !loading ? (
                    <p style={{ padding: '20px', textAlign: 'center' }}>No records found. Try adjusting filters.</p>
                ) : (
                    <table className="price-table">
                        <thead>
                            <tr>
                                <th>State</th>
                                <th>District</th>
                                <th>Market</th>
                                <th>Commodity</th>
                                <th>Min Price (₹/Quintal)</th>
                                <th>Max Price (₹/Quintal)</th>
                                <th>Modal Price (₹/Quintal)</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((item, index) => (
                                <tr key={index}>
                                    <td>{item.state}</td>
                                    <td>{item.district}</td>
                                    <td>{item.market}</td>
                                    <td className="price">{item.commodity}</td>
                                    <td>₹{item.min_price}</td>
                                    <td>₹{item.max_price}</td>
                                    <td style={{ fontWeight: 'bold' }}>₹{item.modal_price}</td>
                                    <td>{item.arrival_date}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
