import { useState } from "react";
import api from "../services/api";

export default function Translator() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [fromLang, setFromLang] = useState("English");
  const [toLang, setToLang] = useState("Tamil");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [provider, setProvider] = useState("");

  const translateText = async () => {
    setError("");
    setOutput("");
    setProvider("");

    if (!input.trim()) {
      setError("Please enter text to translate.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/translator/translate', {
        text: input,
        from: fromLang,
        to: toLang
      });

      setOutput(res.data.translatedText || "");
      setProvider(res.data.provider || (res.data.fallback ? 'fallback' : 'unknown'));

      if (res.data.fallback) {
        setError(res.data.message || 'Using fallback translation (external service unavailable)');
      }
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.error || 'Translation failed');
    } finally {
      setLoading(false);
    }
  };

  const swapLanguages = () => {
    const temp = fromLang;
    setFromLang(toLang);
    setToLang(temp);
    setOutput("");
  };

  return (
    <div className="page">
      <h1 className="page-title">🌐 Translator</h1>

      <div className="card translator-card">
        {/* Language Selection */}
        <div className="lang-row">
          <select value={fromLang} onChange={(e) => setFromLang(e.target.value)}>
            <option>English</option>
            <option>Tamil</option>
            <option>Hindi</option>
            <option>Telugu</option>
          </select>

          <button className="swap-btn" onClick={swapLanguages} disabled={loading}>
            ⇄
          </button>

          <select value={toLang} onChange={(e) => setToLang(e.target.value)}>
            <option>Tamil</option>
            <option>English</option>
            <option>Hindi</option>
            <option>Telugu</option>
          </select>
        </div>

        {/* Input */}
        <textarea
          placeholder="Enter text to translate..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />

        <button className="primary-btn" onClick={translateText} disabled={loading}>
          {loading ? 'Translating…' : 'Translate'}
        </button>

        {error && <p className="msg error">{error}</p>}

        {/* Output */}
        <textarea
          placeholder="Translation will appear here..."
          value={output}
          readOnly
        />

        {provider && (
          <p className="msg">Provider: <strong>{provider}</strong></p>
        )}
      </div>
    </div>
  );
}