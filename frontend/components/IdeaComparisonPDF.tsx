// Comparison PDF — shows all ideas in one document:
// Page 1: Side-by-side summary table (all ideas)
// Page 2+: Full individual section per idea

import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { InvestorReport } from "@/lib/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return n > 0 ? `$${n}` : "—";
}

function scoreColor(s: number) {
  return s >= 70 ? "#16a34a" : s >= 40 ? "#ca8a04" : "#dc2626";
}

function scoreLabel(s: number) {
  return s >= 70 ? "High" : s >= 40 ? "Moderate" : "Low";
}

function ideaTitle(r: InvestorReport, idx: number): string {
  const prefix = r.verdict.startsWith("[") ? r.verdict.slice(1, r.verdict.indexOf("]")) : "";
  return prefix || `Idea ${idx + 1}`;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    paddingHorizontal: 40,
    paddingVertical: 36,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
    color: "#111111",
    fontSize: 10,
  },
  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottom: "1.5 solid #e5e7eb",
    paddingBottom: 8,
    marginBottom: 18,
  },
  brand: { fontSize: 9, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1.5 },
  date: { fontSize: 8, color: "#9ca3af" },

  sectionLabel: { fontSize: 8, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 },

  // ── Comparison table ────────────────────────────────────────────────────────
  comparisonTitle: { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#111111", marginBottom: 4 },
  comparisonSub: { fontSize: 10, color: "#6b7280", marginBottom: 16 },

  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderBottom: "0.5 solid #f3f4f6",
  },
  tableRowAlt: { backgroundColor: "#fafafa" },
  metricCol: { width: 110, fontSize: 9, color: "#6b7280" },
  metricColHeader: { width: 110, fontSize: 8, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1 },
  ideaCol: { flex: 1, fontSize: 9, paddingRight: 4 },
  ideaColHeader: { flex: 1, fontSize: 8, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1 },
  bold: { fontFamily: "Helvetica-Bold" },

  scorePill: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2, alignSelf: "flex-start" },
  scoreText: { fontSize: 9, fontFamily: "Helvetica-Bold" },

  // ── Per-idea section ────────────────────────────────────────────────────────
  ideaSection: { marginTop: 20 },
  ideaHeader: {
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    border: "1 solid #e5e7eb",
  },
  ideaNumber: { fontSize: 8, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 3 },
  ideaName: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  ideaVerdict: { fontSize: 9, color: "#4b5563", marginTop: 4, lineHeight: 1.5 },

  scoreBadge: { borderRadius: 6, padding: 8, alignItems: "center", minWidth: 64 },
  scoreBig: { fontSize: 26, fontFamily: "Helvetica-Bold", lineHeight: 1 },
  scoreOf: { fontSize: 7, color: "#6b7280", marginTop: 1 },
  scoreLbl: { fontSize: 7, fontFamily: "Helvetica-Bold", marginTop: 4, textTransform: "uppercase", letterSpacing: 1 },

  metricsRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  metricBlock: {
    flex: 1,
    backgroundColor: "#f9fafb",
    border: "1 solid #e5e7eb",
    borderRadius: 6,
    padding: 8,
    alignItems: "center",
  },
  metricLabel: { fontSize: 7, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 2 },
  metricValue: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#111827" },

  swotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  swotCell: { width: "48.5%", backgroundColor: "#f9fafb", borderRadius: 6, padding: 8 },
  swotKey: { fontSize: 7, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  swotItem: { fontSize: 8, color: "#374151", lineHeight: 1.4, marginBottom: 1.5 },

  strengthsKey: { color: "#16a34a" },
  weaknessesKey: { color: "#dc2626" },
  opportunitiesKey: { color: "#2563eb" },
  threatsKey: { color: "#d97706" },

  divider: { borderBottom: "1 solid #e5e7eb", marginVertical: 16 },

  footer: { position: "absolute", bottom: 20, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 7, color: "#d1d5db" },
});

const SWOT_CONFIG = [
  { key: "strengths" as const,     label: "Strengths",    style: s.strengthsKey },
  { key: "weaknesses" as const,    label: "Weaknesses",   style: s.weaknessesKey },
  { key: "opportunities" as const, label: "Opportunities", style: s.opportunitiesKey },
  { key: "threats" as const,       label: "Threats",      style: s.threatsKey },
];

const COMPARISON_ROWS = [
  { label: "Confidence",  getValue: (r: InvestorReport) => `${r.feasibility_score}/100 (${scoreLabel(r.feasibility_score)})` },
  { label: "TAM",         getValue: (r: InvestorReport) => fmt(r.tam) },
  { label: "SAM",         getValue: (r: InvestorReport) => fmt(r.sam) },
  { label: "SOM",         getValue: (r: InvestorReport) => fmt(r.som) },
  { label: "CAC",         getValue: (r: InvestorReport) => r.unit_economics.cac > 0 ? `$${r.unit_economics.cac}` : "—" },
  { label: "LTV",         getValue: (r: InvestorReport) => r.unit_economics.ltv > 0 ? `$${r.unit_economics.ltv}` : "—" },
  { label: "Margin",      getValue: (r: InvestorReport) => r.unit_economics.margin_pct > 0 ? `${r.unit_economics.margin_pct}%` : "—" },
  { label: "Competitors", getValue: (r: InvestorReport) => r.competitors.length > 0 ? r.competitors.map(c => c.name).join(", ") : "None found" },
];

// ── Component ──────────────────────────────────────────────────────────────────

interface Props {
  reports: InvestorReport[];
}

