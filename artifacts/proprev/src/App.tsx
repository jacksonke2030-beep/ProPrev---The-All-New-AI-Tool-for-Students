import { useEffect, useRef } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useGetChatConfig } from "@workspace/api-client-react";
import { useChat } from "@/hooks/use-chat";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { Button } from "@/components/ui/button";
import { Sparkles, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

const queryClient = new QueryClient();

function Chat() {
  const { data: config, isLoading: isConfigLoading } = useGetChatConfig();
  const {
    messages,
    sendMessage,
    isStreaming,
    handleFileUpload,
    isUploading,
    attachedFile,
    removeAttachedFile,
  } = useChat();

  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  if (isConfigLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const assistantName = config?.assistantName || "Prevy";
  const welcomeMessage = config?.welcomeMessage || "Ready to focus?";
  const starterQuestions = config?.starterQuestions || [
    "Help me plan my week's assignments",
    "I have 3 assignments due Friday — where do I start?",
    "How do I break a big project into steps?",
    "Make me a study checklist for tomorrow"
  ];

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-background overflow-hidden selection:bg-primary/30">
      {/* Header / Navbar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-background/80 backdrop-blur-md z-10 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Terminal className="h-4 w-4" />
          </div>
          <span className="font-bold tracking-tight text-foreground text-lg">ProPrev</span>
        </div>
        <div className="px-3 py-1 rounded-full bg-secondary/50 border border-border/50 text-xs font-medium text-muted-foreground flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          {assistantName} Online
        </div>
      </header>

      {/* Main Scrollable Area */}
      <main className="flex-1 overflow-y-auto w-full scroll-smooth">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-full py-20 px-4">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-white/5 flex items-center justify-center mb-8 shadow-2xl shadow-primary/10">
              <Sparkles className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 text-center tracking-tight bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent">
              {welcomeMessage}
            </h1>
            <p className="text-lg text-muted-foreground max-w-lg text-center mb-12">
              Your AI study partner. No excuses, just progress.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-3xl px-4">
              {starterQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessage(q)}
                  className="flex items-center text-left p-4 rounded-xl bg-card border border-border/50 hover:bg-secondary hover:border-primary/50 transition-all duration-300 group shadow-sm hover:shadow-md"
                >
                  <span className="text-sm font-medium text-card-foreground group-hover:text-primary transition-colors">
                    {q}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col pb-8 pt-4">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            <div ref={bottomRef} className="h-1" />
          </div>
        )}
      </main>

      {/* Input Area */}
      <div className="shrink-0 bg-background/90 backdrop-blur-xl border-t border-border/30">
        <ChatInput
          onSend={sendMessage}
          onFileUpload={handleFileUpload}
          attachedFile={attachedFile}
          removeAttachedFile={removeAttachedFile}
          isUploading={isUploading}
          isStreaming={isStreaming}
        />
      </div>
    </div>
  );
}

function App() {
  // Force dark mode
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Switch>
            <Route path="/" component={Chat} />
          </Switch>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
