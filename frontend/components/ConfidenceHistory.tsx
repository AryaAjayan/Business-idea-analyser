"use client";

import { motion } from "framer-motion";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";

export default function ConfidenceHistory({ data }: { data: number[] }) {
  if (data.length < 2) return null;

  // Format data for recharts
  const chartData = data.map((value, i) => ({ index: i, value }));

  // Color logic based on the latest score
  const latestScore = data[data.length - 1];
  const strokeColor = latestScore >= 70 ? "#22c55e" : latestScore >= 40 ? "#eab308" : "#ef4444";

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="w-full max-w-xs mt-3 bg-panel border border-theme rounded-xl p-3 flex flex-col gap-2 shadow-inner"
    >
      <div className="flex justify-between items-center text-[10px] uppercase tracking-widest text-muted font-bold px-1">
        <span>Confidence Trend</span>
        <span className="text-main/70">{data.length} updates</span>
      </div>
      <div className="h-12 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <YAxis domain={[0, 100]} hide />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke={strokeColor} 
              strokeWidth={2} 
              dot={false}
              isAnimationActive={true}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
