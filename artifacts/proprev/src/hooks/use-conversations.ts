import { useState, useCallback, useEffect } from "react";
import { Message } from "@/hooks/use-chat";

export interface SavedConversation {
  id: string;
  title: string;
  timestamp: number;
  messages: Message[];
}

const STORAGE_KEY = "proprev-conversations";
const MAX_SAVED = 30;

function load(): SavedConversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedConversation[];
  } catch {
    return [];
  }
}

function persist(convos: SavedConversation[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(convos));
  } catch {
    // storage full or unavailable — silently skip
  }
}

function deriveTitle(messages: Message[]): string {
  const first = messages.find((m) => m.role === "user");
  if (!first) return "Untitled conversation";
  const text = first.content.trim();
  return text.length > 60 ? text.slice(0, 57) + "…" : text;
}

export function exportAsMarkdown(conv: SavedConversation) {
  const lines: string[] = [
    `# ${conv.title}`,
    `*Saved ${new Date(conv.timestamp).toLocaleString()}*`,
    "",
  ];
  for (const msg of conv.messages) {
    const role = msg.role === "user" ? "**You**" : "**Prevy**";
    lines.push(`${role}\n\n${msg.content}`);
    if (msg.citations && msg.citations.length > 0) {
      lines.push(
        "\n**Sources:** " + msg.citations.map((c) => c.filename).join(", ")
      );
    }
    lines.push("\n---\n");
  }
  const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${conv.title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export function useConversations() {
  const [conversations, setConversations] = useState<SavedConversation[]>(load);

  // Keep state synced if another tab changes storage
  useEffect(() => {
    const handler = () => setConversations(load());
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const saveConversation = useCallback((messages: Message[]) => {
    if (messages.length === 0) return;
    const conv: SavedConversation = {
      id: crypto.randomUUID(),
      title: deriveTitle(messages),
      timestamp: Date.now(),
      // Strip isStreaming before persisting
      messages: messages.map((m) => ({ ...m, isStreaming: false })),
    };
    setConversations((prev) => {
      const updated = [conv, ...prev].slice(0, MAX_SAVED);
      persist(updated);
      return updated;
    });
    return conv.id;
  }, []);

  const deleteConversation = useCallback((id: string) => {
    setConversations((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      persist(updated);
      return updated;
    });
  }, []);

  return { conversations, saveConversation, deleteConversation };
}
