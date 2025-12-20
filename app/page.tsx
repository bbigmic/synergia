"use client";

import { useEffect, useState } from "react";

type Mission = {
  id: string;
  category: string;
  content: string;
  createdAt: string;
};

const categories = [
  "Bliskość",
  "Komunikacja",
  "Zabawa",
  "Odwaga",
];

export default function Home() {
  const [category, setCategory] = useState(categories[0]);
  const [mission, setMission] = useState<Mission | null>(null);
  const [history, setHistory] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(false);
  const [extraMode, setExtraMode] = useState(false);

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/mission");
      if (!res.ok) {
        console.error("Failed to fetch history:", res.status);
        return;
      }
      const data = await res.json();
      setHistory(data);
    } catch (error) {
      console.error("Error fetching history:", error);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const generateMission = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/mission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, extraMode }),
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Failed to generate mission:", res.status, errorText);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setMission(data);
      fetchHistory();
    } catch (error) {
      console.error("Error generating mission:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-50 p-4 flex flex-col gap-6 max-w-md mx-auto">
      <header className="text-center">
        <h1 className="text-2xl font-semibold">
          Dzisiejsza Misja dla Was
        </h1>
        <p className="text-neutral-500 text-sm mt-1">
          Jedna chwila. Jedno połączenie.
        </p>
      </header>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-neutral-600">
            Wybierz kategorię
          </h2>
          <label className="flex items-center gap-2 cursor-pointer group">
            <span className="text-xs text-neutral-500 group-hover:text-neutral-700 transition-colors">
              Tryb ekstra
            </span>
            <div className="relative">
              <input
                type="checkbox"
                checked={extraMode}
                onChange={(e) => setExtraMode(e.target.checked)}
                className="sr-only"
              />
              <div
                className={`w-11 h-6 rounded-full transition-colors duration-200 ${
                  extraMode ? "bg-neutral-900" : "bg-neutral-300"
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-200 mt-0.5 ${
                    extraMode ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </div>
            </div>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-xl p-4 text-center font-medium transition-all ${
                category === c
                  ? "bg-neutral-100 text-neutral-900 border-2 border-neutral-900 shadow-md font-semibold"
                  : "bg-white text-neutral-700 border-2 border-neutral-200 hover:border-neutral-300 hover:shadow-md active:scale-95"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      <button
        onClick={generateMission}
        disabled={loading}
        className="w-full rounded-xl bg-black text-white py-4 text-lg font-medium active:scale-95 transition"
      >
        {loading ? "AI myśli dla was…" : "Wygeneruj misję"}
      </button>

      {mission && (
        <div className="rounded-2xl bg-white p-5 shadow-sm animate-fadeIn">
          <p className="text-sm text-neutral-400 mb-2">
            Kategoria: {mission.category}
          </p>
          <p className="text-lg">{mission.content}</p>
        </div>
      )}

      <section className="mt-6">
        <h2 className="text-sm text-neutral-500 mb-2">
          Poprzednie misje
        </h2>
        <ul className="space-y-3">
          {history.map((m) => (
            <li
              key={m.id}
              className="rounded-xl bg-white p-4 text-sm shadow-sm"
            >
              {m.content}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
