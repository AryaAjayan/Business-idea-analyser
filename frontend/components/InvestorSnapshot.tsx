"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, RadialBarChart, RadialBar } from "recharts";
import type { InvestorReport } from "@/lib/types";

// Loaded client-only — @react-pdf/renderer uses Blob/URL APIs unavailable in Node
const PDFDownloadButton = dynamic(() => import("./PDFDownloadButton"), {
  ssr: false,
  loading: () => (
    <div className="h-10 w-36 rounded-full bg-slate-200 dark:bg-white/5 animate-pulse" />
  ),
});

export default function InvestorSnapshot({ report }: { report: InvestorReport }) {
  const scoreColor =
    report.feasibility_score >= 70 ? "#22c55e" : report.feasibility_score >= 40 ? "#eab308" : "#ef4444";

  const marketData = [
    { name: "TAM", value: report.tam },
    { name: "SAM", value: report.sam },
    { name: "SOM", value: report.som },
  ];

  const gaugeData = [{ name: "score", value: report.feasibility_score, fill: scoreColor }];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.15 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  return (
    <motion.div 
      className="w-full max-w-2xl bg-panel border border-theme rounded-2xl p-6 flex flex-col gap-6 shadow-xl"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.p variants={itemVariants} className="text-base md:text-lg font-semibold text-center leading-relaxed text-main/90">
        {report.verdict}
      </motion.p>

      <motion.div variants={itemVariants} className="grid grid-cols-2 gap-6">
        <div className="flex flex-col items-center">
          <ResponsiveContainer width="100%" height={160}>
            <RadialBarChart
              innerRadius="70%"
              outerRadius="100%"
              data={gaugeData}
              startAngle={90}
              endAngle={-270}
            >
              <RadialBar background dataKey="value" cornerRadius={20} />
            </RadialBarChart>
          </ResponsiveContainer>
          <p className="text-sm text-muted -mt-4">Feasibility: {report.feasibility_score}/100</p>
        </div>

        <div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={marketData}>
              <XAxis dataKey="name" stroke="var(--border-color)" />
              <YAxis stroke="var(--border-color)" />
              <Bar dataKey="value" fill="rgb(var(--color-idle))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3 text-sm">
        {(["strengths", "weaknesses", "opportunities", "threats"] as const).map((key) => (
          <div key={key} className="bg-slate-100 dark:bg-white/5 rounded-xl p-3">
            <p className="uppercase text-xs text-muted mb-1">{key}</p>
            <ul className="list-disc list-inside text-main/80">
              {report.swot[key].map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </motion.div>

      {report.next_steps && report.next_steps.length > 0 && (
        <motion.div variants={itemVariants} className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-xl p-5 shadow-inner">
          <p className="uppercase text-[11px] text-indigo-700 dark:text-indigo-300 font-bold tracking-widest mb-3">Next Steps for the Founder</p>
          <div className="flex flex-col gap-2.5">
            {report.next_steps.map((step, i) => (
              <motion.div 
                key={i} 
                className="flex items-start gap-2.5"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.1 }}
              >
                <div className="shrink-0 mt-0.5 rounded flex items-center justify-center w-4 h-4 bg-indigo-200 dark:bg-indigo-500/20 border border-indigo-300 dark:border-indigo-400/50 text-indigo-700 dark:text-indigo-300">
                  <svg className="w-2.5 h-2.5" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="2.5 7.5 5.5 10.5 11.5 3.5" />
                  </svg>
                </div>
                <span className="text-sm text-indigo-950 dark:text-indigo-100/90 leading-relaxed">{step}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {report.competitors.length > 0 && (
        <motion.div variants={itemVariants}>
          <p className="uppercase text-xs text-muted mb-2">Competitors</p>
          <table className="w-full text-sm text-left text-main">
            <tbody>
              {report.competitors.map((c, i) => (
                <tr key={i} className="border-t border-theme">
                  <td className="py-1 pr-2 font-medium">{c.name}</td>
                  <td className="py-1 text-muted">{(c.strengths ?? []).join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}

      <motion.div variants={itemVariants} className="text-[13px] text-muted flex justify-between font-mono bg-slate-100 dark:bg-white/[0.02] py-2 px-4 rounded-lg border border-theme">
        <span>CAC: <strong className="text-main/80">{report.unit_economics.cac > 0 ? `$${report.unit_economics.cac}` : "N/A"}</strong></span>
        <span>LTV: <strong className="text-main/80">{report.unit_economics.ltv > 0 ? `$${report.unit_economics.ltv}` : "N/A"}</strong></span>
        <span>Margin: <strong className="text-main/80">{report.unit_economics.margin_pct != null ? `${report.unit_economics.margin_pct}%` : "N/A"}</strong></span>
      </motion.div>

      {/* PDF export — dynamically loaded client-only */}
      <motion.div variants={itemVariants} className="flex justify-center pt-2">
        <PDFDownloadButton report={report} />
      </motion.div>
    </motion.div>
  );
}
