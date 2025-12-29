"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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

export default function RankingPage() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const observerTarget = useRef<HTMLDivElement>(null);

  const fetchRanking = useCallback(async (initial = false) => {
    try {
      if (initial) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      setMissions((prevMissions) => {
        const skip = initial ? 0 : prevMissions.length;
        const take = 10;
        
        // Fetch data asynchronously
        (async () => {
          try {
            const res = await fetch(`/api/mission/ranking?skip=${skip}&take=${take}`);
            if (res.ok) {
              const data = await res.json();
              
              if (initial) {
                setMissions(data);
              } else {
                setMissions((prev) => [...prev, ...data]);
              }
              
              // Jeśli otrzymaliśmy mniej niż 10 misji, oznacza to, że nie ma więcej
              setHasMore(data.length === take);
            }
          } catch (error) {
            console.error("Error fetching ranking:", error);
          } finally {
            setLoading(false);
            setLoadingMore(false);
          }
        })();
        
        return prevMissions;
      });
    } catch (error) {
      console.error("Error fetching ranking:", error);
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Fetch initial data
  useEffect(() => {
    fetchRanking(true);
  }, [fetchRanking]);

  // Infinite scroll observer
  useEffect(() => {
    if (!hasMore || loadingMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchRanking(false);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loadingMore, loading, fetchRanking]);

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-50 p-4 pb-24">
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-neutral-600">Ładowanie rankingu...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-50 p-4 pb-24">
      <div className="max-w-2xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">🏆 Ranking Misji</h1>
          <p className="text-neutral-600 text-sm">
            Najbardziej polubione misje społeczności
          </p>
        </header>

        {missions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-neutral-600">Brak misji w rankingu</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {missions.map((mission, index) => (
                <div
                  key={mission.id}
                  className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                        {index + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-neutral-400 uppercase tracking-wide">
                            {mission.category}
                          </span>
                          {mission.extraMode && (
                            <span className="text-xs font-semibold bg-orange-500 text-white px-2 py-0.5 rounded-full">
                              EKSTRA
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-neutral-500 mt-1">
                          {mission.user?.name || mission.user?.email || "Anonimowy"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-red-50 px-3 py-1.5 rounded-full border border-red-100">
                      <span className="text-lg">❤️</span>
                      <span className="font-bold text-red-600">{mission.ratingScore}</span>
                    </div>
                  </div>
                  <p className="text-base leading-relaxed text-neutral-800">
                    {mission.content}
                  </p>
                  <p className="text-xs text-neutral-400 mt-3">
                    {new Date(mission.createdAt).toLocaleDateString("pl-PL", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              ))}
            </div>
            
            {/* Infinite scroll trigger */}
            <div ref={observerTarget} className="h-10 flex items-center justify-center">
              {loadingMore && (
                <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
              )}
            </div>
            
            {!hasMore && missions.length > 0 && (
              <div className="text-center py-8">
                <p className="text-neutral-500 text-sm">To wszystkie misji w rankingu</p>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

