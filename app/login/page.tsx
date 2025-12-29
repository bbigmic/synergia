"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const message = searchParams.get("message");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Nieprawidłowy email lub hasło");
      } else {
        // notify header and other components to refresh auth state
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("authChanged"));
        }
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      setError("Wystąpił błąd podczas logowania");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-50 p-4 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h1 className="text-2xl font-semibold mb-2">Zaloguj się</h1>
          <p className="text-neutral-500 text-sm mb-6">
            Zaloguj się, aby uzyskać więcej użyć i kredytów
          </p>

          {message && (
            <div className="bg-green-50 text-green-700 text-sm p-3 rounded-lg mb-4">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-neutral-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Hasło
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-neutral-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-black text-white py-3 text-lg font-medium active:scale-95 transition disabled:opacity-50"
            >
              {loading ? "Logowanie..." : "Zaloguj się"}
            </button>
          </form>

          <p className="text-center text-sm text-neutral-500 mt-4">
            Nie masz konta?{" "}
            <Link href="/register" className="text-black font-medium hover:underline">
              Zarejestruj się
            </Link>
          </p>

          <Link
            href="/"
            className="block text-center text-sm text-neutral-500 mt-4 hover:text-neutral-700"
          >
            ← Wróć do strony głównej
          </Link>
        </div>
      </div>
    </main>
  );
}