export default function IdeaComparisonPDF({ reports }: Props) {
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <Document title="Vera · Idea Comparison Report" author="Vera AI Advisor">
      {/* ── Page 1: Comparison table ── */}
      <Page size="A4" style={s.page}>
        <View style={s.pageHeader}>
          <Text style={s.brand}>Vera · Idea Comparison Report</Text>
          <Text style={s.date}>{today}</Text>
        </View>

        <Text style={s.comparisonTitle}>{reports.length} Ideas Compared</Text>
        <Text style={s.comparisonSub}>
          Side-by-side summary of all ideas discussed in this session.
          Full analysis for each idea follows on subsequent pages.
        </Text>

        {/* Table header */}
        <View style={s.tableHeader}>
          <Text style={s.metricColHeader}>Metric</Text>
          {reports.map((r, i) => (
            <Text key={i} style={[s.ideaColHeader, s.bold]}>{ideaTitle(r, i)}</Text>
          ))}
        </View>

        {/* Table rows */}
        {COMPARISON_ROWS.map(({ label, getValue }, ri) => (
          <View key={label} style={[s.tableRow, ri % 2 === 1 ? s.tableRowAlt : {}]}>
            <Text style={s.metricCol}>{label}</Text>
            {reports.map((r, ci) => (
              <Text key={ci} style={s.ideaCol}>{getValue(r)}</Text>
            ))}
          </View>
        ))}

        {/* Verdict row */}
        <View style={[s.tableRow, COMPARISON_ROWS.length % 2 === 1 ? s.tableRowAlt : {}]}>
          <Text style={s.metricCol}>Verdict</Text>
          {reports.map((r, ci) => {
            const raw = r.verdict.startsWith("[") ? r.verdict.slice(r.verdict.indexOf("]") + 2) : r.verdict;
            return <Text key={ci} style={s.ideaCol}>{raw.slice(0, 120)}{raw.length > 120 ? "…" : ""}</Text>;
          })}
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>Generated by Vera AI · Confidential</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>

      {/* ── Pages 2+: One full section per idea ── */}
      {reports.map((r, idx) => {
        const color = scoreColor(r.feasibility_score);
        const name = ideaTitle(r, idx);
        const verdict = r.verdict.startsWith("[") ? r.verdict.slice(r.verdict.indexOf("]") + 2) : r.verdict;

        return (
          <Page key={idx} size="A4" style={s.page}>
            <View style={s.pageHeader}>
              <Text style={s.brand}>Vera · {name}</Text>
              <Text style={s.date}>{today}</Text>
            </View>

            {/* Idea header: name + score */}
            <View style={s.ideaHeader}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={s.ideaNumber}>Idea {idx + 1}</Text>
                <Text style={s.ideaName}>{name}</Text>
                <Text style={s.ideaVerdict}>{verdict}</Text>
              </View>
              <View style={[s.scoreBadge, { backgroundColor: `${color}14`, border: `1.5 solid ${color}40` }]}>
                <Text style={[s.scoreBig, { color }]}>{r.feasibility_score}</Text>
                <Text style={s.scoreOf}>/ 100</Text>
                <Text style={[s.scoreLbl, { color }]}>{scoreLabel(r.feasibility_score)}</Text>
              </View>
            </View>

            {/* Market metrics */}
            <Text style={s.sectionLabel}>Market Size</Text>
            <View style={s.metricsRow}>
              {[
                { label: "TAM", value: fmt(r.tam) },
                { label: "SAM", value: fmt(r.sam) },
                { label: "SOM", value: fmt(r.som) },
                { label: "CAC", value: r.unit_economics.cac > 0 ? `$${r.unit_economics.cac}` : "—" },
                { label: "LTV", value: r.unit_economics.ltv > 0 ? `$${r.unit_economics.ltv}` : "—" },
                { label: "Margin", value: `${r.unit_economics.margin_pct}%` },
              ].map(({ label, value }) => (
                <View key={label} style={s.metricBlock}>
                  <Text style={s.metricLabel}>{label}</Text>
                  <Text style={s.metricValue}>{value}</Text>
                </View>
              ))}
            </View>

            {/* SWOT */}
            <Text style={s.sectionLabel}>SWOT Analysis</Text>
            <View style={s.swotGrid}>
              {SWOT_CONFIG.map(({ key, label, style: keyStyle }) => (
                <View key={key} style={s.swotCell}>
                  <Text style={[s.swotKey, keyStyle]}>{label}</Text>
                  {(r.swot[key] ?? []).slice(0, 4).map((item, i) => (
                    <View key={i} style={{ flexDirection: "row" }}>
                      <Text style={{ fontSize: 8, color: "#9ca3af", marginRight: 3 }}>•</Text>
                      <Text style={s.swotItem}>{item}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>

            {/* Competitors */}
            {r.competitors.length > 0 && (
              <View>
                <Text style={s.sectionLabel}>Competitors</Text>
                {r.competitors.slice(0, 5).map((c, i) => (
                  <View key={i} style={{ flexDirection: "row", paddingVertical: 3, borderBottom: "0.5 solid #f3f4f6" }}>
                    <Text style={{ width: 120, fontSize: 9, fontFamily: "Helvetica-Bold" }}>{c.name}</Text>
                    <Text style={{ flex: 1, fontSize: 9, color: "#6b7280" }}>{(c.strengths ?? []).slice(0, 2).join(", ")}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={s.footer} fixed>
              <Text style={s.footerText}>Generated by Vera AI · Confidential</Text>
              <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
            </View>
          </Page>
        );
      })}
    </Document>
  );
}
