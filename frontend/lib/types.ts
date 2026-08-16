// Mirrors backend/schemas.py. Keep both in sync if you change either.

export type AgentState = "idle" | "listening" | "thinking" | "speaking";

export type ToolName =
  | "search_market_data"
  | "calculate_tam_sam_som"
  | "analyze_competitors"
  | "generate_swot"
  | "estimate_unit_economics"
  | "compile_investor_report"
  | "report_confidence";

export type ToolEvent = {
  id: string;
  tool: ToolName;
  status: "running" | "done" | "error";
  label: string;
  result?: Record<string, unknown>;
};

export type InvestorReport = {
  feasibility_score: number;
  tam: number;
  sam: number;
  som: number;
  competitors: Array<{ name: string; strengths?: string[]; weaknesses?: string[] }>;
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  unit_economics: { cac: number; ltv: number; margin_pct: number };
  next_steps: string[];
  verdict: string;
};

// Every message type the backend can send over the WebSocket
export type WSMessage =
  | { type: "audio"; data: string }
  | { type: "transcript"; role: "user" | "agent"; text: string }
  | { type: "tool_event"; event: ToolEvent }
  | { type: "report"; report: InvestorReport }
  | { type: "confidence_update"; score: number }
  | { type: "interrupted" }
  | { type: "session_reset"; snapshot: InvestorReport | null; snapshot_index: number }
  | { type: "error"; message: string };
