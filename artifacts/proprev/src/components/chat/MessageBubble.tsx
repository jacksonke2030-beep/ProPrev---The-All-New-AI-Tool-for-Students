import React from "react";
import { Message } from "@/hooks/use-chat";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Cpu, User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex w-full w-full max-w-4xl mx-auto py-6",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "flex gap-4 max-w-[85%]",
          isUser ? "flex-row-reverse" : "flex-row"
        )}
      >
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border shadow-sm",
            isUser
              ? "bg-primary text-primary-foreground border-primary/20"
              : "bg-card text-accent border-border"
          )}
        >
          {isUser ? <User className="h-5 w-5" /> : <Cpu className="h-5 w-5" />}
        </div>

        <div className="flex flex-col gap-2">
          <div
            className={cn(
              "px-5 py-4 rounded-2xl text-[15px] leading-relaxed",
              isUser
                ? "bg-primary/10 text-foreground rounded-tr-sm border border-primary/20"
                : "bg-card text-card-foreground rounded-tl-sm border shadow-sm"
            )}
          >
            {message.content ? (
              <div className="whitespace-pre-wrap">{message.content}</div>
            ) : (
              message.isStreaming && (
                <div className="flex items-center h-5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce mx-1 delay-100" />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce delay-200" />
                </div>
              )
            )}
          </div>

          {message.citations && message.citations.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-1">
              {message.citations.map((cite, idx) => (
                <Citation key={idx} filename={cite.filename} index={idx + 1} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Citation({ filename, index }: { filename: string; index: number }) {
  const [expanded, setExpanded] = React.useState(false);

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
            <span className="truncate">{filename}</span>
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
