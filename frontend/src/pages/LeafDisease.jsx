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
            <h1 className="page-title">🦠 Leaf Disease Diagnosis</h1>
            <p style={{ color: "#666", marginBottom: "30px" }}>
                Upload a clear photo of your affected plant leaf. Our AI model will analyze it and suggest treatments.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "40px" }}>

                {/* Upload Section */}
                <div className="card" style={{ textAlign: "center", padding: "40px" }}>
                    <div
                        style={{
                            border: "2px dashed #ccc",
                            borderRadius: "12px",
                            padding: "40px",
                            backgroundColor: "#f9fafb",
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
                                <p style={{ color: "#666" }}>Click to Upload or Drag & Drop</p>
                                <p style={{ fontSize: "12px", color: "#999" }}>JPG, PNG supported</p>
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
                        <div className="card" style={{ borderTop: `5px solid ${result.disease === 'Healthy' ? '#22c55e' : '#ef4444'}` }}>
                            <div style={{ marginBottom: "20px" }}>
                                <h2 style={{ fontSize: "24px", color: "#333", marginBottom: "5px" }}>{result.disease}</h2>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                    <div style={{ flex: 1, background: "#eee", height: "10px", borderRadius: "5px", overflow: "hidden" }}>
                                        <div style={{ width: `${result.confidence}%`, background: result.disease === 'Healthy' ? '#22c55e' : '#ef4444', height: "100%" }}></div>
                                    </div>
                                    <span style={{ fontWeight: "bold", color: "#666" }}>{result.confidence}%</span>
                                </div>
                            </div>

                            <h4 style={{ color: "#555", marginBottom: "10px" }}>📝 Recommendation:</h4>
                            <p style={{ lineHeight: "1.6", color: "#444", background: "#f3f4f6", padding: "15px", borderRadius: "8px" }}>
                                {result.recommendation}
                            </p>
                        </div>
                    )}

                    {!result && !error && (
                        <div className="card" style={{ height: 'fit-content', opacity: 0.7 }}>
                            <h3>How it works</h3>
                            <ul style={{ paddingLeft: '20px', lineHeight: '2', color: '#666' }}>
                                <li>Take a clear photo of the infected leaf.</li>
                                <li>Upload it here.</li>
                                <li>Get instant diagnosis and cure.</li>
                            </ul>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
