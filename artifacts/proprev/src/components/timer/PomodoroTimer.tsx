import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Timer, Play, Pause, RotateCcw, X, Coffee, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

type Mode = "focus" | "short" | "long";

const DEFAULT_SECONDS: Record<Mode, number> = {
  focus: 25 * 60,
  short: 5 * 60,
  long:  15 * 60,
};

const MODE_META: Record<Mode, { label: string; color: string; icon: typeof Brain }> = {
  focus: { label: "Focus",       color: "hsl(217 91% 60%)", icon: Brain },
  short: { label: "Short Break", color: "hsl(142 71% 45%)", icon: Coffee },
  long:  { label: "Long Break",  color: "hsl(199 89% 48%)", icon: Coffee },
};

function playDone() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.8);
  } catch {
    // audio not available
  }
}

export function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

const SIZE = 120;
const STROKE = 6;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// ---------------------------------------------------------------------------
// PomodoroTimer panel
// ---------------------------------------------------------------------------

interface PomodoroTimerProps {
  onClose: () => void;
  onStateChange: (seconds: number, running: boolean) => void;
  /** When set (via a chat suggestion), override the default focus duration. */
  presetMinutes?: number;
}

export function PomodoroTimer({ onClose, onStateChange, presetMinutes = 25 }: PomodoroTimerProps) {
  const focusSeconds = presetMinutes * 60;

  const [mode, setMode] = useState<Mode>("focus");
  const [secondsLeft, setSecondsLeft] = useState(focusSeconds);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // total for the current mode (focus respects the preset)
  const total = mode === "focus" ? focusSeconds : DEFAULT_SECONDS[mode];
  const progress = secondsLeft / total;
  const dashOffset = CIRCUMFERENCE * (1 - progress);
  const modeColor = MODE_META[mode].color;
  const ModeIcon = MODE_META[mode].icon;

  // Report state up
  useEffect(() => {
    onStateChange(secondsLeft, running);
  }, [secondsLeft, running, onStateChange]);

  const reset = useCallback(() => {
    setRunning(false);
    setSecondsLeft(mode === "focus" ? focusSeconds : DEFAULT_SECONDS[mode]);
  }, [mode, focusSeconds]);

  const switchMode = (m: Mode) => {
    setRunning(false);
    setMode(m);
    setSecondsLeft(m === "focus" ? focusSeconds : DEFAULT_SECONDS[m]);
  };

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            clearInterval(intervalRef.current!);
            setRunning(false);
            playDone();
            if (mode === "focus") setSessions((n) => n + 1);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current!);
    }
    return () => clearInterval(intervalRef.current!);
  }, [running, mode]);

  // Custom label when preset overrides the default
  const focusTabLabel = presetMinutes !== 25 ? `Focus (${presetMinutes}m)` : "Focus";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: -8 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="absolute top-14 right-4 z-50 w-72 rounded-2xl border border-border/60 bg-card shadow-2xl shadow-black/40 backdrop-blur-xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Pomodoro Timer</span>
        </div>
        <button
          onClick={onClose}
          data-testid="button-close-timer"
          className="text-muted-foreground hover:text-foreground transition-colors rounded-md p-1 hover:bg-secondary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1 px-4 pb-3">
        {(Object.keys(DEFAULT_SECONDS) as Mode[]).map((m) => (
          <button
            key={m}
            data-testid={`button-mode-${m}`}
            onClick={() => switchMode(m)}
            className={cn(
              "flex-1 text-xs py-1.5 rounded-lg font-medium transition-all",
              mode === m
                ? "bg-primary/20 text-primary border border-primary/30"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
            )}
          >
            {m === "focus" ? focusTabLabel : MODE_META[m].label}
          </button>
        ))}
      </div>

      {/* Ring */}
      <div className="flex flex-col items-center pb-4">
        <div className="relative flex items-center justify-center" style={{ width: SIZE, height: SIZE }}>
          <svg width={SIZE} height={SIZE} className="absolute -rotate-90">
            <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="hsl(220 30% 15%)" strokeWidth={STROKE} />
            <circle
              cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
              fill="none" stroke={modeColor} strokeWidth={STROKE} strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE} strokeDashoffset={dashOffset}
              style={{ transition: "stroke-dashoffset 0.8s linear" }}
            />
          </svg>
          <div className="absolute inset-0 rounded-full opacity-20 blur-md" style={{ background: modeColor, transform: "scale(0.75)" }} />
          <div className="relative flex flex-col items-center gap-0.5">
            <span className="text-2xl font-bold tabular-nums text-foreground tracking-tight">{formatTime(secondsLeft)}</span>
            <div className="flex items-center gap-1 text-muted-foreground">
              <ModeIcon className="h-3 w-3" />
              <span className="text-[10px] font-medium">{MODE_META[mode].label}</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={reset}
            data-testid="button-timer-reset"
            className="p-2 rounded-full border border-border/60 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setRunning((r) => !r)}
            data-testid="button-timer-toggle"
            className="flex items-center gap-2 px-5 py-2 rounded-full font-semibold text-sm transition-all"
            style={{ background: modeColor, color: "hsl(222 47% 6%)", boxShadow: running ? `0 0 16px ${modeColor}55` : "none" }}
          >
            {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {running ? "Pause" : secondsLeft === total ? "Start" : "Resume"}
          </button>
        </div>

        {/* Session dots */}
        <AnimatePresence>
          {sessions > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              <span>Sessions:</span>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(sessions, 8) }).map((_, i) => (
                  <div key={i} className="w-2 h-2 rounded-full" style={{ background: MODE_META.focus.color }} />
                ))}
                {sessions > 8 && <span className="text-foreground font-medium">+{sessions - 8}</span>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tip */}
      <div className="border-t border-border/40 px-4 py-2.5 bg-muted/20">
        <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
          {mode === "focus"
            ? "Stay focused. Close distracting tabs and go."
            : "Good work. Step away, stretch, breathe."}
        </p>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Header badge button
// ---------------------------------------------------------------------------

export function TimerHeaderButton({
  active, onClick, secondsLeft, running,
}: {
  active: boolean;
  onClick: () => void;
  secondsLeft: number | null;
  running: boolean;
}) {
  return (
    <button
      onClick={onClick}
      data-testid="button-toggle-timer"
      className={cn(
        "relative flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
        active
          ? "bg-primary/10 border-primary/30 text-primary"
          : "border-border/50 text-muted-foreground hover:text-foreground hover:bg-secondary/60"
      )}
    >
      <Timer className="h-3.5 w-3.5" />
      {secondsLeft !== null ? (
        <span className={cn("tabular-nums", running && "text-primary")}>{formatTime(secondsLeft)}</span>
      ) : (
        <span>Timer</span>
      )}
      {running && (
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary animate-pulse" />
      )}
    </button>
  );
}
