// @react-pdf/renderer document — uses its own primitives (View, Text, Page,
// Document, StyleSheet), NOT regular HTML or Tailwind. Do not import React
// hooks or browser APIs here; this is rendered by @react-pdf's engine.

import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { InvestorReport } from "@/lib/types";

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n}`;
}

function scoreColor(s: number) {
  return s >= 70 ? "#16a34a" : s >= 40 ? "#ca8a04" : "#dc2626";
}

function scoreLabel(s: number) {
  return s >= 70 ? "High Confidence" : s >= 40 ? "Moderate Confidence" : "Low Confidence";
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    paddingHorizontal: 44,
    paddingVertical: 40,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
    color: "#111111",
    fontSize: 10,
  },

  // Header
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20, borderBottom: "1.5 solid #e5e7eb", paddingBottom: 10 },
  brand: { fontSize: 9, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1.5 },
  date: { fontSize: 8, color: "#9ca3af" },

  // Verdict
  verdictBox: { backgroundColor: "#f9fafb", borderRadius: 8, padding: 14, marginBottom: 18 },
  verdictLabel: { fontSize: 8, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 4 },
  verdictText: { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#111111", lineHeight: 1.4 },

  // Section header
  sectionLabel: { fontSize: 8, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 },

  // Feasibility + market row
  topRow: { flexDirection: "row", gap: 12, marginBottom: 18 },

  // Feasibility score card
  scoreCard: { flex: 1, borderRadius: 8, padding: 14, alignItems: "center", justifyContent: "center" },
  scoreBig: { fontSize: 48, fontFamily: "Helvetica-Bold", lineHeight: 1 },
  scoreOf: { fontSize: 10, color: "#6b7280", marginTop: 2 },
  scoreLabel: { fontSize: 9, fontFamily: "Helvetica-Bold", marginTop: 6, textTransform: "uppercase", letterSpacing: 1 },

  // Market stats
  marketCard: { flex: 1.4, borderRadius: 8, backgroundColor: "#f9fafb", padding: 14 },
  marketRow: { flexDirection: "row", marginTop: 8, gap: 8 },
  statBlock: { flex: 1, backgroundColor: "#ffffff", borderRadius: 6, padding: 8, alignItems: "center", border: "1 solid #e5e7eb" },
  statLabel: { fontSize: 7, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 3 },
  statValue: { fontSize: 13, fontFamily: "Helvetica-Bold", color: "#111827" },

  // SWOT grid
  swotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 18 },
  swotCell: { width: "48.5%", backgroundColor: "#f9fafb", borderRadius: 8, padding: 10 },
  swotKey: { fontSize: 8, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 1.1, marginBottom: 5 },
  swotItem: { fontSize: 9, color: "#374151", lineHeight: 1.5, marginBottom: 2 },
  bullet: { fontSize: 9, color: "#9ca3af", marginRight: 3 },

  // SWOT key colors
  strengthsKey: { color: "#16a34a" },
  weaknessesKey: { color: "#dc2626" },
  opportunitiesKey: { color: "#2563eb" },
  threatsKey: { color: "#d97706" },

  // Next Steps
  nextStepsSection: { marginBottom: 18, backgroundColor: "#f5f3ff", borderRadius: 8, padding: 12, border: "1 solid #ede9fe" },
  nextStepsTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 1.1, color: "#6d5dfc", marginBottom: 6 },
  nextStepsItemRow: { flexDirection: "row", marginBottom: 4 },
  nextStepsNumber: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#8b5cf6", marginRight: 4, width: 12 },
  nextStepsItem: { flex: 1, fontSize: 9, color: "#4c1d95", lineHeight: 1.5 },

  // Competitors table
  competitorSection: { marginBottom: 18 },
  tableHeader: { flexDirection: "row", backgroundColor: "#f3f4f6", borderRadius: 4, paddingHorizontal: 8, paddingVertical: 5, marginBottom: 2 },
  tableRow: { flexDirection: "row", paddingHorizontal: 8, paddingVertical: 5, borderBottom: "0.5 solid #f3f4f6" },
  colName: { flex: 1, fontSize: 9, fontFamily: "Helvetica-Bold", color: "#374151" },
  colStrengths: { flex: 2.5, fontSize: 9, color: "#6b7280" },
  colHeader: { fontSize: 8, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1 },

  // Unit economics footer
  econRow: { flexDirection: "row", justifyContent: "space-around", backgroundColor: "#f9fafb", borderRadius: 8, padding: 12, marginTop: 4 },
  econBlock: { alignItems: "center" },
  econLabel: { fontSize: 7, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 3 },
  econValue: { fontSize: 13, fontFamily: "Helvetica-Bold", color: "#111827" },

  // Footer
  footer: { position: "absolute", bottom: 24, left: 44, right: 44, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 7, color: "#d1d5db" },
});

// ── SWOT key config ────────────────────────────────────────────────────────────

const swotConfig = [
  { key: "strengths",     label: "Strengths",     labelStyle: s.strengthsKey },
  { key: "weaknesses",    label: "Weaknesses",     labelStyle: s.weaknessesKey },
  { key: "opportunities", label: "Opportunities",  labelStyle: s.opportunitiesKey },
  { key: "threats",       label: "Threats",        labelStyle: s.threatsKey },
] as const;

// ── Component ─────────────────────────────────────────────────────────────────

export default function InvestorReportPDF({ report }: { report: InvestorReport }) {
  const color = scoreColor(report.feasibility_score);
  const label = scoreLabel(report.feasibility_score);
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <Document title="Vera Business Analysis Report" author="Vera AI Advisor">
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.headerRow}>
          <Text style={s.brand}>Vera · Business Analysis Report</Text>
          <Text style={s.date}>{today}</Text>
        </View>

        {/* ── Verdict ── */}
        <View style={s.verdictBox}>
          <Text style={s.verdictLabel}>Advisor Verdict</Text>
          <Text style={s.verdictText}>{report.verdict}</Text>
        </View>

        {/* ── Feasibility + Market (side by side) ── */}
        <View style={s.topRow}>

          {/* Feasibility score card */}
          <View style={[s.scoreCard, { backgroundColor: `${color}14`, border: `1.5 solid ${color}40` }]}>
            <Text style={s.sectionLabel}>Feasibility Score</Text>
            <Text style={[s.scoreBig, { color }]}>{report.feasibility_score}</Text>
            <Text style={s.scoreOf}>out of 100</Text>
            <Text style={[s.scoreLabel, { color }]}>{label}</Text>
          </View>

          {/* Market size stat blocks */}
          <View style={s.marketCard}>
            <Text style={s.sectionLabel}>Market Size</Text>
            <View style={s.marketRow}>
              {[
                { label: "TAM", value: fmt(report.tam) },
                { label: "SAM", value: fmt(report.sam) },
                { label: "SOM", value: fmt(report.som) },
              ].map(({ label: lbl, value }) => (
                <View key={lbl} style={s.statBlock}>
                  <Text style={s.statLabel}>{lbl}</Text>
                  <Text style={s.statValue}>{value}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── SWOT ── */}
        <Text style={[s.sectionLabel, { marginBottom: 6 }]}>SWOT Analysis</Text>
        <View style={s.swotGrid}>
          {swotConfig.map(({ key, label: lbl, labelStyle }) => (
            <View key={key} style={s.swotCell}>
              <Text style={[s.swotKey, labelStyle]}>{lbl}</Text>
              {(report.swot[key] ?? []).map((item, i) => (
                <View key={i} style={{ flexDirection: "row" }}>
                  <Text style={s.bullet}>•</Text>
                  <Text style={s.swotItem}>{item}</Text>
                </View>
              ))}
              {(report.swot[key] ?? []).length === 0 && (
                <Text style={[s.swotItem, { color: "#9ca3af", fontStyle: "italic" }]}>None identified</Text>
              )}
            </View>
          ))}
        </View>

        {/* ── Next Steps ── */}
        {report.next_steps && report.next_steps.length > 0 && (
          <View style={s.nextStepsSection}>
            <Text style={s.nextStepsTitle}>Next Steps for the Founder</Text>
            {report.next_steps.map((step, i) => (
              <View key={i} style={s.nextStepsItemRow}>
                <Text style={s.nextStepsNumber}>{i + 1}.</Text>
                <Text style={s.nextStepsItem}>{step}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Competitors ── */}
        {report.competitors.length > 0 && (
          <View style={s.competitorSection}>
            <Text style={s.sectionLabel}>Competitor Landscape</Text>
            <View style={s.tableHeader}>
              <Text style={[s.colName, s.colHeader]}>Competitor</Text>
              <Text style={[s.colStrengths, s.colHeader]}>Key Strengths</Text>
            </View>
            {report.competitors.map((c, i) => (
              <View key={i} style={s.tableRow}>
                <Text style={s.colName}>{c.name}</Text>
                <Text style={s.colStrengths}>{(c.strengths ?? []).join(", ") || "—"}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Unit Economics ── */}
        <Text style={s.sectionLabel}>Unit Economics</Text>
        <View style={s.econRow}>
          {[
            { label: "CAC",    value: report.unit_economics.cac > 0 ? `$${report.unit_economics.cac}` : "Not estimated" },
            { label: "LTV",    value: report.unit_economics.ltv > 0 ? `$${report.unit_economics.ltv}` : "Not estimated" },
            { label: "Margin", value: report.unit_economics.margin_pct != null ? `${report.unit_economics.margin_pct}%` : "Not estimated" },
          ].map(({ label: lbl, value }) => (
            <View key={lbl} style={s.econBlock}>
              <Text style={s.econLabel}>{lbl}</Text>
              <Text style={s.econValue}>{value}</Text>
            </View>
          ))}
        </View>

        {/* ── Page footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Generated by Vera AI · Confidential</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages}`
          } />
        </View>

      </Page>
    </Document>
  );
}
