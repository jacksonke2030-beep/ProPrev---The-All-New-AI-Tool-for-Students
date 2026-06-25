import React, { useState, useMemo } from "react";
import { Message } from "@/hooks/use-chat";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Cpu, User, Copy, Check, Timer, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { TaskTracker, extractTasks } from "@/components/chat/TaskTracker";

// ---------------------------------------------------------------------------
// Sources extraction — strip ### Sources block from rendered markdown,
// parse filenames as citation fallback
// ---------------------------------------------------------------------------

interface ParsedSources {
  cleanContent: string;
  filenames: string[];
}

function extractAndStripSources(content: string): ParsedSources {
  // Match a markdown heading that says "Sources" (any level, any case)
  const headingMatch = content.match(/^#{1,4}\s+sources?\b.*$/im);
  if (!headingMatch) return { cleanContent: content, filenames: [] };

  const headingIdx = content.indexOf(headingMatch[0]);
  const cleanContent = content.slice(0, headingIdx).trimEnd();
  const sourcesBlock = content.slice(headingIdx + headingMatch[0].length);

  const filenames: string[] = [];
  for (const raw of sourcesBlock.split("\n")) {
    const line = raw.trim().replace(/^[-*•\d.]+\s*/, "").trim();
    if (!line || /^\[no sources/i.test(line) || line.length < 3) continue;
    filenames.push(line);
  }

  return { cleanContent, filenames };
}

// ---------------------------------------------------------------------------
// Timer suggestion detection
// ---------------------------------------------------------------------------

interface TimerSuggestion {
  label: string;
  minutes: number;
  sessions: number;
}

function detectTimerSuggestion(content: string): TimerSuggestion | null {
  if (!content || content.length < 40) return null;

  const hasPlanStructure =
    /^(\d+\.|[-•*])\s/m.test(content) ||
    /checklist|step \d|task \d/i.test(content);

  const hasTimeKeyword =
    /session|pomodoro|focus block|study block|work block|break time|minutes?\s+(of\s+)?(work|study|focus)/i.test(content);

  const hasMinutes = /\d+\s*[-–]?\s*min(ute)?s?/i.test(content);

  if (!hasPlanStructure && !hasTimeKeyword) return null;
  if (!hasMinutes && !hasTimeKeyword) return null;

  const sessionMatch = content.match(/(\d+)\s*(session|pomodoro|focus block|study block)/i);
  const sessions = sessionMatch ? Math.min(parseInt(sessionMatch[1]), 8) : 1;

  const minuteMatch = content.match(/(\d+)\s*[-–]?\s*min(ute)?s?/i);
  const rawMinutes = minuteMatch ? parseInt(minuteMatch[1]) : 25;
  const minutes = Math.min(Math.max(rawMinutes, 5), 60);

  const label =
    sessions > 1
      ? `Start first ${minutes}-min focus session (${sessions} planned)`
      : `Start a ${minutes}-min focus session`;

  return { label, minutes, sessions };
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MessageBubbleProps {
  message: Message;
  onStartTimer?: (minutes: number) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MessageBubble({ message, onStartTimer }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [timerDismissed, setTimerDismissed] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Strip the ### Sources block from the rendered content; parse filenames as fallback
  const { cleanContent, filenames: parsedFilenames } = useMemo(
    () =>
      !isUser && message.content
        ? extractAndStripSources(message.content)
        : { cleanContent: message.content, filenames: [] },
    [isUser, message.content]
  );

  // Merge annotation-based citations with text-parsed filenames (dedup by name)
  const allCitations = useMemo(() => {
    if (isUser || message.isStreaming) return [];
    const base = message.citations ?? [];
    const seen = new Set(base.map((c) => c.filename));
    const extras = parsedFilenames
      .filter((f) => !seen.has(f))
      .map((f) => ({ filename: f }));
    return [...base, ...extras];
  }, [isUser, message.isStreaming, message.citations, parsedFilenames]);

  const suggestion =
    !isUser && !message.isStreaming && !timerDismissed && cleanContent
      ? detectTimerSuggestion(cleanContent)
      : null;

  const tasks = useMemo(
    () => (!isUser && !message.isStreaming && cleanContent ? extractTasks(cleanContent) : []),
    [isUser, message.isStreaming, cleanContent]
  );

  return (
    <div
      className={cn(
        "flex w-full max-w-4xl mx-auto py-4 px-4 group",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "flex gap-3 max-w-[85%]",
          isUser ? "flex-row-reverse" : "flex-row"
        )}
      >
        {/* Avatar */}
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border shadow-sm mt-1 overflow-hidden",
            isUser
              ? "bg-primary text-primary-foreground border-primary/20"
              : message.isStreaming
                ? "bg-[#030c1a] border-cyan-500/60 shadow-[0_0_12px_2px_rgba(0,220,255,0.35)]"
                : "bg-[#030c1a] border-cyan-500/20"
          )}
        >
          {isUser ? (
            <User className="h-4 w-4" />
          ) : (
            <img
              src={`${import.meta.env.BASE_URL}logo.png`}
              alt="Prevy"
              className={cn(
                "h-full w-full object-cover",
                message.isStreaming && "animate-pulse"
              )}
            />
          )}
        </div>

        <div className="flex flex-col gap-2 min-w-0 w-full">
          {/* Bubble */}
          <div
            className={cn(
              "relative px-5 py-4 rounded-2xl text-[15px] leading-relaxed",
              isUser
                ? "bg-primary/10 text-foreground rounded-tr-sm border border-primary/20"
                : "bg-card text-card-foreground rounded-tl-sm border shadow-sm"
            )}
          >
            {message.content ? (
              <>
                {isUser ? (
                  <div className="whitespace-pre-wrap">{message.content}</div>
                ) : (
                  <div
                    className="prose prose-sm prose-invert max-w-none
                      [&>*:first-child]:mt-0 [&>*:last-child]:mb-0
                      [&_h1]:text-foreground [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mb-2 [&_h1]:mt-4
                      [&_h2]:text-foreground [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:mt-3
                      [&_h3]:text-foreground [&_h3]:text-[13px] [&_h3]:font-semibold [&_h3]:mb-1 [&_h3]:mt-3
                      [&_p]:text-card-foreground [&_p]:mb-2 [&_p]:leading-relaxed
                      [&_ul]:list-disc [&_ul]:ml-4 [&_ul]:mb-2 [&_ul]:space-y-1
                      [&_ol]:list-decimal [&_ol]:ml-4 [&_ol]:mb-2 [&_ol]:space-y-1
                      [&_li]:text-card-foreground [&_li]:leading-relaxed
                      [&_strong]:text-foreground [&_strong]:font-semibold
                      [&_em]:text-muted-foreground
                      [&_code]:bg-muted [&_code]:text-accent [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono
                      [&_pre]:bg-muted [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:overflow-x-auto [&_pre]:mb-3
                      [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-accent
                      [&_blockquote]:border-l-2 [&_blockquote]:border-primary/50 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_blockquote]:italic
                      [&_hr]:border-border [&_hr]:my-3
                      [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2
                      [&_li:has(input[type=checkbox])]:list-none [&_li:has(input[type=checkbox])]:flex [&_li:has(input[type=checkbox])]:items-center [&_li:has(input[type=checkbox])]:gap-2
                    "
                  >
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {cleanContent}
                    </ReactMarkdown>
                  </div>
                )}

                {/* Copy button */}
                {!isUser && !message.isStreaming && (
                  <button
                    onClick={handleCopy}
                    data-testid="button-copy-message"
                    className="absolute -bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center gap-1 bg-secondary border border-border text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md shadow-sm"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3 text-green-400" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                )}
              </>
            ) : (
              message.isStreaming && (
                <div className="flex items-center gap-1 h-5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce [animation-delay:300ms]" />
                </div>
              )
            )}
          </div>

          {/* Interactive task checklist */}
          {tasks.length > 0 && <TaskTracker tasks={tasks} />}

          {/* Citations — always shown when present, sourced from annotations + text */}
          {allCitations.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-1 pb-1">
              {allCitations.map((cite, idx) => (
                <Citation key={idx} filename={cite.filename} index={idx + 1} />
              ))}
            </div>
          )}

          {/* Timer suggestion chip */}
          <AnimatePresence>
            {suggestion && onStartTimer && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.97 }}
                transition={{ delay: 0.6, duration: 0.25 }}
                className="flex items-center gap-2 mt-0.5"
              >
                <button
                  data-testid="button-start-timer-suggestion"
                  onClick={() => {
                    onStartTimer(suggestion.minutes);
                    setTimerDismissed(true);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium
                    bg-primary/10 border border-primary/25 text-primary
                    hover:bg-primary/20 hover:border-primary/50 transition-all duration-200 shadow-sm group/chip"
                >
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 group-hover/chip:bg-primary/30 transition-colors">
                    <Play className="h-2.5 w-2.5 fill-primary text-primary" />
                  </div>
                  <span>{suggestion.label}</span>
                  <Timer className="h-3 w-3 opacity-60" />
                </button>
                <button
                  data-testid="button-dismiss-timer-suggestion"
                  onClick={() => setTimerDismissed(true)}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors px-1"
                >
                  dismiss
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Citation pill
// ---------------------------------------------------------------------------

function Citation({ filename, index }: { filename: string; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.button
      layout
      onClick={() => setExpanded(!expanded)}
      className="flex items-center gap-1.5 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs font-medium px-2 py-1 rounded-md transition-colors border border-border"
    >
      <span className="text-accent">[{index}]</span>
      <AnimatePresence mode="popLayout">
        {expanded && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            className="overflow-hidden whitespace-nowrap flex items-center gap-1"
          >
            <FileText className="h-3 w-3 shrink-0 ml-1" />
            <span className="truncate max-w-[200px]">{filename}</span>
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
