import { useState } from 'react';
import api from '../services/api';

export default function LeafDisease() {
    const [selectedFile, setSelectedFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            setPreview(URL.createObjectURL(file));
            setResult(null);
            setError(null);
        }
    };

    const handlePredict = async () => {
        if (!selectedFile) return;

        setLoading(true);
        setError(null);
        setResult(null);

        const formData = new FormData();
        formData.append('leafImage', selectedFile);

        try {
            const res = await api.post('/disease/predict', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            setResult(res.data);
        } catch (err) {
            console.error(err);
            setError("Analysis failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-container">
            <h1 className="page-title">🍃 Leaf Disease Diagnosis</h1>


            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "40px" }}>

                {/* Upload Section */}
                <div className="card" style={{ textAlign: "center", padding: "40px" }}>
                    <div
                        style={{
                            border: "2px dashed #ccc",
                            borderRadius: "12px",
                            padding: "40px",
                            backgroundColor: "var(--bg-hover)",
                            cursor: "pointer",
                            marginBottom: "20px"
                        }}
                        onClick={() => document.getElementById('fileInput').click()}
                    >
                        {preview ? (
                            <img src={preview} alt="Preview" style={{ maxWidth: "100%", maxHeight: "300px", borderRadius: "8px" }} />
                        ) : (
                            <>
                                <div style={{ fontSize: "40px", marginBottom: "10px" }}>📷</div>
                                <p style={{ color: "var(--text-secondary)" }}>Click to Upload or Drag & Drop</p>
                                <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>JPG, PNG supported</p>
                            </>
                        )}
                        <input
                            id="fileInput"
                            type="file"
                            accept="image/*"
                            style={{ display: "none" }}
                            onChange={handleFileChange}
                        />
                    </div>

                    <button
                        className="primary-btn"
                        onClick={handlePredict}
                        disabled={!selectedFile || loading}
                        style={{ width: "100%", padding: "12px", fontSize: "16px" }}
                    >
                        {loading ? "Analyzing..." : "🔍 Analyze Leaf"}
                    </button>
                </div>

                {/* Results Section */}
                <div>
                    {error && (
                        <div className="card" style={{ borderLeft: "5px solid #ef4444", color: "#ef4444" }}>
                            {error}
                        </div>
                    )}

                    {result && (
                        <>
                            {/* Disease Name + Confidence */}
                            <div className="card" style={{ borderTop: `5px solid ${result.disease === 'Healthy' ? '#22c55e' : '#ef4444'}` }}>
                                <div style={{ marginBottom: "16px" }}>
                                    <h2 style={{ fontSize: "22px", color: "var(--text-primary)", marginBottom: "8px" }}>
                                        {result.disease === 'Healthy' ? '✅' : '⚠️'} {result.disease}
                                    </h2>
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                        <div style={{ flex: 1, background: "#eee", height: "10px", borderRadius: "5px", overflow: "hidden" }}>
                                            <div style={{ width: `${result.confidence}%`, background: result.disease === 'Healthy' ? '#22c55e' : '#ef4444', height: "100%", borderRadius: "5px", transition: "width 0.8s ease" }}></div>
                                        </div>
                                        <span style={{ fontWeight: "bold", color: "var(--text-secondary)", minWidth: 45 }}>{result.confidence}%</span>
                                    </div>
                                </div>

                                <p style={{ lineHeight: "1.6", color: "var(--text-primary)", background: "var(--bg-hover)", padding: "12px 15px", borderRadius: "8px", fontSize: "14px" }}>
                                    {result.recommendation}
                                </p>
                            </div>

                            {/* Cure Section */}
                            {result.cure && result.cure.length > 0 && (
                                <div className="card" style={{
                                    borderLeft: "4px solid #ef4444",
                                    background: "linear-gradient(135deg, #fef2f2, #fff5f5)",
                                    marginTop: "16px"
                                }}>
                                    <h3 style={{ color: "#dc2626", marginBottom: "12px", fontSize: "16px" }}>
                                        💊 How to Cure
                                    </h3>
                                    <ol style={{
                                        paddingLeft: "20px", margin: 0,
                                        display: "flex", flexDirection: "column", gap: "8px"
                                    }}>
                                        {result.cure.map((step, i) => (
                                            <li key={i} style={{
                                                fontSize: "13px", lineHeight: "1.6", color: "var(--text-primary)",
                                                paddingLeft: "4px"
                                            }}>
                                                {step}
                                            </li>
                                        ))}
                                    </ol>
                                </div>
                            )}

                            {/* Prevention Section */}
                            {result.prevention && result.prevention.length > 0 && (
                                <div className="card" style={{
                                    borderLeft: "4px solid #22c55e",
                                    background: "linear-gradient(135deg, #f0fdf4, #f7fef9)",
                                    marginTop: "16px"
                                }}>
                                    <h3 style={{ color: "#16a34a", marginBottom: "12px", fontSize: "16px" }}>
                                        🛡️ How to Prevent
                                    </h3>
                                    <ol style={{
                                        paddingLeft: "20px", margin: 0,
                                        display: "flex", flexDirection: "column", gap: "8px"
                                    }}>
                                        {result.prevention.map((step, i) => (
                                            <li key={i} style={{
                                                fontSize: "13px", lineHeight: "1.6", color: "var(--text-primary)",
                                                paddingLeft: "4px"
                                            }}>
                                                {step}
                                            </li>
                                        ))}
                                    </ol>
                                </div>
                            )}
                        </>
                    )}

                </div>

            </div>
        </div>
    );
}
