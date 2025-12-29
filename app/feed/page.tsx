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
  ratingScore: number;
  user?: {
    name: string | null;
    email: string | null;
  };
};

const categoryColors: Record<string, string> = {
  Bliskość: "from-pink-500 to-rose-500",
  Komunikacja: "from-blue-500 to-cyan-500",
  Zabawa: "from-yellow-500 to-orange-500",
  Odwaga: "from-purple-500 to-indigo-500",
};

type FeedData = {
  missions: Mission[];
  dailyLimit: number;
  used: number;
  remaining: number;
  hasReachedLimit: boolean;
};

export default function FeedPage() {
  const router = useRouter();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [swiping, setSwiping] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [startX, setStartX] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [dailyLimit, setDailyLimit] = useState(50);
  const [used, setUsed] = useState(0);
  const [remaining, setRemaining] = useState(50);
  const [hasReachedLimit, setHasReachedLimit] = useState(false);

  useEffect(() => {
    fetchMissions();
  }, []);

  const fetchMissions = async () => {
    try {
      const res = await fetch("/api/mission/feed");
      if (res.ok) {
        const data: FeedData = await res.json();
        setMissions(data.missions);
        setDailyLimit(data.dailyLimit);
        setUsed(data.used);
        setRemaining(data.remaining);
        setHasReachedLimit(data.hasReachedLimit);
        setCurrentIndex(0);
      } else if (res.status === 401) {
        router.push("/login");
      }
    } catch (error) {
      console.error("Error fetching missions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSwipe = async (direction: "left" | "right") => {
    if (currentIndex >= missions.length || isAnimating || hasReachedLimit) {
      return;
    }

    const mission = missions[currentIndex];
    setSwiping(true);
    setSwipeDirection(direction);
    setIsAnimating(true);

    // Save swipe to API
    try {
      const swipeRes = await fetch("/api/mission/feed/swipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ missionId: mission.id, direction }),
      });
      // Notify components about user update (XP awarded)
      if (swipeRes.ok) {
        window.dispatchEvent(new Event("userUpdated"));
      }
    } catch (error) {
      console.error("Error saving swipe:", error);
    }

    if (direction === "right") {
      // Like the mission
      try {
        await fetch("/api/mission/like", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ missionId: mission.id }),
        });
      } catch (error) {
        console.error("Error liking mission:", error);
      }
    }

    // Update counters
    const newUsed = used + 1;
    const newRemaining = remaining - 1;
    setUsed(newUsed);
    setRemaining(newRemaining);
    
    if (newRemaining <= 0) {
      setHasReachedLimit(true);
    }

    // Wait for animation
    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
      setSwiping(false);
      setSwipeDirection(null);
      setDragOffset(0);
      setIsAnimating(false);
    }, 400);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isAnimating) return;
    setStartX(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (startX === 0 || isAnimating) return;
    const diff = e.clientX - startX;
    setDragOffset(diff);
    
    // Update swipe direction based on drag
    if (Math.abs(diff) > 50) {
      setSwipeDirection(diff > 0 ? "right" : "left");
    } else {
      setSwipeDirection(null);
    }
  };

  const handleMouseUp = () => {
    if (isAnimating) return;
    if (Math.abs(dragOffset) > 100) {
      handleSwipe(dragOffset > 0 ? "right" : "left");
    } else {
      setDragOffset(0);
      setSwipeDirection(null);
    }
    setStartX(0);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isAnimating) return;
    setStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startX === 0 || isAnimating) return;
    const diff = e.touches[0].clientX - startX;
    setDragOffset(diff);
    
    // Update swipe direction based on drag
    if (Math.abs(diff) > 50) {
      setSwipeDirection(diff > 0 ? "right" : "left");
    } else {
      setSwipeDirection(null);
    }
  };

  const handleTouchEnd = () => {
    if (isAnimating) return;
    if (Math.abs(dragOffset) > 100) {
      handleSwipe(dragOffset > 0 ? "right" : "left");
    } else {
      setDragOffset(0);
      setSwipeDirection(null);
    }
    setStartX(0);
  };

  const getCategoryGradient = (category: string) => {
    return categoryColors[category] || "from-neutral-500 to-neutral-600";
  };

  const progress = dailyLimit > 0 ? (used / dailyLimit) * 100 : 0;

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-neutral-50 via-neutral-100 to-neutral-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-orange-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-neutral-600 font-medium">Ładowanie misji...</p>
        </div>
      </main>
    );
  }

  if (hasReachedLimit) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-neutral-50 via-neutral-100 to-neutral-50 flex items-center justify-center p-4 pb-24">
        <div className="text-center max-w-md">
          <div className="text-7xl mb-6 animate-bounce">🎉</div>
          <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
            Osiągnięto dzienny limit!
          </h2>
          <p className="text-neutral-600 mb-2 text-lg font-medium">
            Przesunąłeś już {dailyLimit} misji dzisiaj.
          </p>
          <p className="text-neutral-500 mb-8 text-base">
            Wróć jutro po kolejną dawkę misji! 🚀
          </p>
          <Link
            href="/"
            className="inline-block bg-gradient-to-r from-orange-500 to-pink-500 text-white px-8 py-4 rounded-2xl font-semibold hover:shadow-xl hover:scale-105 transition-all duration-200"
          >
            Powrót do głównej
          </Link>
        </div>
      </main>
    );
  }

  if (missions.length === 0 || currentIndex >= missions.length) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-neutral-50 via-neutral-100 to-neutral-50 flex items-center justify-center p-4 pb-24">
        <div className="text-center max-w-md">
          <div className="text-7xl mb-6 animate-bounce">🎉</div>
          <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
            Wszystkie misje przejrzane!
          </h2>
          <p className="text-neutral-600 mb-8 text-lg">
            Sprawdź później, czy pojawiły się nowe misje.
          </p>
          <Link
            href="/"
            className="inline-block bg-gradient-to-r from-orange-500 to-pink-500 text-white px-8 py-4 rounded-2xl font-semibold hover:shadow-xl hover:scale-105 transition-all duration-200"
          >
            Powrót do głównej
          </Link>
        </div>
      </main>
    );
  }

  const currentMission = missions[currentIndex];
  const nextMission = missions[currentIndex + 1];
  const categoryGradient = getCategoryGradient(currentMission.category);
  const swipeOpacity = Math.min(Math.abs(dragOffset) / 200, 1);
  const rotation = dragOffset * 0.1;

  return (
    <main className="min-h-screen bg-gradient-to-br from-neutral-50 via-neutral-100 to-neutral-50 flex flex-col items-center justify-center p-4 pb-32">
      {/* Progress indicator */}
      <div className="w-full max-w-md mb-6">
        <div className="flex items-center justify-between text-xs text-neutral-500 mb-2">
          <span>Dzisiaj: {used} / {dailyLimit} misji</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-pink-500 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        {remaining > 0 && (
          <p className="text-xs text-neutral-400 mt-1 text-center">
            Pozostało: {remaining} misji
          </p>
        )}
      </div>

      {/* Cards container */}
      <div className="w-full max-w-md relative" style={{ height: "550px", minHeight: "550px" }}>
        {/* Next card (behind) */}
        {nextMission && (
          <div
            className="absolute inset-0 bg-white rounded-3xl shadow-xl p-8 flex flex-col border border-neutral-100"
            style={{
              transform: "scale(0.92) translateY(8px)",
              opacity: 0.4,
              zIndex: 1,
            }}
          >
            <div className="flex items-center justify-between mb-6 flex-shrink-0">
              <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full bg-gradient-to-r ${getCategoryGradient(nextMission.category)} text-white`}>
                {nextMission.category}
              </span>
              {nextMission.extraMode && (
                <span className="text-xs font-semibold bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">
                  EKSTRA
                </span>
              )}
            </div>
            <p className="text-lg flex-grow text-neutral-700 leading-relaxed overflow-y-auto">{nextMission.content}</p>
          </div>
        )}

        {/* Current card */}
        <div
          className="absolute inset-0 bg-white rounded-3xl shadow-2xl p-8 flex flex-col cursor-grab active:cursor-grabbing border border-neutral-100 overflow-hidden"
          style={{
            transform: `translateX(${dragOffset}px) rotate(${rotation}deg)`,
            transition: swiping ? "none" : "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
            zIndex: 2,
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Swipe overlay - Like */}
          {swipeDirection === "right" && (
            <div
              className="absolute inset-0 bg-gradient-to-br from-green-400/30 to-emerald-500/30 rounded-3xl flex flex-col items-center justify-center z-20 backdrop-blur-sm"
              style={{ opacity: swipeOpacity }}
            >
              <div className="bg-white/90 rounded-full p-6 shadow-2xl transform scale-110">
                <svg className="w-16 h-16 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              </div>
              <p className="mt-4 text-2xl font-bold text-green-600">POLUBIONE!</p>
            </div>
          )}

          {/* Swipe overlay - Pass */}
          {swipeDirection === "left" && (
            <div
              className="absolute inset-0 bg-gradient-to-br from-red-400/30 to-rose-500/30 rounded-3xl flex flex-col items-center justify-center z-20 backdrop-blur-sm"
              style={{ opacity: swipeOpacity }}
            >
              <div className="bg-white/90 rounded-full p-6 shadow-2xl transform scale-110">
                <svg className="w-16 h-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="mt-4 text-2xl font-bold text-red-600">POMINIĘTE</p>
            </div>
          )}

          {/* Category badge with gradient */}
          <div className="flex items-center justify-between mb-6 flex-shrink-0">
            <span className={`text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-full bg-gradient-to-r ${categoryGradient} text-white shadow-lg`}>
              {currentMission.category}
            </span>
            {currentMission.extraMode && (
              <span className="text-xs font-semibold bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">
                EKSTRA
              </span>
            )}
          </div>

          {/* Mission content - scrollable if too long */}
          <div className="flex-grow flex items-start min-h-0 overflow-y-auto pt-0 pb-2">
            <p className="text-xl font-medium leading-relaxed text-neutral-800 w-full">
              {currentMission.content}
            </p>
          </div>

          {/* Footer with author and likes - always visible */}
          <div className="mt-6 pt-6 border-t border-neutral-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-pink-400 flex items-center justify-center text-white font-bold shadow-md">
                  {(currentMission.user?.name || currentMission.user?.email || "A")[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-800">
                    {currentMission.user?.name || currentMission.user?.email || "Anonimowy"}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {new Date(currentMission.createdAt).toLocaleDateString("pl-PL", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-red-50 px-4 py-2 rounded-full border border-red-100">
                <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
                <span className="font-bold text-red-600">{currentMission.ratingScore}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="fixed bottom-24 left-0 right-0 flex justify-center gap-8 z-10 px-4">
        <button
          onClick={() => handleSwipe("left")}
          disabled={swiping || isAnimating}
          className="w-20 h-20 rounded-full bg-white shadow-2xl flex items-center justify-center text-3xl hover:scale-110 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-red-100 hover:border-red-300 group"
        >
          <div className="group-hover:scale-110 transition-transform">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        </button>
        <button
          onClick={() => handleSwipe("right")}
          disabled={swiping || isAnimating}
          className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 shadow-2xl flex items-center justify-center text-3xl hover:scale-110 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          <div className="group-hover:scale-110 transition-transform">
            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </div>
        </button>
      </div>

      {/* Hint text */}
      <p className="text-xs text-neutral-400 mt-4 text-center max-w-md">
        Przesuń kartę w prawo, aby polubić • W lewo, aby pominąć
      </p>
    </main>
  );
}
