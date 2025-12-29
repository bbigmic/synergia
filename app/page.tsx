 "use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Mission = {
  id: string;
  category: string;
  content: string;
  createdAt: string;
  extraMode?: boolean;
  ratingScore?: number;
};

type UserStats = {
  isLoggedIn: boolean;
  usage: {
    used: number;
    limit: number;
    remaining: number;
  };
  credits: number;
  isSubscribed: boolean;
  subscriptionEnd: string | null;
};

const categories = [
  "Bliskość",
  "Komunikacja",
  "Zabawa",
  "Odwaga",
];

function generateSessionId() {
  if (typeof window === "undefined") return "";
  let sessionId = localStorage.getItem("sessionId");
  if (!sessionId) {
    sessionId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem("sessionId", sessionId);
  }
  return sessionId;
}

export default function Home() {
  type User = { id: string; email?: string | null; name?: string | null };
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const router = useRouter();
  const [category, setCategory] = useState(categories[0]);
  const [mission, setMission] = useState<Mission | null>(null);
  const [history, setHistory] = useState<Mission[]>([]);
  const [activeTab, setActiveTab] = useState<"general" | "mine" | "liked">("general");
  const [loading, setLoading] = useState(false);
  const [extraMode, setExtraMode] = useState(false);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [error, setError] = useState("");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [sessionId] = useState(() => generateSessionId());
  const [purchasingPackage, setPurchasingPackage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [loadingMoreHistory, setLoadingMoreHistory] = useState(false);
  const HISTORY_PER_PAGE = 20;

  const fetchHistory = async (scope?: "general" | "mine" | "liked", page: number = 1, append: boolean = false) => {
    try {
      const actualScope = scope || activeTab;
      let url = "/api/mission";
      
      // Only add pagination for mine and liked scopes (not for general)
      if (actualScope === "mine" || actualScope === "liked") {
        const skip = (page - 1) * HISTORY_PER_PAGE;
        url += `?scope=${actualScope}&skip=${skip}&take=${HISTORY_PER_PAGE}`;
      } else if (actualScope) {
        url += `?scope=${actualScope}`;
      }

      if (append) {
        setLoadingMoreHistory(true);
      }

      const res = await fetch(url);
      if (!res.ok) {
        console.error("Failed to fetch history:", res.status);
        return;
      }
      const data = await res.json();
      
      if (append) {
        setHistory((prev) => [...prev, ...data]);
        // Jeśli otrzymaliśmy mniej niż HISTORY_PER_PAGE, oznacza to, że nie ma więcej
        setHasMoreHistory(data.length === HISTORY_PER_PAGE);
      } else {
        setHistory(data);
        setCurrentPage(1);
        // Sprawdź, czy jest więcej niż 20 misji - tylko dla zakładek mine i liked
        if (actualScope === "mine" || actualScope === "liked") {
          setHasMoreHistory(data.length === HISTORY_PER_PAGE);
        } else {
          setHasMoreHistory(false);
        }
      }
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoadingMoreHistory(false);
    }
  };

  const fetchStats = async () => {
    try {
      const url = user
        ? "/api/user/stats"
        : `/api/user/stats?sessionId=${sessionId}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  useEffect(() => {
    // fetch logged user
    let mounted = true;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!mounted) return;
        setUser(d.user || null);
      })
      .catch(() => setUser(null));

    fetchHistory();
    fetchStats();
    return () => {
      mounted = false;
    };
  }, [/* intentionally empty to run once; stats fetch uses current user state */]);

  useEffect(() => {
    // refetch stats when user changes
    fetchStats();
    // refetch history when auth state changes (so logged-in users see their tabs)
    fetchHistory();
  }, [user]);

  const generateMission = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/mission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, extraMode, sessionId }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        // If user hit usage limit, show upgrade modal
        if (res.status === 403) {
          setShowUpgradeModal(true);
        } else {
          setError(errorData.error || "Nie udało się wygenerować misji");
        }
        setLoading(false);
        return;
      }
      const data = await res.json();
      setMission(data);
      fetchHistory();
      fetchStats();
    } catch (error) {
      console.error("Error generating mission:", error);
      setError("Wystąpił błąd podczas generowania misji");
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!user) {
      router.push("/login");
      return;
    }

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Error creating checkout:", error);
    }
  };

  const handlePurchaseUsage = async (packageType: string) => {
    if (!user) {
      router.push("/login");
      return;
    }

    setPurchasingPackage(packageType);
    try {
      const res = await fetch("/api/stripe/purchase-usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageType }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Wystąpił błąd podczas tworzenia sesji płatności");
        setPurchasingPackage(null);
      }
    } catch (error) {
      console.error("Error purchasing usage:", error);
      alert("Wystąpił błąd podczas zakupu użyć");
      setPurchasingPackage(null);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-50 p-4 pb-24 flex flex-col gap-6 max-w-md mx-auto">
      <header className="text-center">
        <div className="flex items-center justify-center mb-2">
          <h1 className="text-2xl font-semibold">
            Dzisiejsza Misja dla Was
          </h1>
        </div>
        <p className="text-neutral-500 text-sm mt-1">
          Jedna chwila. Jedno połączenie.
        </p>
      </header>

      {stats && (
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-600">Pozostało użyć:</span>
            <span className="text-sm font-semibold">
              {stats.usage.remaining} / {stats.usage.limit}
            </span>
          </div>
          {stats.isLoggedIn && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600">Kredyty:</span>
                <div className="flex items-center">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-gradient-to-r from-yellow-50 via-white to-yellow-50 border border-yellow-100 text-yellow-700 rounded-full px-3 py-1 shadow-sm">
                      <img src="/icons/credit.png" alt="kredyty" className="w-4 h-4 mr-2" />
                      <span className="text-sm font-semibold">{stats.credits}</span>
                    </div>
                  </div>
                </div>
              </div>
              {!stats.isSubscribed && (
                <>
                  <button
                    onClick={handleSubscribe}
                    className="w-full rounded-lg bg-orange-500 text-white py-2 text-sm font-medium active:scale-95 transition"
                  >
                    Wykup Premium (30 użyć/tydzień)
                  </button>
                  <div className="mt-3 space-y-2 text-xs text-neutral-600">
                    <div className="flex items-start gap-2">
                      <span className="text-orange-500 mt-0.5">✓</span>
                      <span>Niekonwencjonalne i mniej powtarzalne misje z trybem <span className="font-semibold">*ekstra*</span></span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-orange-500 mt-0.5">✓</span>
                      <span>30 użyć odnawiane co tydzień</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-orange-500 mt-0.5">✓</span>
                      <span>3x więcej kredytów przy generowaniu misji</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-orange-500 mt-0.5">✓</span>
                      <span>Możliwość wymiany kredytów na użycia</span>
                    </div>
                  </div>
                </>
              )}
              {stats.isSubscribed && (
                <div className="text-xs text-orange-600 bg-orange-50 rounded-lg p-2 text-center">
                  ✓ Subskrypcja aktywna
                </div>
              )}
            </>
          )}
          {!stats.isLoggedIn && (
            <div className="text-xs text-neutral-500 text-center">
              <Link href="/register" className="text-black font-medium hover:underline">
                Zarejestruj się
              </Link>{" "}
              lub{" "}
              <Link href="/login" className="text-black font-medium hover:underline">
                zaloguj
              </Link>{" "}
              aby uzyskać więcej użyć i kredytów
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-neutral-600">
            Wybierz kategorię
          </h2>
          <div className="flex items-center gap-3">
            {/* badge first, then toggle */}
            {extraMode ? (
              <span className="inline-flex items-center text-xs font-semibold bg-orange-500 text-white px-2 py-0.5 rounded-full tracking-wide">
                TRYB EKSTRA
              </span>
            ) : (
              <span className="inline-flex items-center text-xs text-neutral-500 px-2 py-0.5 rounded-full border border-neutral-200">
                Tryb ekstra
              </span>
            )}
            <label
              className={`flex items-center gap-2 ${
                stats?.isLoggedIn ? "cursor-pointer group" : "cursor-default opacity-60"
              }`}
              onClick={(e) => {
                // If user is not subscribed, open subscribe flow instead of toggling
                if (!stats?.isSubscribed) {
                  e.preventDefault();
                  setShowUpgradeModal(true);
                }
              }}
            >
              <div className="relative">
                <input
                  type="checkbox"
                  checked={extraMode && !!stats?.isSubscribed}
                  onChange={(e) => {
                    // Only allow toggling if subscribed
                    if (stats?.isSubscribed) {
                      setExtraMode(e.target.checked);
                    } else {
                      setShowUpgradeModal(true);
                    }
                  }}
                  className="sr-only"
                  disabled={!stats?.isSubscribed}
                />
                <div
                  className={`w-14 h-7 rounded-full transition-colors duration-200 flex items-center px-1 ${
                    extraMode && stats?.isSubscribed ? "bg-orange-500" : "bg-neutral-300"
                  }`}
                >
                  <div
                    className={`w-6 h-6 bg-white rounded-full shadow-sm transform transition-transform duration-200 ${
                      extraMode && stats?.isSubscribed ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </div>
              </div>
            </label>
          </div>
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
        className={`w-full rounded-xl text-white py-4 text-lg font-medium active:scale-95 transition relative ${
          loading ? "animate-pulse-glow bg-black overflow-hidden" : "button-animated-border"
        }`}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="w-5 h-5 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            AI myśli dla was…
          </span>
        ) : (
          "Wygeneruj misję"
        )}
      </button>

      {mission && (
        <div className="rounded-2xl bg-white p-5 shadow-sm animate-mission-appear relative">
          {mission.extraMode && (
            <div className="absolute -top-3 -right-3 animate-mission-appear" style={{ animationDelay: "0.2s", animationFillMode: "both" }}>
              <span className="inline-flex items-center text-xs font-semibold bg-orange-500 text-white px-3 py-1 rounded-full shadow-sm">
                TRYB EKSTRA
              </span>
            </div>
          )}
          <p className="text-sm text-neutral-400 mb-2">
            Kategoria: {mission.category}
          </p>
          <p className="text-lg">{mission.content}</p>
        </div>
      )}
      
      {loading && !mission && (
        <div className="rounded-2xl bg-white p-5 shadow-sm animate-shimmer">
          <div className="h-4 bg-neutral-200 rounded w-1/4 mb-3"></div>
          <div className="h-6 bg-neutral-200 rounded w-full mb-2"></div>
          <div className="h-6 bg-neutral-200 rounded w-3/4"></div>
        </div>
      )}

      {/* Upgrade modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-2">Osiągnięto limit użyć</h3>
            <p className="text-sm text-neutral-600 mb-4">
              Wyczerpałeś dostępne użycia. Możesz dokupić dodatkowe użycia lub wykupić subskrypcję Premium.
            </p>
            
            {user && (
              <>
                <div className="mb-4">
                  <h4 className="text-sm font-semibold mb-2">Dokup użycia (jednorazowo):</h4>
                  <div className="space-y-2">
                    <button
                      onClick={() => handlePurchaseUsage("small")}
                      disabled={purchasingPackage !== null}
                      className="w-full rounded-lg border border-neutral-200 py-2 px-4 text-left hover:bg-neutral-50 active:scale-95 transition disabled:opacity-50"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-sm">30 użyć</span>
                        <span className="font-semibold">8.99 zł</span>
                      </div>
                    </button>
                    <button
                      onClick={() => handlePurchaseUsage("medium")}
                      disabled={purchasingPackage !== null}
                      className="w-full rounded-lg border border-neutral-200 py-2 px-4 text-left hover:bg-neutral-50 active:scale-95 transition disabled:opacity-50"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-sm">300 użyć</span>
                        <span className="font-semibold">79.99 zł</span>
                      </div>
                    </button>
                    <button
                      onClick={() => handlePurchaseUsage("large")}
                      disabled={purchasingPackage !== null}
                      className="w-full rounded-lg border border-neutral-200 py-2 px-4 text-left hover:bg-neutral-50 active:scale-95 transition disabled:opacity-50"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-sm">3000 użyć</span>
                        <span className="font-semibold">699.99 zł</span>
                      </div>
                    </button>
                  </div>
                </div>
                
                <div className="mb-4">
                  <h4 className="text-sm font-semibold mb-2">Lub wykup subskrypcję:</h4>
                  <button
                    onClick={async () => {
                      setShowUpgradeModal(false);
                      await handleSubscribe();
                    }}
                    className="w-full rounded-lg bg-orange-500 text-white py-2 text-sm font-medium hover:bg-orange-600 active:scale-95 transition"
                  >
                    Wykup Premium (30 użyć/tydzień)
                  </button>
                  <div className="mt-3 space-y-2 text-xs text-neutral-600">
                    <div className="flex items-start gap-2">
                      <span className="text-orange-500 mt-0.5">✓</span>
                      <span>Niekonwencjonalne i mniej powtarzalne pomysły z trybem <span className="font-semibold">*ekstra*</span></span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-orange-500 mt-0.5">✓</span>
                      <span>30 użyć odnawiane co tydzień</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-orange-500 mt-0.5">✓</span>
                      <span>3x więcej kredytów przy generowaniu misji</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-orange-500 mt-0.5">✓</span>
                      <span>Możliwość wymiany kredytów na użycia</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {!user && (
              <div className="text-center">
                <p className="text-sm text-neutral-600 mb-4">
                  Zaloguj się, aby dokupić użycia lub wykupić subskrypcję.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => router.push("/login")}
                    className="flex-1 rounded-lg border border-neutral-200 py-2 text-sm"
                  >
                    Zaloguj się
                  </button>
                  <button
                    onClick={() => router.push("/register")}
                    className="flex-1 rounded-lg bg-orange-500 text-white py-2 text-sm"
                  >
                    Zarejestruj się
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => {
                setShowUpgradeModal(false);
                setPurchasingPackage(null);
              }}
              className="w-full rounded-lg border border-neutral-200 py-2 text-sm mt-2"
            >
              Anuluj
            </button>
          </div>
        </div>
      )}

      <section className="mt-6">
        <h2 className="text-sm text-neutral-500 mb-2">
          Poprzednie misje
        </h2>
        {/* Zakładki dla zalogowanych — estetyczny segmented control z ikonami i focus */}
        {stats?.isLoggedIn ? (
          <div className="mb-3 flex justify-center">
            <div
              role="tablist"
              aria-label="Historia misji"
              className="inline-flex bg-neutral-100 p-1 rounded-full shadow-sm"
            >
              <button
                role="tab"
                aria-selected={activeTab === "general"}
                onClick={() => {
                  setActiveTab("general");
                  fetchHistory("general", 1, false);
                }}
                className={`relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-neutral-300 ${
                  activeTab === "general"
                    ? "bg-white text-neutral-900 shadow"
                    : "text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M12 2a10 10 0 100 20 10 10 0 000-20z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M2 12h20M12 2c2.5 3 2.5 18 0 20M6 6c4 2 12 2 16 0" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="whitespace-nowrap">Ogólne</span>
              </button>

              <button
                role="tab"
                aria-selected={activeTab === "mine"}
                onClick={() => {
                  setActiveTab("mine");
                  fetchHistory("mine", 1, false);
                }}
                className={`relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-neutral-300 ${
                  activeTab === "mine"
                    ? "bg-white text-neutral-900 shadow"
                    : "text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M12 12a4 4 0 100-8 4 4 0 000 8z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M20 21v-1a4 4 0 00-4-4H8a4 4 0 00-4 4v1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="whitespace-nowrap">Własne</span>
              </button>

              <button
                role="tab"
                aria-selected={activeTab === "liked"}
                onClick={() => {
                  setActiveTab("liked");
                  fetchHistory("liked", 1, false);
                }}
                className={`relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-neutral-300 ${
                  activeTab === "liked"
                    ? "bg-white text-neutral-900 shadow"
                    : "text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
                <span className="whitespace-nowrap">Polubione</span>
              </button>
            </div>
          </div>
        ) : null}

        <ul className="space-y-3">
          {history.map((m) => (
            <li
              key={m.id}
              className="rounded-xl bg-white p-4 text-sm shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-neutral-400">Kategoria: {m.category}</p>
                <div className="flex items-center gap-2">
                  {m.ratingScore !== undefined && m.ratingScore > 0 && (
                    <div className="flex items-center gap-1 text-xs">
                      <span>❤️</span>
                      <span className="font-semibold text-red-600">{m.ratingScore}</span>
                    </div>
                  )}
                  {m.extraMode && (
                    <span className="text-xs font-semibold bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">
                      EKSTRA
                    </span>
                  )}
                </div>
              </div>
              <p>{m.content}</p>
            </li>
          ))}
        </ul>
        
        {/* Pagination for history - only show if more than 20 missions and in mine/liked tabs */}
        {hasMoreHistory && (activeTab === "mine" || activeTab === "liked") && history.length >= HISTORY_PER_PAGE && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => {
                const nextPage = currentPage + 1;
                setCurrentPage(nextPage);
                fetchHistory(activeTab, nextPage, true);
              }}
              disabled={loadingMoreHistory}
              className="px-4 py-2 rounded-lg bg-neutral-100 text-neutral-700 text-sm font-medium hover:bg-neutral-200 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingMoreHistory ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Ładowanie...
                </span>
              ) : (
                "Załaduj więcej"
              )}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
