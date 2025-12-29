 "use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function CancelSubscription() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleCancel = async () => {
    if (!confirm("Czy na pewno chcesz anulować subskrypcję?")) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/stripe/cancel", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Wystąpił błąd");
      } else {
        setMessage("Subskrypcja została anulowana / zaplanowana do anulowania");
        router.refresh();
        // notify other components if needed
        window.dispatchEvent(new Event("authChanged"));
      }
    } catch (err) {
      setMessage("Błąd sieci");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {message && <p className="text-sm text-neutral-700 mb-2">{message}</p>}
      <button
        onClick={handleCancel}
        disabled={loading}
        className="bg-red-700 text-white px-4 py-2 rounded-md disabled:opacity-70 shadow-sm hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-600"
      >
        Anuluj subskrypcję
      </button>
    </div>
  );
}


