import React, { useState } from "react";
import { Send, AlertTriangle, ArrowRight } from "lucide-react";
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
      text: "Store assistant ready. You can query camera statuses, alert explanations, zone dwell metrics, incident summaries, or detection rules.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiModeActive, setAiModeActive] = useState<boolean>(false);

  const handleAlertClick = (aid: number) => {
    const alertObj = alerts.find((a) => a.id === aid);
    if (alertObj && onSelectAlert) {
      onSelectAlert(alertObj);
    } else if (onNavigate) {
      onNavigate("alerts");
    }
  };

  const handleCameraClick = (camRef: string) => {
    const norm = camRef.toLowerCase();
    const camObj = cameras.find(
      (c) => String(c.id) === norm || c.name.toLowerCase() === norm || c.name.toLowerCase().endsWith(norm)
    );
    if (camObj && onSelectCamera) {
      onSelectCamera(camObj);
    } else if (onNavigate) {
      onNavigate("map");
    }
  };

  const handleSend = async (queryText?: string) => {
    const q = queryText || input;
    if (!q.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: "user",
      text: q,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    // Build history for backend request
    const historyPayload = messages
      .filter((m) => m.id !== "initial" && !m.isError)
      .slice(-6)
      .map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text,
      }));

    try {
      const res = await api.askAssistant(q, historyPayload);
      if (res.ai_mode !== undefined) {
        setAiModeActive(Boolean(res.ai_mode));
      }

      const assistantMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: "assistant",
        text: res.answer || "No response received.",
        timestamp: new Date(),
        declined: res.declined,
        suggestions: res.suggestions,
        fallback: res.fallback,
        aiMode: res.ai_mode,
        mode: res.mode,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: "assistant",
          text: err.message || "Failed to communicate with assistant service",
          timestamp: new Date(),
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-6.5rem)] space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
        <div>
          <h1 className="text-base font-semibold text-foreground tracking-tight">Assistant</h1>
          <p className="text-xs text-muted-foreground">Natural language queries for store surveillance data</p>
        </div>
        <div className="flex items-center gap-2">
          {aiModeActive ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
              Claude AI Active
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-muted text-muted-foreground border border-border font-medium"
              title="Set ANTHROPIC_API_KEY in backend environment to enable Claude AI tool calling"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60" />
              AI mode off (rules)
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Ready</span>
          </span>
        </div>
      </div>

      {/* Message History */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {messages.map((m) => {
          const isUser = m.sender === "user";
          return (
            <div
              key={m.id}
              className={cn("flex flex-col max-w-xl", isUser ? "ml-auto items-end" : "items-start")}
            >
              <div
                className={cn(
                  "p-3 rounded-[6px] text-xs leading-relaxed whitespace-pre-line w-fit",
                  isUser
                    ? "bg-foreground text-background"
                    : m.isError
                    ? "bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400"
                    : m.fallback
                    ? "bg-amber-500/10 border border-amber-500/20 text-foreground"
                    : "bg-muted text-foreground border border-border"
                )}
              >
                {m.isError ? (
                  <div>
                    <div className="font-semibold mb-1 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>API Error</span>
                    </div>
                    <div>{m.text}</div>
                  </div>
                ) : isUser ? (
                  m.text
                ) : (
                  <div>
                    <FormattedAssistantText
                      text={m.text}
                      onAlertClick={handleAlertClick}
                      onCameraClick={handleCameraClick}
                    />

                    {/* Clickable Suggestions in Fallback */}
                    {m.suggestions && m.suggestions.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-border/60 flex flex-col gap-1.5">
                        <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
                          Suggested queries:
                        </span>
                        <div className="flex flex-col gap-1">
                          {m.suggestions.map((sug, sidx) => (
                            <button
                              key={sidx}
                              onClick={() => handleSend(sug)}
                              className="text-left text-xs px-2.5 py-1.5 rounded-[4px] bg-background hover:bg-accent border border-border text-foreground hover:border-foreground/40 transition flex items-center justify-between group cursor-pointer"
                            >
                              <span>{sug}</span>
                              <ArrowRight className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition ml-2 shrink-0" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground mt-1 px-1 font-mono">
                {m.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          );
        })}

        {/* Typing indicator */}
        {loading && (
          <div className="flex items-center gap-2 p-2.5 rounded-[6px] bg-muted/60 border border-border/80 w-fit text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-foreground/60 animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-foreground/60 animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-foreground/60 animate-bounce" />
            </div>
            <span className="text-[11px] font-medium">Assistant thinking...</span>
          </div>
        )}
      </div>

      {/* Suggestions and Input Box */}
      <div className="space-y-2 shrink-0 border-t border-border pt-3">
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(s)}
              className="text-[11px] px-2 py-1 rounded-[4px] border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
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
            placeholder="Ask about store alerts, cameras, or events..."
            className="flex-1 px-3 py-1.5 rounded-[4px] border border-border bg-background text-foreground text-xs focus:outline-none focus:border-foreground transition"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="px-3 py-1.5 rounded-[4px] bg-foreground text-background text-xs font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-3 h-3" />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}

export default AssistantView;
