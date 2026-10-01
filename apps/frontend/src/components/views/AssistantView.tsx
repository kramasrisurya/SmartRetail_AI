import React, { useState, useRef, useEffect, useCallback } from "react";
import { Send, AlertTriangle, ArrowRight, Bot, User, Sparkles, RefreshCw } from "lucide-react";
import { api } from "../../lib/api";
import { cn } from "../../lib/utils";
import { Alert, Camera, ViewTab } from "../../types";

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: Date;
  declined?: boolean;
  isError?: boolean;
  suggestions?: string[];
  fallback?: boolean;
  aiMode?: boolean;
  mode?: string;
}

interface AssistantViewProps {
  alerts?: Alert[];
  cameras?: Camera[];
  onNavigate?: (tab: ViewTab) => void;
  onSelectAlert?: (alert: Alert) => void;
  onSelectCamera?: (camera: Camera) => void;
}

const SUGGESTIONS = [
  "Why was alert #1 flagged?",
  "What is the status of camera CAM-06?",
  "Summarize high-priority incidents in the last 2 hours",
  "Which zone has the longest customer dwell time?",
  "Explain the concealment rules triggered on Shelf B",
];

function FormattedAssistantText({
  text,
  onAlertClick,
  onCameraClick,
}: {
  text: string;
  onAlertClick?: (id: number) => void;
  onCameraClick?: (idOrName: string) => void;
}) {
  const tokenRegex = /(\bAlert\s*#\d+\b|\bCAM-\d+\b|\bCamera\s+(?:CAM-\d+|\w+)\b)/gi;
  const parts = text.split(tokenRegex);

  return (
    <span>
      {parts.map((part, idx) => {
        const alertMatch = part.match(/\b(?:Alert\s*#|#)(\d+)\b/i);
        if (alertMatch && onAlertClick) {
          const aid = parseInt(alertMatch[1], 10);
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onAlertClick(aid)}
              className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-[3px] bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 font-medium hover:bg-red-500/20 transition cursor-pointer text-[11px]"
              title={`View Alert #${aid}`}
            >
              {part}
            </button>
          );
        }

        const camMatch = part.match(/\b(?:Camera\s+)?(CAM-\d+|\d+)\b/i);
        if (camMatch && onCameraClick && (part.toLowerCase().includes("cam") || part.toLowerCase().includes("camera"))) {
          const camRef = camMatch[1];
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onCameraClick(camRef)}
              className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-[3px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-medium hover:bg-blue-500/20 transition cursor-pointer text-[11px]"
              title={`View Camera ${camRef}`}
            >
              {part}
            </button>
          );
        }

        return <span key={idx}>{part}</span>;
      })}
    </span>
  );
}

export function AssistantView({
  alerts = [],
  cameras = [],
  onNavigate,
  onSelectAlert,
  onSelectCamera,
}: AssistantViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "initial",
      sender: "assistant",
      text: "Store intelligence assistant ready. You can query camera statuses, alert explanations, zone dwell metrics, incident summaries, or detection rules.",
      timestamp: new Date(),
      suggestions: SUGGESTIONS.slice(0, 3),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = useCallback(
    async (textToSend?: string) => {
      const query = (textToSend || input).trim();
      if (!query || loading) return;

      const userMsg: ChatMessage = {
        id: `user_${Date.now()}`,
        sender: "user",
        text: query,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);

      try {
        const historyForApi = messages
          .filter((m) => m.id !== "initial" && !m.isError)
          .slice(-6)
          .map((m) => ({
            role: m.sender,
            content: m.text,
          }));

        const res = await api.askAssistant(query, historyForApi);

        const assistantMsg: ChatMessage = {
          id: `ast_${Date.now()}`,
          sender: "assistant",
          text:
            res.answer ||
            res.reason ||
            res.note ||
            "I could not locate specific records matching that inquiry.",
          timestamp: new Date(),
          declined: res.declined,
          fallback: res.fallback,
          aiMode: res.ai_mode,
          mode: res.mode,
          suggestions: res.suggestions,
        };

        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Failed to query store assistant.";
        setMessages((prev) => [
          ...prev,
          {
            id: `err_${Date.now()}`,
            sender: "assistant",
            text: `Query error: ${errorMsg}`,
            timestamp: new Date(),
            isError: true,
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [input, loading, messages]
  );

  const handleAlertClick = (alertId: number) => {
    const found = alerts.find((a) => a.id === alertId);
    if (found && onSelectAlert) {
      onSelectAlert(found);
    } else if (onNavigate) {
      onNavigate("alerts");
    }
  };

  const handleCameraClick = (camRef: string) => {
    const found = cameras.find(
      (c) =>
        c.name.toLowerCase() === camRef.toLowerCase() ||
        String(c.id) === camRef ||
        c.name.toLowerCase().includes(camRef.toLowerCase())
    );
    if (found && onSelectCamera) {
      onSelectCamera(found);
    } else if (onNavigate) {
      onNavigate("cameras");
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-6rem)] flex flex-col justify-between overflow-hidden animate-in fade-in duration-150">
      {/* Header */}
      <div className="border-b border-border pb-3 mb-2 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-foreground tracking-tight flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Store Intelligence Assistant
          </h1>
          <p className="text-xs text-muted-foreground">
            Auditable decision support grounded in store vision facts & telemetry
          </p>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 py-2" role="log" aria-live="polite">
        {messages.map((m) => {
          const isUser = m.sender === "user";
          return (
            <div key={m.id} className={cn("flex gap-3 text-xs", isUser ? "justify-end" : "justify-start")}>
              {!isUser && (
                <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 border border-primary/20">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={cn(
                  "max-w-xl p-3.5 rounded-lg space-y-2 leading-relaxed shadow-sm",
                  isUser
                    ? "bg-primary text-primary-foreground font-medium rounded-tr-none"
                    : m.isError
                    ? "bg-destructive/10 text-destructive border border-destructive/20 rounded-tl-none"
                    : "bg-card border border-border text-foreground rounded-tl-none"
                )}
              >
                <div>
                  <FormattedAssistantText
                    text={m.text}
                    onAlertClick={handleAlertClick}
                    onCameraClick={handleCameraClick}
                  />
                </div>

                {m.suggestions && m.suggestions.length > 0 && (
                  <div className="pt-2 border-t border-border/40 flex flex-wrap gap-1.5">
                    {m.suggestions.map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSend(s)}
                        className="px-2 py-1 rounded bg-muted/60 hover:bg-muted text-[11px] text-muted-foreground hover:text-foreground transition-colors border border-border/50 text-left"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {isUser && (
                <div className="w-7 h-7 rounded-full bg-muted text-foreground flex items-center justify-center shrink-0 mt-0.5 border border-border">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex gap-3 text-xs items-center text-muted-foreground">
            <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            </div>
            <span>Analyzing store events and sensor graphs...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form & Quick Prompt Chips */}
      <div className="pt-3 border-t border-border space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.slice(0, 3).map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSend(s)}
              className="text-[11px] px-2 py-0.5 rounded-full border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition"
            >
              {s}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about cameras, incidents, dwell metrics, or rules..."
            disabled={loading}
            className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-xs placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary transition"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            aria-label="Send query to assistant"
            className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50 shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

export default AssistantView;
