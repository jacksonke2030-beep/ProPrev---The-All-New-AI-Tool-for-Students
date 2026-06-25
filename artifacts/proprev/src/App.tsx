import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useGetChatConfig } from "@workspace/api-client-react";
import { useChat } from "@/hooks/use-chat";
import { useConversations } from "@/hooks/use-conversations";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { ConversationsSidebar } from "@/components/sidebar/ConversationsSidebar";
import { Button } from "@/components/ui/button";
import { Sparkles, Terminal, RotateCcw, Menu, Quote, Flame } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PomodoroTimer, TimerHeaderButton } from "@/components/timer/PomodoroTimer";
import { SavedConversation } from "@/hooks/use-conversations";
import { useStreak } from "@/hooks/use-streak";

// ---------------------------------------------------------------------------
// Daily motivational quote — rotates by day of year, all real attributions
// ---------------------------------------------------------------------------
const QUOTES = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "All our dreams can come true, if we have the courage to pursue them.", author: "Walt Disney" },
  { text: "The future depends on what you do today.", author: "Mahatma Gandhi" },
  { text: "Small daily improvements over time lead to stunning results.", author: "Robin Sharma" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
  { text: "Motivation is what gets you started. Habit is what keeps you going.", author: "Jim Ryun" },
  { text: "Life begins at the end of your comfort zone.", author: "Neale Donald Walsch" },
  { text: "The difference between ordinary and extraordinary is that little extra.", author: "Jimmy Johnson" },
  { text: "Hard work beats talent when talent doesn't work hard.", author: "Tim Notke" },
  { text: "Procrastination is the thief of time.", author: "Edward Young" },
  { text: "Whether you think you can or think you can't, you're right.", author: "Henry Ford" },
  { text: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe" },
  { text: "Every expert was once a beginner.", author: "Helen Hayes" },
  { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
  { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
  { text: "Champions keep playing until they get it right.", author: "Billie Jean King" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "You have brains in your head. You have feet in your shoes. You can steer yourself any direction you choose.", author: "Dr. Seuss" },
  { text: "Success doesn't come to you — you go to it.", author: "Marva Collins" },
  { text: "A little progress each day adds up to big results.", author: "Satya Nani" },
  { text: "We must all suffer one of two things: the pain of discipline or the pain of regret.", author: "Jim Rohn" },
  { text: "The successful warrior is the average man, with laser-like focus.", author: "Bruce Lee" },
  { text: "In the middle of every difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "You are never too old to set another goal or to dream a new dream.", author: "C.S. Lewis" },
  { text: "Make each day your masterpiece.", author: "John Wooden" },
];

function getDailyQuote() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / 86400000);
  return QUOTES[dayOfYear % QUOTES.length];
}

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
    resetConversation,
    restoreConversation,
  } = useChat();

  const { conversations, saveConversation, deleteConversation } = useConversations();
  const streak = useStreak();

  const dailyQuote = useMemo(() => getDailyQuote(), []);

  const bottomRef = useRef<HTMLDivElement>(null);

  // Timer state
  const [timerOpen, setTimerOpen] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerKey, setTimerKey] = useState(0);
  const [timerPresetMinutes, setTimerPresetMinutes] = useState<number>(25);

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleTimerState = useCallback((seconds: number, running: boolean) => {
    setTimerSeconds(seconds);
    setTimerRunning(running);
  }, []);

  const handleStartTimer = useCallback((minutes: number) => {
    setTimerPresetMinutes(minutes);
    setTimerKey((k) => k + 1);
    setTimerOpen(true);
  }, []);

  // Save current conversation then start fresh
  const handleNewChat = useCallback(() => {
    if (messages.length > 0) {
      saveConversation(messages);
    }
    resetConversation();
  }, [messages, saveConversation, resetConversation]);

  // Load a past conversation into the chat view
  const handleLoadConversation = useCallback(
    (conv: SavedConversation) => {
      if (messages.length > 0) {
        saveConversation(messages);
      }
      restoreConversation(conv.messages);
    },
    [messages, saveConversation, restoreConversation]
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (isConfigLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const assistantName = config?.assistantName || "Prevy";
  const welcomeMessage = config?.welcomeMessage || "Need help organizing?";
  const starterQuestions = config?.starterQuestions || [
    "Help me plan my week's assignments",
    "I have 3 assignments due Friday — where do I start?",
    "How do I break a big project into steps?",
    "Make me a study checklist for tomorrow",
  ];

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-background overflow-hidden selection:bg-primary/30">
      {/* Conversations sidebar */}
      <ConversationsSidebar
        open={sidebarOpen}
        conversations={conversations}
        onClose={() => setSidebarOpen(false)}
        onLoad={handleLoadConversation}
        onDelete={deleteConversation}
      />

      {/* Header */}
      <header className="relative flex items-center justify-between px-4 py-4 border-b border-border/40 bg-background/80 backdrop-blur-md z-10 shrink-0">
        <div className="flex items-center gap-2.5">
          {/* Hamburger — opens past conversations */}
          <button
            onClick={() => setSidebarOpen(true)}
            data-testid="button-open-sidebar"
            className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title="Past conversations"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="h-8 w-8 rounded-lg overflow-hidden border border-cyan-500/20 bg-[#030c1a] shadow-[0_0_8px_1px_rgba(0,220,255,0.15)]">
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="ProPrev" className="h-full w-full object-cover" />
          </div>
          <span className="font-bold tracking-tight text-foreground text-lg">ProPrev</span>
        </div>

        <div className="flex items-center gap-2">
          <TimerHeaderButton
            active={timerOpen}
            onClick={() => setTimerOpen((o) => !o)}
            secondsLeft={
              timerSeconds !== null && timerSeconds !== timerPresetMinutes * 60
                ? timerSeconds
                : null
            }
            running={timerRunning}
          />

          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNewChat}
              data-testid="button-new-conversation"
              className="text-muted-foreground hover:text-foreground gap-1.5 text-xs"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              New chat
            </Button>
          )}

          <div className="px-3 py-1 rounded-full bg-secondary/50 border border-border/50 text-xs font-medium text-muted-foreground flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            {assistantName} Online
          </div>
        </div>

        {/* Timer panel */}
        <AnimatePresence>
          {timerOpen && (
            <PomodoroTimer
              key={timerKey}
              presetMinutes={timerPresetMinutes}
              onClose={() => setTimerOpen(false)}
              onStateChange={handleTimerState}
            />
          )}
        </AnimatePresence>
      </header>

      {/* Main Scrollable Area */}
      <main className="flex-1 overflow-y-auto w-full scroll-smooth">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-full py-20 px-4">
            <div className="h-20 w-20 rounded-2xl overflow-hidden border border-cyan-500/30 bg-[#030c1a] mb-8 shadow-2xl shadow-cyan-500/20">
              <img src={`${import.meta.env.BASE_URL}logo.png`} alt="ProPrev" className="h-full w-full object-cover" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-4 text-center tracking-tight bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent">
              {welcomeMessage}
            </h1>
            <p className="text-lg text-muted-foreground max-w-lg text-center mb-6">
              Your AI study partner. No excuses, just progress.
            </p>

            {/* Streak counter */}
            {streak > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, duration: 0.35, type: "spring" }}
                className="flex items-center gap-2 mb-6 px-4 py-2 rounded-full border border-orange-500/30 bg-orange-500/10"
              >
                <Flame className="h-4 w-4 text-orange-400 animate-pulse" />
                <span className="text-sm font-semibold text-orange-300">
                  {streak} day{streak !== 1 ? "s" : ""} streak
                </span>
                <span className="text-xs text-orange-400/70">
                  {streak >= 7 ? "🔥 On fire!" : streak >= 3 ? "Keep it up!" : "Just getting started!"}
                </span>
              </motion.div>
            )}

            {/* Daily motivational quote */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="w-full max-w-xl px-4 mb-10"
            >
              <div className="relative rounded-2xl bg-card border border-border/50 px-6 py-4 shadow-sm flex items-start gap-3">
                <Quote className="h-4 w-4 text-primary/60 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-[14px] text-card-foreground leading-relaxed italic">
                    "{dailyQuote.text}"
                  </p>
                  <p className="text-[12px] text-muted-foreground mt-1.5 font-medium">
                    — {dailyQuote.author}
                  </p>
                </div>
                <span className="absolute top-2 right-3 text-[10px] text-muted-foreground/40 font-medium tracking-wide uppercase">
                  Quote of the day
                </span>
              </div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-3xl px-4">
              {starterQuestions.map((q, idx) => (
                <button
                  key={idx}
                  data-testid={`button-starter-question-${idx}`}
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
              <MessageBubble
                key={msg.id}
                message={msg}
                onStartTimer={handleStartTimer}
              />
            ))}
            <div ref={bottomRef} className="h-6" />
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
