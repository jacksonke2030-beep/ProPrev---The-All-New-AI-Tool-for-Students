import { useState, useEffect } from "react";

const STORAGE_KEY = "proprev-streak";

interface StreakData {
  lastVisit: string; // "YYYY-MM-DD"
  count: number;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function loadStreak(): StreakData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { lastVisit: "", count: 0 };
    return JSON.parse(raw) as StreakData;
  } catch {
    return { lastVisit: "", count: 0 };
  }
}

function computeStreak(saved: StreakData): StreakData {
  const t = today();
  if (saved.lastVisit === t) {
    return saved; // already visited today — no change
  }
  if (saved.lastVisit === yesterday()) {
    return { lastVisit: t, count: saved.count + 1 }; // consecutive day
  }
  return { lastVisit: t, count: 1 }; // streak reset
}

export function useStreak(): number {
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const saved = loadStreak();
    const updated = computeStreak(saved);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // storage unavailable — ignore
    }
    setStreak(updated.count);
  }, []);

  return streak;
}
