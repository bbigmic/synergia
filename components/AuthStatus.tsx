 "use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getRequiredXPForLevel, getXPForLevel } from "@/lib/experience";
import Confetti from "./Confetti";

type User = {
  id: string;
  email?: string | null;
  name?: string | null;
  level?: number;
  experience?: number;
};

export default function AuthStatus() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [isLevelAnimating, setIsLevelAnimating] = useState(false);
  const previousLevelRef = useRef<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    let isInitialLoad = true;

    const fetchUser = () => {
      fetch("/api/auth/me")
        .then((r) => r.json())
        .then((data) => {
          if (!mounted) return;
          
          const newUser = data.user || null;
          
          // Check for level up (only after initial load)
          if (!isInitialLoad && newUser && previousLevelRef.current !== null) {
            const oldLevel = previousLevelRef.current;
            const newLevel = newUser.level || 1;
            
            if (newLevel > oldLevel) {
              // Level up detected!
              setShowLevelUp(true);
              setIsLevelAnimating(true);
              
              // Reset animation after it completes
              setTimeout(() => {
                setIsLevelAnimating(false);
              }, 1000);
              
              // Hide confetti after duration
              setTimeout(() => {
                setShowLevelUp(false);
              }, 2000);
            }
          }
          
          // Update previous level
          if (newUser) {
            previousLevelRef.current = newUser.level || 1;
          } else {
            previousLevelRef.current = null;
          }
          
          setUser(newUser);
          isInitialLoad = false;
        })
        .catch(() => {
          if (!mounted) return;
          setUser(null);
          previousLevelRef.current = null;
          isInitialLoad = false;
        });
    };

    const handler = () => {
      fetchUser();
    };
    
    // Initial fetch
    fetchUser();
    
    // Listen to auth changes
    window.addEventListener("authChanged", handler);
    // Listen to user updates (XP, level changes)
    window.addEventListener("userUpdated", handler);
    
    // Refresh user data when window gains focus (for server-side updates like webhooks)
    const handleFocus = () => {
      fetchUser();
    };
    window.addEventListener("focus", handleFocus);
    
    // Also poll every 10 seconds for server-side updates (like webhook XP awards)
    const pollInterval = setInterval(() => {
      fetchUser();
    }, 10000);
    
    return () => {
      mounted = false;
      window.removeEventListener("authChanged", handler);
      window.removeEventListener("userUpdated", handler);
      window.removeEventListener("focus", handleFocus);
      clearInterval(pollInterval);
    };
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    // notify other components
    window.dispatchEvent(new Event("authChanged"));
    router.push("/");
    router.refresh();
  };

  if (user === undefined) {
    return <div>...</div>;
  }

  if (!user) {
    return (
      <div className="flex items-center gap-4">
        <Link href="/register" className="text-sm hidden sm:inline">Zarejestruj</Link>
        <Link href="/login" className="text-sm font-medium">Zaloguj</Link>
      </div>
    );
  }

  const level = user.level || 1;
  const experience = user.experience || 0;
  const xpForCurrentLevel = getXPForLevel(level);
  const xpInCurrentLevel = experience - xpForCurrentLevel;
  const xpNeededForNext = getRequiredXPForLevel(level);
  const progressPercentage = Math.min(100, (xpInCurrentLevel / xpNeededForNext) * 100);

  return (
    <>
      <Confetti trigger={showLevelUp} duration={2000} />
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Experience bar - only show if user has level/experience data */}
        {user.level !== undefined && user.experience !== undefined && (
          <div className="flex flex-col items-end gap-0.5 sm:gap-1 min-w-[80px] sm:min-w-[120px] relative">
            <div className="w-full h-1 sm:h-1.5 bg-neutral-200 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all duration-500 ${
                  isLevelAnimating ? "animate-xp-bar-fill" : ""
                }`}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="text-[10px] sm:text-xs text-neutral-600">
              <span
                className={`font-medium inline-block ${
                  isLevelAnimating ? "animate-level-up animate-level-glow text-orange-600" : ""
                }`}
              >
                LVL {level}
              </span>
              <span className="hidden sm:inline">{" • "}</span>
              <span className="hidden sm:inline text-neutral-500">{xpInCurrentLevel} / {xpNeededForNext} XP</span>
              <span className="sm:hidden text-neutral-500"> {xpInCurrentLevel}/{xpNeededForNext}</span>
            </div>
          </div>
        )}
      <Link
        href="/profile"
        className="text-sm text-neutral-700 hover:underline truncate inline-block max-w-[10rem] sm:max-w-[14rem] hidden sm:inline"
      >
        {user.name || user.email}
      </Link>
      <Link href="/profile" className="sm:hidden" aria-label="Profil">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5 h-5 text-neutral-700"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 9a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a7.5 7.5 0 0115 0"
            />
          </svg>

      </Link>
      <button onClick={handleLogout} className="text-xs sm:text-sm text-red-600 whitespace-nowrap flex-shrink-0">Wyloguj</button>
      </div>
    </>
  );
}


