import React, { useRef, useEffect } from "react";
import { Paperclip, ArrowUp, X, Loader2 } from "lucide-react";
import { AttachedFile } from "@/hooks/use-chat";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  onSend: (message: string) => void;
  onFileUpload: (file: File) => void;
  attachedFile: AttachedFile | null;
  removeAttachedFile: () => void;
  isUploading: boolean;
  isStreaming: boolean;
}

export function ChatInput({
  onSend,
  onFileUpload,
  attachedFile,
  removeAttachedFile,
  isUploading,
  isStreaming,
}: ChatInputProps) {
  const [input, setInput] = React.useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSend = () => {
    if ((!input.trim() && !attachedFile) || isStreaming) return;
    onSend(input);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-8 pt-4">
      <div className="relative flex flex-col w-full bg-card rounded-2xl border shadow-lg ring-1 ring-white/5 focus-within:ring-primary/50 transition-all">
        {attachedFile && (
          <div className="flex items-center gap-2 px-4 pt-4 pb-1">
            <div className="flex items-center gap-2 bg-secondary/80 text-secondary-foreground px-3 py-1.5 rounded-lg border border-border/50 text-sm">
              <Paperclip className="h-4 w-4 text-accent" />
              <span className="truncate max-w-[200px] font-medium">
                {attachedFile.filename}
              </span>
              <button
                onClick={removeAttachedFile}
                className="ml-1 hover:text-destructive transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {isUploading && !attachedFile && (
          <div className="flex items-center gap-2 px-4 pt-4 pb-1 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-accent" />
            Uploading file...
          </div>
        )}

        <div className="flex items-end gap-2 p-3">
          <input
            type="file"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.txt,.doc,.docx,.csv"
          />
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-10 w-10 text-muted-foreground hover:text-foreground rounded-xl"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isStreaming}
          >
            <Paperclip className="h-5 w-5" />
          </Button>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Send a message to Prevy..."
            className="flex-1 max-h-[200px] min-h-[40px] resize-none bg-transparent border-0 focus:ring-0 text-foreground py-2.5 px-2 placeholder:text-muted-foreground/70"
            rows={1}
            disabled={isStreaming}
          />

          <Button
            size="icon"
            className={cn(
              "shrink-0 h-10 w-10 rounded-xl transition-all shadow-md",
              input.trim() || attachedFile
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground hover:bg-muted"
            )}
            onClick={handleSend}
            disabled={(!input.trim() && !attachedFile) || isStreaming || isUploading}
          >
            <ArrowUp className="h-5 w-5" />
          </Button>
        </div>
      </div>
      <div className="text-center mt-3 text-xs text-muted-foreground/60 font-medium">
        Prevy is an AI and can make mistakes. Verify important information.
      </div>
    </div>
  );
}
