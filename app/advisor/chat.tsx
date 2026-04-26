"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Bot, User, Sparkles, RefreshCw } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "Where am I overspending this month?",
  "Am I on track to save money?",
  "What can I cut to save more?",
  "How does this month compare to last?",
  "Give me a budget plan for next month",
  "What are my biggest recurring costs?",
];

const OPENING_PROMPT =
  "Give me a concise overview of my finances this month. Highlight the 2-3 most important things I should know or act on right now.";

export function AdvisorChat({
  systemPrompt,
  monthName,
}: {
  systemPrompt: string;
  monthName: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasInit = useRef(false);

  // Auto-trigger opening analysis once on mount
  useEffect(() => {
    if (!hasInit.current) {
      hasInit.current = true;
      sendMessage(OPENING_PROMPT, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(userContent: string, hidden = false) {
    if (isStreaming) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: userContent,
    };

    setMessages((prev) => {
      const next = hidden
        ? prev // don't show the auto-opening prompt as a bubble
        : [...prev, userMsg];
      return next;
    });
    setInput("");
    setIsStreaming(true);

    const historyForApi = hidden
      ? [{ role: "user", content: userContent }]
      : [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));

    const assistantId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "" },
    ]);

    try {
      const res = await fetch("/api/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: historyForApi, systemPrompt }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: m.content + text } : m
          )
        );
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: "Something went wrong. Please try again." }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) sendMessage(input.trim());
  };

  const handleReset = () => {
    setMessages([]);
    hasInit.current = false;
    setTimeout(() => {
      hasInit.current = true;
      sendMessage(OPENING_PROMPT, true);
    }, 0);
  };

  // Show suggestions only after the first assistant reply and when not busy
  const showSuggestions =
    !isStreaming &&
    messages.length >= 1 &&
    messages[messages.length - 1].role === "assistant" &&
    messages[messages.length - 1].content.length > 0;

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* ── Header ── */}
      <div className="shrink-0 flex items-center justify-between px-6 py-3 border-b border-slate-100 bg-white shadow-[var(--shadow-softer)]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm">
            <Sparkles className="w-[18px] h-[18px] text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-slate-900 leading-tight">
              Finance Advisor
            </h1>
            <p className="text-[11px] text-slate-400 leading-tight">
              {monthName} · powered by Claude
            </p>
          </div>
        </div>
        <button
          onClick={handleReset}
          disabled={isStreaming}
          title="Start new conversation"
          className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40 transition"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5 text-indigo-600" />
              </div>
            )}

            <div
              className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white rounded-tr-sm"
                  : "bg-white shadow-[var(--shadow-softer)] text-slate-800 rounded-tl-sm"
              }`}
            >
              {msg.content ? (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              ) : (
                // Typing indicator while streaming
                <span className="flex items-center gap-1 h-5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce [animation-delay:300ms]" />
                </span>
              )}
            </div>

            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5 text-slate-500" />
              </div>
            )}
          </div>
        ))}

        {/* Suggestion chips */}
        {showSuggestions && (
          <div className="flex flex-wrap gap-2 pt-1">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                className="rounded-full border border-indigo-100 bg-white px-3 py-1.5 text-xs font-medium text-indigo-700 shadow-[var(--shadow-softer)] hover:bg-indigo-50 hover:border-indigo-200 transition"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <div className="shrink-0 px-4 pb-4 pt-3 border-t border-slate-100 bg-white">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your finances…"
            disabled={isStreaming}
            className="flex-1 h-10 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent disabled:opacity-60 transition"
          />
          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            className="h-10 w-10 shrink-0 rounded-xl bg-indigo-600 flex items-center justify-center text-white hover:bg-indigo-700 disabled:opacity-40 transition"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
