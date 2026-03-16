import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAuth } from "../context/AuthContext";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Chatbot() {
  const { user } = useAuth();
  // 1. Declare state variables FIRST
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Hi 👋 I’m Smart Farm Assistant. Ask me about crops, weather, soil, or predictions!" }
  ]);
  const [sessionId] = useState(`session-${Date.now()}`);
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState("English");
  const [contextData, setContextData] = useState({});
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const languages = [
    "English", "Hindi", "Spanish", "French", "Telugu",
    "Tamil", "Kannada", "Malayalam", "Marathi", "Bengali", "Gujarati"
  ];

  // 2. Declare refs
  const messagesEndRef = useRef(null);

  // 3. Define helper functions
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 4. Use effects (which depend on state/refs)
  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, open]);

  // Fetch history when Chatbot is opened for the first time
  useEffect(() => {
    if (open && user?.email && !historyLoaded) {
      const fetchHistory = async () => {
        try {
          const res = await fetch(`${API_BASE}/api/chat/history/${encodeURIComponent(user.email)}`);
          if (res.ok) {
            const data = await res.json();
            if (data && data.length > 0) {
              const formattedHistory = data.map(msg => ({
                sender: msg.role === 'user' ? 'user' : 'bot',
                text: msg.content
              }));
              setMessages(formattedHistory);
            }
          }
        } catch (err) {
          console.error("Failed to load chat history:", err);
        } finally {
          setHistoryLoaded(true);
        }
      };
      fetchHistory();
    }
  }, [open, user?.email, historyLoaded]);

  // Fetch contextual geolocation when Chatbot is accessed
  useEffect(() => {
    if (open && navigator.geolocation && !contextData.location) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setContextData(prev => ({ ...prev, location: `Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}` }));
        },
        () => { console.warn("Geolocation blocked or unavailable for chatbot context"); }
      );
    }
  }, [open, contextData.location]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userText = input;
    const userMsg = { sender: "user", text: userText };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      console.log("DEBUG: Sending message with language:", language);
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          sessionId,
          language,
          userEmail: user?.email,
          context: contextData
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.details || data.error);
      }

      const botMsg = { sender: "bot", text: data.reply };
      setMessages((prev) => [...prev, botMsg]);
    } catch (error) {
      console.error("Chat Error:", error);
      const errorMsg = { sender: "bot", text: "⚠️ Sorry, I encountered an error. Please try again." };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = async () => {
    if (window.confirm("Are you sure you want to clear your chat history?")) {
      try {
        // 1. Call backend to delete history
        const res = await fetch(`${API_BASE}/api/chat/history/${encodeURIComponent(user.email)}`, {
          method: 'DELETE'
        });
        
        if (res.ok) {
          // 2. Update local state
          setMessages([{ sender: "bot", text: "Hi 👋 I’m Smart Farm Assistant. History cleared! Ask me anything." }]);
          setHistoryLoaded(true); // Prevent useEffect from re-fetching
          setInput(""); // Clear any pending input
        } else {
          alert("Failed to clear history on server.");
        }
      } catch (err) {
        console.error("Failed to clear chat history:", err);
        alert("Error connecting to server.");
      }
    }
  };

  return (
    <>
      {/* Floating Button */}
      <div className="chatbot-button" onClick={() => setOpen(!open)}>
        💬
      </div>

      {/* Chat Window */}
      {open && (
        <div className="chatbot-container">
          <div className="chatbot-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>🤖 Smart Assistant</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button 
                onClick={clearChat}
                style={{ padding: '4px 8px', borderRadius: '4px', border: 'none', background: '#f43f5e', color: 'white', fontSize: '10px', cursor: 'pointer' }}
              >
                Clear
              </button>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                style={{ padding: '4px', borderRadius: '4px', border: 'none', outline: 'none', background: '#e2e8f0', color: '#1e293b', fontSize: '12px', cursor: 'pointer' }}
              >
                {languages.map(lang => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="chatbot-messages">
            {messages.map((msg, index) => (
              <div key={index} className={`chat ${msg.sender}`}>
                {msg.sender === "bot" ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                ) : (
                  msg.text
                )}
              </div>
            ))}
            {loading && (
              <div className="chat bot">
                <div className="typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chatbot-input">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ask something..."
            />
            <button onClick={sendMessage} disabled={loading || !input.trim()}>
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}