import React, { useEffect, useState } from "react";
import axios from "axios";

export default function HistoryPage() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    axios
      .get("http://localhost:8004/fatwaaskes/history", {
        headers: {
          Authorization: "Bearer eyJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJCaWdTb2x1dGlvbnMiLCJzdWIiOiJ6b3VoaXIuZWwtYW1yYW91aUBlc2kuYWMubWEiLCJhdXRob3JpdGllcyI6IlJPTEVfVVNFUiIsImlhdCI6MTc0NTU3OTY3MCwiZXhwIjoxNzQ1NjY2MDcwfQ.CtX5JZgGt0-jT27zh7hNYIGWeOrm41BAqM19wuWcCNE",
        },
      })
      .then((res) => setHistory(res.data.history))
      .catch((err) => console.error("Erreur récupération historique", err));
  }, []);

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-center mb-4">🕓 Historique des Questions</h2>
      {history.map((entry, index) => (
        <div key={index} className="border-b mb-4 pb-2">
          <p className="text-right font-semibold text-green-800 mb-1">السؤال: {entry.question}</p>
          <p className="text-right text-gray-700">🧠 {entry.answer}</p>
          <p className="text-sm text-gray-400 text-right mt-1">{new Date(entry.timestamp).toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}