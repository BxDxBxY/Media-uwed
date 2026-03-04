"use client";

import { Bot, MessageCircle, Send, X, Minimize2, Maximize2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type AssistantMessage = { role: "user" | "assistant"; text: string };

const SIZES = [
  { w: 340, h: 460, label: "S" },
  { w: 420, h: 560, label: "M" },
  { w: 520, h: 680, label: "L" },
] as const;

export function AdminAssistantChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [sizeIdx, setSizeIdx] = useState(1);
  const [messages, setMessages] = useState<AssistantMessage[]>([
    { role: "assistant", text: "Hi! I’m your Admin Assistant. Ask me anything about the website, automation, events, media, and settings." },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState("local-fallback");

  const panelSize = useMemo(() => SIZES[sizeIdx], [sizeIdx]);

  useEffect(() => {
    const loadMemory = async () => {
      try {
        const res = await fetch("/api/admin/assistant?limit=80");
        if (!res.ok) return;
        const data = await res.json();
        setModel(data.model || "local-fallback");
        if (Array.isArray(data.messages) && data.messages.length > 0) {
          setMessages(data.messages.map((m: any) => ({ role: m.role, text: m.text })));
        }
      } catch {
        // ignore and keep starter message
      }
    };

    loadMemory();
  }, []);

  const askAssistant = async () => {
    const question = input.trim();
    if (!question) return;

    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/admin/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question }),
      });
      const data = await res.json().catch(() => ({}));
      setModel(data.model || model);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: data.reply || data.error || "Assistant did not return a response." },
      ]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "Network error while contacting assistant." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="fixed z-50 bottom-6 right-6 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center hover:scale-105 transition"
        aria-label="Toggle admin assistant"
      >
        <MessageCircle className="h-5 w-5" />
      </button>

      {isOpen && (
        <div
          className="fixed z-50 right-6 top-20 rounded-2xl border border-border/50 bg-card shadow-2xl flex flex-col overflow-hidden"
          style={{ width: panelSize.w, height: panelSize.h, maxHeight: "80vh" }}
        >
          <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              <p className="text-sm font-bold">Admin AI Assistant</p>
              <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground">{model}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSizeIdx((idx) => (idx + 1) % SIZES.length)}
                className="h-8 w-8 rounded-md hover:bg-muted flex items-center justify-center"
                title={`Resize (${SIZES[(sizeIdx + 1) % SIZES.length].label})`}
              >
                {sizeIdx === SIZES.length - 1 ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 rounded-md hover:bg-muted flex items-center justify-center"
                title="Close assistant"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.map((msg, idx) => (
              <div
                key={`${msg.role}-${idx}`}
                className={`text-xs p-2 rounded-lg ${msg.role === "assistant" ? "bg-muted" : "bg-primary/10"}`}
              >
                <span className="font-bold mr-1">{msg.role === "assistant" ? "AI" : "You"}:</span>
                {msg.text}
              </div>
            ))}
            {isLoading && <p className="text-xs text-muted-foreground">Assistant is thinking...</p>}
          </div>

          <div className="p-3 border-t border-border/40 flex items-center gap-2">
            <input
              type="text"
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-xs"
              placeholder="Ask about website, automation, publishing..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && askAssistant()}
            />
            <button
              type="button"
              onClick={askAssistant}
              disabled={!input.trim() || isLoading}
              className="h-9 w-9 rounded-md bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
