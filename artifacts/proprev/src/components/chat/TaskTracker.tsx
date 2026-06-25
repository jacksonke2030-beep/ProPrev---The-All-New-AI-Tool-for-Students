import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckSquare, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Task extraction — parse numbered & bulleted list items from markdown
// ---------------------------------------------------------------------------

interface Task {
  id: string;
  text: string;
}

const LIST_LINE_RE =
  /^(?:\d+[.)]\s+|[-*•]\s+(?!\[[ x]\]\s))(.+)$/;

// Lines that look like section headers or meta-info, not actionable tasks
const SKIP_RE =
  /^(sources?|references?|break|rest|notes?|tip|reminder)[\s:]/i;

export function extractTasks(markdown: string): Task[] {
  const lines = markdown.split("\n");
  const tasks: Task[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    const match = LIST_LINE_RE.exec(line);
    if (!match) continue;

    // Strip markdown formatting characters (bold, italic, code) from task text
    const text = match[1]
      .trim()
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/__/g, "")
      .replace(/_/g, "")
      .replace(/`/g, "")
      .trim();
    // Skip very short lines, pure heading-like text, or meta lines
    if (text.length < 8 || SKIP_RE.test(text)) continue;
    // Skip lines that are just a time marker like "25 min" alone
    if (/^\d+\s*(min|hr|hour)s?$/i.test(text)) continue;

    tasks.push({ id: `task-${tasks.length}`, text });
  }

  // Only surface if there are at least 2 real tasks
  return tasks.length >= 2 ? tasks : [];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface TaskTrackerProps {
  tasks: Task[];
}

export function TaskTracker({ tasks }: TaskTrackerProps) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState(false);

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const done = checked.size;
  const total = tasks.length;
  const pct = Math.round((done / total) * 100);
  const allDone = done === total;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.3 }}
      className="mt-2 rounded-xl border border-border/60 bg-background/60 overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        data-testid="button-task-tracker-toggle"
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-secondary/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <CheckSquare className={cn("h-3.5 w-3.5", allDone ? "text-green-400" : "text-primary")} />
          <span className="text-xs font-semibold text-foreground">
            {allDone ? "All tasks complete!" : `Task Checklist — ${done}/${total} done`}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Progress bar */}
          <div className="w-20 h-1.5 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className={cn("h-full rounded-full", allDone ? "bg-green-400" : "bg-primary")}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground tabular-nums w-7 text-right">
            {pct}%
          </span>
          {collapsed ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Task list */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 pt-1 flex flex-col gap-1.5">
              {tasks.map((task) => {
                const isChecked = checked.has(task.id);
                return (
                  <button
                    key={task.id}
                    data-testid={`button-task-${task.id}`}
                    onClick={() => toggle(task.id)}
                    className={cn(
                      "flex items-start gap-2.5 text-left px-2 py-1.5 rounded-lg transition-all duration-200 group",
                      isChecked
                        ? "bg-primary/5 text-muted-foreground"
                        : "hover:bg-secondary/60 text-card-foreground"
                    )}
                  >
                    {/* Custom checkbox */}
                    <div
                      className={cn(
                        "mt-0.5 flex-shrink-0 w-4 h-4 rounded border transition-all duration-200 flex items-center justify-center",
                        isChecked
                          ? "bg-primary border-primary"
                          : "border-border/70 group-hover:border-primary/60"
                      )}
                    >
                      {isChecked && (
                        <motion.svg
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.2 }}
                          viewBox="0 0 10 10"
                          className="w-2.5 h-2.5 stroke-primary-foreground"
                          fill="none"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <motion.path
                            d="M1.5 5 L4 7.5 L8.5 2.5"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 0.2 }}
                          />
                        </motion.svg>
                      )}
                    </div>

                    <span
                      className={cn(
                        "text-xs leading-relaxed transition-all duration-200",
                        isChecked && "line-through opacity-50"
                      )}
                    >
                      {task.text}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* All done banner */}
            <AnimatePresence>
              {allDone && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mx-4 mb-3 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-xs text-green-400 font-medium text-center"
                >
                  Great work! All tasks completed.
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export { type Task };
