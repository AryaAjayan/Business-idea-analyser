"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

export default function TranscriptStream({
  entries,
}: {
  entries: Array<{ role: "user" | "agent"; text: string }>;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest entry whenever a new line arrives
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries.length]);

  if (entries.length === 0) return null;

  return (
    <div
      className="w-full max-w-xl flex flex-col gap-2 overflow-y-auto px-1"
      style={{ maxHeight: "220px" }}
    >
      {entries.map((entry, i) => {
        const isLatest = i === entries.length - 1;
        return (
          <motion.div
            key={`${i}-${entry.text.slice(0, 20)}`}
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: isLatest ? 1 : 0.6, y: 0, scale: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={`flex ${entry.role === "agent" ? "justify-start" : "justify-end"}`}
          >
            <div
              className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed shadow-sm ${
                entry.role === "agent"
                  ? "bg-panel text-main rounded-tl-sm border border-theme"
                  : "bg-cyan-100 text-cyan-900 dark:bg-cyan-900/40 dark:text-cyan-50 rounded-tr-sm border border-cyan-200 dark:border-cyan-500/20"
              }`}
            >
              {entry.text}
            </div>
          </motion.div>
        );
      })}
      {/* Invisible anchor — scrolled into view on every update */}
      <div ref={bottomRef} />
    </div>
  );
}
