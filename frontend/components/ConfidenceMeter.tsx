"use client";

import { motion, AnimatePresence } from "framer-motion";

function scoreColor(score: number): string {
  if (score >= 70) return "#22c55e";
  if (score >= 40) return "#eab308";
  return "#ef4444";
}

function scoreLabel(score: number): string {
  if (score >= 70) return "High";
  if (score >= 40) return "Moderate";
  return "Low";
}

export default function ConfidenceMeter({ score }: { score: number | null }) {
  if (score === null) return null;

  const color = scoreColor(score);
  const label = scoreLabel(score);
  const radius = 28;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Ring + number */}
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 72 72" className="w-full h-full -rotate-90">
          {/* Track */}
          <circle cx="36" cy="36" r={radius} fill="none" stroke="var(--border-color)" strokeWidth="5" />
          {/* Filled arc */}
          <motion.circle
            cx="36"
            cy="36"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            animate={{ 
              strokeDashoffset: circumference * (1 - score / 100),
              stroke: color,
              filter: `drop-shadow(0px 0px 4px ${color}80)`
            }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </svg>

        {/* Score number — sits on top of the ring, centred */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <AnimatePresence mode="popLayout">
            <motion.span
              key={score}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.25 }}
              style={{ color }}
              className="text-2xl font-bold leading-none tabular-nums"
            >
              {score}
            </motion.span>
          </AnimatePresence>
          <span className="text-[10px] text-muted mt-0.5 leading-none">/ 100</span>
        </div>
      </div>

      {/* Label row */}
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-[11px] text-muted uppercase tracking-widest">Confidence</span>
        <AnimatePresence mode="popLayout">
          <motion.span
            key={label}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            style={{ color }}
            className="text-xs font-semibold tracking-wide"
          >
            {label}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}
