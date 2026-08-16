"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { ToolEvent } from "@/lib/types";

const TOOL_ICONS: Record<string, string> = {
  search_market_data: "🔍",
  calculate_tam_sam_som: "📊",
  analyze_competitors: "⚔️",
  generate_swot: "🧩",
  estimate_unit_economics: "💰",
  compile_investor_report: "📄",
};

export default function AgentWorkspace({ events }: { events: ToolEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col gap-2 p-3 w-full max-w-sm">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 0.3, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="bg-panel border border-theme border-dashed rounded-xl p-3 backdrop-blur shadow-sm relative overflow-hidden"
        >
          <div className="flex items-center gap-2 relative z-10">
            <span className="opacity-70">🔍</span>
            <span className="text-sm text-main flex-1">Searching market data...</span>
            <span className="text-xs">…</span>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 0.25, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="bg-panel border border-theme border-dashed rounded-xl p-3 backdrop-blur shadow-sm relative overflow-hidden"
        >
          <div className="flex items-center gap-2 relative z-10">
            <span className="opacity-70">📊</span>
            <span className="text-sm text-main flex-1">Calculating market size...</span>
            <span className="text-xs">…</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 0.2, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="bg-panel border border-theme border-dashed rounded-xl p-3 backdrop-blur shadow-sm relative overflow-hidden"
        >
          <div className="flex items-center gap-2 relative z-10">
            <span className="opacity-70">⚔️</span>
            <span className="text-sm text-main flex-1">Analyzing competitors...</span>
            <span className="text-xs">…</span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3 w-full max-w-sm max-h-[400px] overflow-y-auto">
      <AnimatePresence initial={false}>
        <motion.div layout className="flex flex-col gap-2">
          {events.map((event) => (
            <motion.div
              layout
              key={event.id}
              initial={{ opacity: 0, x: 20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              className="bg-panel border border-theme rounded-xl p-3 backdrop-blur shadow-lg relative overflow-hidden"
            >
              {/* Shimmer effect while running */}
              {event.status === "running" && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.05] to-transparent"
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                />
              )}
              
              <div className="flex items-center gap-2 relative z-10">
                <span className={event.status === "running" ? "animate-pulse brightness-150" : "opacity-70"}>
                  {TOOL_ICONS[event.tool] ?? "⚙️"}
                </span>
              <span className="text-sm text-main flex-1">{event.label}</span>
              <span className="text-xs">{event.status === "done" ? "✅" : "…"}</span>
            </div>
            {event.status === "done" && event.result && (
              <>
                {event.tool === "search_market_data" && Array.isArray(event.result.sources) && event.result.sources.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {event.result.sources.map((source: any, i: number) => (
                      <a
                        key={i}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-void border border-theme hover:brightness-110 hover:scale-[1.02] hover:shadow-md transition-all duration-200 text-[11px] text-main max-w-full relative z-10"
                        title={source.title}
                      >
                        <span className="truncate">{source.title || new URL(source.url).hostname}</span>
                        <span className="shrink-0 text-[9px] opacity-70">↗</span>
                      </a>
                    ))}
                  </div>
                ) : (
                  <details className="mt-2 text-xs text-muted">
                    <summary className="cursor-pointer">details</summary>
                    <pre className="whitespace-pre-wrap break-words mt-1">
                      {JSON.stringify(event.result, null, 2)}
                    </pre>
                  </details>
                )}
              </>
            )}
          </motion.div>
        ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
