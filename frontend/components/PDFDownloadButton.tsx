"use client";

// This file is intentionally isolated so it can be loaded with
// dynamic(() => import("./PDFDownloadButton"), { ssr: false })
// @react-pdf/renderer uses Blob/URL browser APIs that crash in Node.js SSR.

import { usePDF } from "@react-pdf/renderer";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import InvestorReportPDF from "./InvestorReportPDF";
import type { InvestorReport } from "@/lib/types";

export default function PDFDownloadButton({ report }: { report: InvestorReport }) {
  const [showPreview, setShowPreview] = useState(false);
  const [instance, updateInstance] = usePDF({ document: <InvestorReportPDF report={report} /> });

  // Update PDF instance if report changes
  useEffect(() => {
    updateInstance(<InvestorReportPDF report={report} />);
  }, [report, updateInstance]);

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => setShowPreview(true)}
        disabled={instance.loading || !!instance.error}
        className="btn-primary flex items-center gap-2 px-6 py-2.5 rounded-full border border-theme bg-slate-900 dark:bg-white/10 text-white dark:text-main text-sm font-bold tracking-wide transition-all disabled:opacity-40 disabled:cursor-wait"
      >
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
           <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
           <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
        </svg>
        {instance.loading ? "Generating PDF…" : instance.error ? "PDF Error" : "Preview PDF"}
      </motion.button>

      <AnimatePresence>
        {showPreview && instance.url && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 md:p-8"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-panel w-full max-w-5xl h-[90vh] md:h-full max-h-[900px] rounded-2xl overflow-hidden flex flex-col border border-theme shadow-2xl"
            >
              <div className="flex justify-between items-center p-4 border-b border-theme bg-void/50">
                <h3 className="font-display font-bold text-lg text-main">Report Preview</h3>
                <div className="flex gap-3">
                  <a 
                    href={instance.url} 
                    download="business-idea-report.pdf"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold transition flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Download
                  </a>
                  <button 
                    onClick={() => setShowPreview(false)}
                    className="px-4 py-2 border border-theme hover:bg-white/5 rounded-lg text-sm font-bold text-muted transition"
                  >
                    Close
                  </button>
                </div>
              </div>
              <iframe src={instance.url} className="w-full flex-1 bg-white" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
