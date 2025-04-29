import React, { useEffect, useState } from "react";
import axios from "axios";

const API_BASE = "http://localhost:8004/fatwaaskes";

export default function Sidebar({ selectedId, onSelect, onNewChat }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchConversations();
    // eslint-disable-next-line
  }, []);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/conversations`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setConversations(res.data);
      setError(null);
    } catch (err) {
      setError("Failed to load conversations");
    }
    setLoading(false);
  };

  const handleNewChat = async () => {
    try {
      const res = await axios.post(
        `${API_BASE}/conversations`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      setConversations([res.data, ...conversations]);
      onNewChat(res.data);
    } catch (err) {
      alert("Could not create new chat");
    }
  };

  const handleDeleteConversation = async (id) => {
    if (!window.confirm("Are you sure you want to delete this conversation?")) return;
    try {
      await axios.delete(`${API_BASE}/conversations/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setConversations((prev) => prev.filter((conv) => conv.id !== id));
    } catch (err) {
      alert("Failed to delete conversation");
    }
  };

  return (
    <div style={{ width: 280, background: "#f5f5f7", borderRight: "1px solid #ddd", height: "100vh", overflowY: "auto", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: 16, borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 700, fontSize: 18 }}>Chats</span>
        <button onClick={handleNewChat} style={{ padding: "4px 12px", borderRadius: 4, border: "none", background: "#4f8cff", color: "#fff", fontWeight: 600, cursor: "pointer" }}>+ New Chat</button>
      </div>
      <div style={{ flex: 1 }}>
        {loading ? (
          <div style={{ padding: 16 }}>Loading...</div>
        ) : error ? (
          <div style={{ padding: 16, color: "#c00" }}>{error}</div>
        ) : conversations.length === 0 ? (
          <div style={{ padding: 16, color: "#888" }}>No conversations yet.</div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                background: selectedId === conv.id ? "#e6f0ff" : "transparent",
                cursor: "pointer",
                borderBottom: "1px solid #eee",
                fontWeight: selectedId === conv.id ? 600 : 400,
                color: selectedId === conv.id ? "#2466d1" : "#222"
              }}
            >
              <div onClick={() => onSelect(conv)} style={{ flex: 1 }}>
                {conv.title || `Conversation #${conv.id}`}
                <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{new Date(conv.created_at).toLocaleString()}</div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); handleDeleteConversation(conv.id); }}
                style={{ marginLeft: 8, background: "none", border: "none", color: "#c00", cursor: "pointer", fontSize: 16 }}
                title="Delete conversation"
              >
                🗑️
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
