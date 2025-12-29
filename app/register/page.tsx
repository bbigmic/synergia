"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Nie udało się utworzyć konta");
        return;
      }

      // Redirect to login page with success message
      router.push("/login?message=Konto zostało utworzone. Zaloguj się teraz.");
    } catch (err) {
      setError("Wystąpił błąd podczas rejestracji");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-50 p-4 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h1 className="text-2xl font-semibold mb-2">Zarejestruj się</h1>
          <p className="text-neutral-500 text-sm mb-6">
            Utwórz konto, aby uzyskać więcej użyć i kredytów
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Imię (opcjonalne)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>

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
                minLength={6}
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
              {loading ? "Rejestracja..." : "Zarejestruj się"}
            </button>
          </form>

          <p className="text-center text-sm text-neutral-500 mt-4">
            Masz już konto?{" "}
            <Link href="/login" className="text-black font-medium hover:underline">
              Zaloguj się
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

