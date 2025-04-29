import React, { useEffect, useState } from "react";
import axios from "axios";

export default function HistoryModal({ onClose }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await axios.get("http://localhost:8004/fatwaaskes/history", {
          headers: {
            Authorization:
              "Bearer eyJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJCaWdTb2x1dGlvbnMiLCJzdWIiOiJ6b3VoaXIuZWwtYW1yYW91aUBlc2kuYWMubWEiLCJhdXRob3JpdGllcyI6IlJPTEVfVVNFUiIsImlhdCI6MTc0NTU3OTY3MCwiZXhwIjoxNzQ1NjY2MDcwfQ.CtX5JZgGt0-jT27zh7hNYIGWeOrm41BAqM19wuWcCNE",
          },
        });
        setHistory(res.data.history);
      } catch (error) {
        console.error("Erreur de récupération de l'historique", error);
      }
    }

    fetchHistory();
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full overflow-y-auto max-h-[80vh]">
        <h2 className="text-xl font-bold mb-4">📜 Historique des Questions</h2>
        <button className="text-red-500 float-right mb-2" onClick={onClose}>Fermer</button>
        <ul className="space-y-3 mt-4">
          {history.map((item, index) => (
            <li key={index} className="border rounded p-3 text-right bg-gray-50">
              <p className="text-sm text-gray-700"><strong>🗨 Question:</strong> {item.question}</p>
              <p className="text-sm text-green-800 mt-2"><strong>🤖 Réponse:</strong> {item.answer}</p>
              <p className="text-xs text-gray-400 mt-1">{new Date(item.timestamp).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}