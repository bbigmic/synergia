"use client";

import { useEffect, useState } from "react";

interface ConfettiProps {
  trigger: boolean;
  duration?: number;
}

export default function Confetti({ trigger, duration = 2000 }: ConfettiProps) {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (trigger) {
      setIsActive(true);
      const timer = setTimeout(() => {
        setIsActive(false);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [trigger, duration]);

  if (!isActive) return null;

  const particles = Array.from({ length: 25 }, (_, i) => i);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((i) => {
        const colors = ["#f97316", "#ec4899", "#fbbf24", "#10b981", "#3b82f6"];
        const color = colors[i % colors.length];
        const left = Math.random() * 100;
        const delay = Math.random() * 0.5;
        const animDuration = 1 + Math.random() * 0.5;
        const size = 6 + Math.random() * 4;

        return (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${left}%`,
              top: "-10px",
              width: `${size}px`,
              height: `${size}px`,
              backgroundColor: color,
              animation: `confetti-fall ${animDuration}s ease-out ${delay}s forwards`,
              transform: `rotate(${Math.random() * 360}deg)`,
            }}
          />
        );
      })}
    </div>
  );
}

