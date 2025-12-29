"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const CREDITS_PER_USAGE = 300;

export default function ExchangeCredits() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchCredits();
  }, []);

  const fetchCredits = async () => {
    try {
      const res = await fetch("/api/user/stats");
      if (res.ok) {
        const data = await res.json();
        setCredits(data.credits || 0);
      }
    } catch (error) {
      console.error("Error fetching credits:", error);
    }
  };

  const handleExchange = async () => {
    if (credits === null || credits < CREDITS_PER_USAGE) {
      setMessage(`Niewystarczająca ilość kredytów. Wymagane: ${CREDITS_PER_USAGE}`);
      return;
    }

    if (!confirm(`Czy na pewno chcesz wymienić ${CREDITS_PER_USAGE} kredytów na 1 użycie?`)) {
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/user/exchange-credits", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Wystąpił błąd");
      } else {
        setMessage(`Wymieniono ${CREDITS_PER_USAGE} kredytów na 1 użycie`);
        setCredits(data.remainingCredits);
        router.refresh();
        // Notify other components
        window.dispatchEvent(new Event("authChanged"));
        window.dispatchEvent(new Event("userUpdated"));
      }
    } catch (err) {
      setMessage("Błąd sieci");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Wymień kredyty na użycia</h3>
        <p className="text-sm text-neutral-600 mb-4">
          Wymień {CREDITS_PER_USAGE} kredytów na 1 dodatkowe użycie. Użycia wymienione z kredytów nie wygasają.
        </p>
        {credits !== null && (
          <div className="mb-4 p-3 bg-neutral-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600">Twoje kredyty:</span>
              <div className="flex items-center gap-2">
                <img src="/icons/credit.png" alt="kredyty" className="w-5 h-5" />
                <span className="text-lg font-semibold text-yellow-700">{credits}</span>
              </div>
            </div>
          </div>
        )}
        {message && (
          <p className={`text-sm mb-2 ${message.includes("błąd") || message.includes("Niewystarczająca") ? "text-red-600" : "text-green-600"}`}>
            {message}
          </p>
        )}
        <button
          onClick={handleExchange}
          disabled={loading || credits === null || credits < CREDITS_PER_USAGE}
          className="bg-orange-500 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-600 active:scale-95 transition"
        >
          {loading ? "Przetwarzanie..." : `Wymień ${CREDITS_PER_USAGE} kredytów na 1 użycie`}
        </button>
      </div>
    </div>
  );
}

