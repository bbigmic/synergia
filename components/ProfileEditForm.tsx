 "use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  initialName?: string;
  initialEmail?: string;
};

export default function ProfileEditForm({ initialName = "", initialEmail = "" }: Props) {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/user/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Wystąpił błąd");
      } else {
        setMessage("Dane zapisane");
        // Notify other components (AuthStatus) to refresh
        window.dispatchEvent(new Event("authChanged"));
        router.refresh();
      }
    } catch (err) {
      setMessage("Błąd sieci");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-neutral-700">Imię</label>
        <input
          className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-700">Email</label>
        <input
          type="email"
          className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      {message && <p className="text-sm text-neutral-700">{message}</p>}
      <div>
        <button
          type="submit"
          className="bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-70 shadow-sm hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600"
          disabled={loading}
        >
          Zapisz zmiany
        </button>
      </div>
    </form>
  );
}


