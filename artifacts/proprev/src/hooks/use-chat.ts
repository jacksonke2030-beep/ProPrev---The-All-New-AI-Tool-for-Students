import { useState, useCallback } from "react";

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: { filename: string }[];
  isStreaming?: boolean;
};

export type AttachedFile = {
  fileId: string;
  filename: string;
};

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [previousResponseId, setPreviousResponseId] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const resetConversation = useCallback(() => {
    setMessages([]);
    setPreviousResponseId(null);
    setAttachedFile(null);
    setIsStreaming(false);
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() && !attachedFile) return;

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content,
      };

      const assistantMessageId = crypto.randomUUID();
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setIsStreaming(true);

      const payload = {
        message: content,
        previousResponseId: previousResponseId,
        attachedFileId: attachedFile?.fileId || null,
      };

      setAttachedFile(null);

      try {
        const response = await fetch("/api/chat/message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        let assistantContent = "";
        let citations: { filename: string }[] = [];
        let buffer = "";

        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const dataStr = line.slice(6).trim();
              if (!dataStr || dataStr === "[DONE]") continue;

              try {
                const data = JSON.parse(dataStr) as {
                  content?: string;
                  citations?: { filename: string }[];
                  responseId?: string;
                  done?: boolean;
                  error?: string;
                };

                if (data.content) {
                  assistantContent += data.content;
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId
                        ? { ...msg, content: assistantContent, isStreaming: true }
                        : msg
                    )
                  );
                }

                if (data.citations) citations = data.citations;
                if (data.responseId) setPreviousResponseId(data.responseId);

                if (data.done) {
                  done = true;
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId
                        ? { ...msg, content: assistantContent, citations, isStreaming: false }
                        : msg
                    )
                  );
                }
              } catch {
                // ignore malformed chunks
              }
            }
          }
        }
      } catch {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: "Something went wrong. Please try again.", isStreaming: false }
              : msg
          )
        );
      } finally {
        setIsStreaming(false);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId ? { ...msg, isStreaming: false } : msg
          )
        );
      }
    },
    [previousResponseId, attachedFile]
  );

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/chat/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      const result = (await response.json()) as { fileId: string; filename: string };
      setAttachedFile({
        fileId: result.fileId,
        filename: result.filename || file.name,
      });
    } catch {
      // silently fail — user can retry
    } finally {
      setIsUploading(false);
    }
  };

  const removeAttachedFile = () => {
    setAttachedFile(null);
  };

  return {
    messages,
    sendMessage,
    isStreaming,
    handleFileUpload,
    isUploading,
    attachedFile,
    removeAttachedFile,
    resetConversation,
  };
}
