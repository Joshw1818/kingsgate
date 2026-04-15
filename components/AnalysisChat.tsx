"use client";

import { useRef, useState } from "react";
import type { DeepAnalysis } from "@/lib/ai/schema";

interface Turn {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED_QUESTIONS = [
  "Why is CPB up?",
  "Which ad should I pause?",
  "Should I increase budget?",
  "What's wrong with the creative?",
];

export function AnalysisChat({
  clientId,
  analysis,
}: {
  clientId: string;
  analysis: DeepAnalysis;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function send(message: string) {
    if (!message.trim() || pending) return;
    setError(null);
    setPending(true);

    const history = turns;
    const userTurn: Turn = { role: "user", content: message };
    // Seed an empty assistant turn we'll stream into
    setTurns((t) => [...t, userTurn, { role: "assistant", content: "" }]);
    setInput("");

    try {
      const res = await fetch("/api/analyze/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          user_message: message,
          history,
          analysis,
        }),
      });
      if (!res.ok || !res.body) {
        throw new Error(await res.text());
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setTurns((t) => {
          const copy = [...t];
          const last = copy[copy.length - 1];
          if (last && last.role === "assistant") {
            copy[copy.length - 1] = {
              role: "assistant",
              content: last.content + chunk,
            };
          }
          return copy;
        });
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setTurns((t) => t.slice(0, -1)); // drop empty assistant turn
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Ask a follow-up
      </h3>

      <div className="bg-white border border-slate-200 rounded-lg">
        <div
          ref={scrollRef}
          className="max-h-96 overflow-y-auto p-4 space-y-3 text-sm"
        >
          {turns.length === 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-slate-400">
                Interrogate the analysis. Try one of these:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => send(q)}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] text-slate-600 hover:bg-slate-100 hover:border-slate-300"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            turns.map((t, i) => (
              <div
                key={i}
                className={
                  t.role === "user"
                    ? "text-slate-900"
                    : "text-slate-700 whitespace-pre-wrap"
                }
              >
                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">
                  {t.role === "user" ? "You" : "Strategist"}
                </div>
                <div className="whitespace-pre-wrap leading-relaxed">
                  {t.content || (pending ? "…" : "")}
                </div>
              </div>
            ))
          )}
        </div>

        <form
          className="border-t border-slate-100 p-2 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask why, what if, which ad…"
            className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-brand-accent focus:outline-none"
            disabled={pending}
          />
          <button
            type="submit"
            disabled={pending || !input.trim()}
            className="rounded-md bg-brand text-white text-sm font-medium px-4 py-2 hover:bg-slate-800 disabled:opacity-40"
          >
            {pending ? "…" : "Send"}
          </button>
        </form>

        {error && (
          <div className="border-t border-red-100 bg-red-50 text-severity-high text-xs px-3 py-2">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
