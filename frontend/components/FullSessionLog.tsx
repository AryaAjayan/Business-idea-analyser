"use client";

import { useEffect, useRef } from "react";
import type { ToolEvent } from "@/lib/types";

interface Props {
  transcript: Array<{ role: "user" | "agent"; text: string }>;
  toolEvents: ToolEvent[];
  onClose: () => void;
}

function resultSummary(result: Record<string, unknown> | undefined): string {
  if (!result) return "—";
  const r = result as Record<string, unknown>;
  if (r.status === "error") return `Error: ${r.message}`;
  // Return a readable JSON dump, capped at 300 chars
  const raw = JSON.stringify(r, null, 2);
  return raw.length > 300 ? raw.slice(0, 300) + "\n…" : raw;
}

export default function FullSessionLog({ transcript, toolEvents, onClose }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "instant" });
  }, [transcript.length, toolEvents.length]);

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Panel */}
      <div className="w-full max-w-2xl bg-[#0d0d1c] border border-white/10 rounded-2xl shadow-2xl flex flex-col"
           style={{ maxHeight: "80vh" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 shrink-0">
          <span className="text-white font-semibold tracking-wide text-sm uppercase">
            Full Session Log
          </span>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white text-xl leading-none transition"
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-6">

          {/* ── Conversation section ── */}
          <section>
            <h3 className="text-[11px] text-white/30 uppercase tracking-widest mb-3">
              Conversation
            </h3>
            {transcript.length === 0 ? (
              <p className="text-white/20 text-sm italic">No transcript yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {transcript.map((entry, i) => (
                  <div key={i} className={`flex gap-2 ${entry.role === "agent" ? "items-start" : "items-start flex-row-reverse"}`}>
                    <span className={`text-[10px] uppercase tracking-widest mt-0.5 shrink-0 ${
                      entry.role === "agent" ? "text-white/30" : "text-cyan-400/60"
                    }`}>
                      {entry.role === "agent" ? "Vera" : "You"}
                    </span>
                    <p className={`text-sm leading-relaxed ${
                      entry.role === "agent" ? "text-white/80" : "text-cyan-200/70"
                    }`}>
                      {entry.text}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>


          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
