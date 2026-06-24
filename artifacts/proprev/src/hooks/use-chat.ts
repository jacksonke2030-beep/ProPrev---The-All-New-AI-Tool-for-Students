import { useState, useCallback, useRef } from "react";
import { uploadFile } from "@workspace/api-client-react";

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

      setAttachedFile(null); // Clear file after sending

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

        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");
            
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const dataStr = line.replace("data: ", "").trim();
                if (!dataStr || dataStr === "[DONE]") continue;

                try {
                  const data = JSON.parse(dataStr);
                  if (data.content) {
                    assistantContent += data.content;
                  }
                  if (data.citations) {
                    citations = data.citations;
                  }
                  if (data.responseId) {
                    setPreviousResponseId(data.responseId);
                  }

                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId
                        ? { ...msg, content: assistantContent, citations }
                        : msg
                    )
                  );

                  if (data.done) {
                    done = true;
                  }
                } catch (err) {
                  console.error("Error parsing SSE chunk", err);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error("Chat error:", error);
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
      // Create FormData
      const formData = new FormData();
      formData.append("file", file);

      // Using raw fetch for multipart/form-data upload
      const response = await fetch("/api/chat/upload", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) throw new Error("Upload failed");
      
      const result = await response.json();
      setAttachedFile({
        fileId: result.fileId,
        filename: result.filename || file.name,
      });
    } catch (error) {
      console.error("File upload error:", error);
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
  };
}
