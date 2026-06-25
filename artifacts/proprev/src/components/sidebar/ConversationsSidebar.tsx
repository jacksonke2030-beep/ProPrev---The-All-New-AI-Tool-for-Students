import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageSquare, Trash2, Download, Clock } from "lucide-react";
import { SavedConversation, exportAsMarkdown } from "@/hooks/use-conversations";
import { cn } from "@/lib/utils";

interface ConversationsSidebarProps {
  open: boolean;
  conversations: SavedConversation[];
  onClose: () => void;
  onLoad: (conv: SavedConversation) => void;
  onDelete: (id: string) => void;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function ConversationsSidebar({
  open,
  conversations,
  onClose,
  onLoad,
  onDelete,
}: ConversationsSidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />

          {/* Drawer */}
          <motion.div
            key="drawer"
            ref={sidebarRef}
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed left-0 top-0 h-full w-80 bg-background border-r border-border/50 shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/40 shrink-0">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                <span className="font-semibold text-foreground text-sm">
                  Past Conversations
                </span>
              </div>
              <button
                onClick={onClose}
                className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto py-2">
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
                  <div className="h-12 w-12 rounded-xl bg-secondary/50 flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    No saved conversations yet.
                    <br />
                    Start chatting and they'll appear here.
                  </p>
                </div>
              ) : (
                <ul className="space-y-0.5 px-2">
                  {conversations.map((conv) => (
                    <ConversationItem
                      key={conv.id}
                      conv={conv}
                      onLoad={() => {
                        onLoad(conv);
                        onClose();
                      }}
                      onDelete={() => onDelete(conv.id)}
                      onExport={() => exportAsMarkdown(conv)}
                    />
                  ))}
                </ul>
              )}
            </div>

            {/* Footer */}
            {conversations.length > 0 && (
              <div className="px-4 py-3 border-t border-border/40 shrink-0">
                <p className="text-[11px] text-muted-foreground text-center">
                  {conversations.length} conversation
                  {conversations.length !== 1 ? "s" : ""} saved locally
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

interface ItemProps {
  conv: SavedConversation;
  onLoad: () => void;
  onDelete: () => void;
  onExport: () => void;
}

function ConversationItem({ conv, onLoad, onDelete, onExport }: ItemProps) {
  const userCount = conv.messages.filter((m) => m.role === "user").length;

  return (
    <li className="group relative">
      <button
        onClick={onLoad}
        className={cn(
          "w-full text-left px-3 py-3 rounded-lg transition-colors duration-150",
          "hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
        )}
      >
        <div className="flex items-start gap-2.5 pr-14">
          <div className="h-7 w-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
            <MessageSquare className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-foreground leading-snug truncate">
              {conv.title}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="text-[11px] text-muted-foreground">
                {formatDate(conv.timestamp)}
              </span>
              <span className="text-[11px] text-muted-foreground/60">·</span>
              <span className="text-[11px] text-muted-foreground">
                {userCount} message{userCount !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>
      </button>

      {/* Action buttons — show on hover */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onExport();
          }}
          title="Export as markdown"
          className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <Download className="h-3 w-3" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Delete"
          className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </li>
  );
}
