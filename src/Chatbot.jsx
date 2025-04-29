import React, { useState, useEffect } from "react";
import axios from "axios";
import Sidebar from "./components/Sidebar";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { FaMicrophone, FaMicrophoneSlash } from "react-icons/fa";
import TextareaAutosize from "react-textarea-autosize";
import HistoryModal from "./components/HistoryModal";

const API_BASE = "http://localhost:8004/fatwaaskes";

export default function Chatbot() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [response, setResponse] = useState("");

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  // Fetch messages when a conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    } else {
      setMessages([]);
    }
  }, [selectedConversation]);

  const fetchMessages = async (conversationId) => {
    try {
      const res = await axios.get(`${API_BASE}/conversations/${conversationId}/messages`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setMessages(res.data);
    } catch (err) {
      setMessages([]);
    }
  };

  const handleSelectConversation = (conv) => {
    setSelectedConversation(conv);
    setResponse("");
    setQuestion("");
  };

  const handleNewChat = (conv) => {
    setSelectedConversation(conv);
    setMessages([]);
    setResponse("");
    setQuestion("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedConversation) {
      alert("Please select or create a conversation first.");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(
        `${API_BASE}/conversations/${selectedConversation.id}/messages`,
        {
          conversation_id: selectedConversation.id,
          question,
          answer: ""
          // Optionally add user_id if available
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        }
      );
      // Now get the LLM answer (simulate or call your backend LLM endpoint)
      // For now, just append the user message
      setMessages((prev) => [...prev, res.data]);
      setQuestion("");
      setResponse("");
    } catch (err) {
      setResponse("Failed to send message.");
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceInput = () => {
    if (!browserSupportsSpeechRecognition) {
      alert("Your browser does not support speech recognition.");
      return;
    }
    if (listening) {
      SpeechRecognition.stopListening();
      setQuestion(transcript);
    } else {
      SpeechRecognition.startListening();
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar
        selectedId={selectedConversation ? selectedConversation.id : null}
        onSelect={handleSelectConversation}
        onNewChat={handleNewChat}
      />
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, overflowY: "auto", padding: 24, background: "#fafbfc" }}>
          {selectedConversation ? (
            messages.length === 0 ? (
              <div style={{ color: "#888" }}>No messages yet. Start the conversation!</div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} style={{ marginBottom: 18 }}>
                  <div style={{ fontWeight: 600, color: "#2466d1" }}>You:</div>
                  <div style={{ marginBottom: 6 }}>{msg.question}</div>
                  {msg.answer && (
                    <>
                      <div style={{ fontWeight: 600, color: "#4f8cff" }}>Bot:</div>
                      <div style={{ marginBottom: 6 }}>{msg.answer}</div>
                    </>
                  )}
                  <div style={{ fontSize: 12, color: "#aaa" }}>{new Date(msg.created_at).toLocaleString()}</div>
                </div>
              ))
            )
          ) : (
            <div style={{ color: "#888" }}>Select or start a conversation.</div>
          )}
        </div>
        <form onSubmit={handleSubmit} style={{ display: "flex", alignItems: "center", padding: 16, borderTop: "1px solid #eee", background: "#fff" }}>
          <TextareaAutosize
            minRows={1}
            maxRows={4}
            style={{ flex: 1, resize: "none", fontSize: 16, padding: 8, borderRadius: 6, border: "1px solid #ccc", marginRight: 8 }}
            placeholder="Type your message..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={loading || !selectedConversation}
          />
          <button
            type="button"
            onClick={handleVoiceInput}
            style={{ marginRight: 8, background: "none", border: "none", cursor: "pointer", color: listening ? "#e55353" : "#555" }}
            disabled={!browserSupportsSpeechRecognition || loading}
            title="Voice input"
          >
            {listening ? <FaMicrophoneSlash size={22} /> : <FaMicrophone size={22} />}
          </button>
          <button
            type="submit"
            disabled={loading || !question || !selectedConversation}
            style={{ padding: "8px 18px", borderRadius: 6, border: "none", background: "#4f8cff", color: "#fff", fontWeight: 600, fontSize: 16, cursor: loading ? "not-allowed" : "pointer" }}
          >
            {loading ? "Sending..." : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}