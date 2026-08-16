"use client";

import { motion } from "framer-motion";
import type { AgentState } from "@/lib/types";

// Base colors for outer glow and rings
const STATE_COLORS: Record<AgentState, string> = {
  idle: "var(--color-idle)",
  listening: "var(--color-listening)",
  thinking: "var(--color-thinking)",
  speaking: "var(--color-speaking)",
};

// Distinct 3-color palette for the internal plasma blobs per state
const BLOB_PALETTES: Record<AgentState, [string, string, string]> = {
  idle: ["#4f46e5", "#3b82f6", "#8b5cf6"],       // Indigo, Blue, Violet
  listening: ["#06b6d4", "#0ea5e9", "#14b8a6"], // Cyan, Light Blue, Teal
  thinking: ["#9333ea", "#ec4899", "#d946ef"],  // Purple, Pink, Fuchsia
  speaking: ["#db2777", "#f43f5e", "#f59e0b"],  // Pink, Rose, Amber
};

export default function VoiceOrb({ state, amplitude }: { state: AgentState; amplitude: number }) {
  const color = STATE_COLORS[state];
  const palette = BLOB_PALETTES[state];
  const baseScale = 1 + amplitude * 0.4;

  return (
    <div className="relative flex items-center justify-center w-64 h-64">
      {/* Outer ambient glow */}
      <motion.div
        className="absolute rounded-full blur-2xl"
        style={{ backgroundColor: `rgb(${color})`, width: 220, height: 220 }}
        animate={{
          opacity: state === "idle" ? [0.2, 0.35, 0.2] : 0.45,
          scale: state === "idle" ? [1, 1.08, 1] : baseScale,
        }}
        transition={
          state === "idle"
            ? { duration: 3, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0.1 }
        }
      />

      {/* Thinking ring */}
      {state === "thinking" && (
        <motion.div
          className="absolute rounded-full border-2 border-transparent"
          style={{
            width: 190,
            height: 190,
            borderTopColor: `rgb(${color})`,
            borderRightColor: `rgb(${color})`,
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
        />
      )}

      {/* Core Plasma Orb */}
      <motion.div
        className="rounded-full relative z-10 overflow-hidden bg-black/20"
        style={{
          width: 140,
          height: 140,
          boxShadow: "inset 0 0 20px rgba(255,255,255,0.3), 0 4px 20px rgba(0,0,0,0.5)",
          border: "1px solid rgba(255,255,255,0.15)"
        }}
        animate={{ scale: baseScale }}
        transition={{ duration: 0.08 }}
      >
        {/* Plasma Blob 1 */}
        <motion.div
          className="absolute rounded-full blur-md"
          style={{
            width: "120%", height: "120%",
            background: `radial-gradient(circle, ${palette[0]} 0%, transparent 70%)`,
            mixBlendMode: "screen"
          }}
          animate={{ x: ["-10%", "15%", "-10%"], y: ["-10%", "15%", "-10%"], scale: [1, 1.1, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Plasma Blob 2 */}
        <motion.div
          className="absolute rounded-full blur-md"
          style={{
            width: "100%", height: "100%",
            background: `radial-gradient(circle, ${palette[1]} 0%, transparent 70%)`,
            mixBlendMode: "screen"
          }}
          animate={{ x: ["15%", "-20%", "15%"], y: ["10%", "-10%", "10%"], scale: [1, 1.2, 1] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Plasma Blob 3 */}
        <motion.div
          className="absolute rounded-full blur-md"
          style={{
            width: "90%", height: "90%",
            background: `radial-gradient(circle, ${palette[2]} 0%, transparent 70%)`,
            mixBlendMode: "screen"
          }}
          animate={{ x: ["-15%", "25%", "-15%"], y: ["15%", "-15%", "15%"], scale: [1, 1.15, 1] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      {/* Ripple ring on peak amplitude */}
      {amplitude > 0.4 && state !== "idle" && (
        <motion.div
          className="absolute rounded-full border border-theme z-0"
          style={{ width: 140, height: 140, borderColor: `rgb(${color})` }}
          initial={{ scale: 1, opacity: 0.6 }}
          animate={{ scale: 1.8, opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      )}
    </div>
  );
}
