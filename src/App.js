import React from "react";
import { BrowserRouter as Router, Route, Routes, Link } from "react-router-dom";
import Chatbot from "./Chatbot";
import HistoryPage from "./pages/HistoryPage";

export default function App() {
  return (
    <Router>
      <div className="p-4"> 
        <Routes>
          <Route path="/" element={<Chatbot />} />
          <Route path="/history" element={<HistoryPage />} />
        </Routes>
      </div>
    </Router>
  );
}