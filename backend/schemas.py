"""
Shared data contracts. These mirror lib/types.ts on the frontend.
Keep both files in sync manually - if you add a field here, add it there too.
"""
from typing import Literal, Optional, Any
from pydantic import BaseModel


class ToolEvent(BaseModel):
    id: str
    tool: Literal[
        "search_market_data",
        "calculate_tam_sam_som",
        "analyze_competitors",
        "generate_swot",
        "estimate_unit_economics",
        "compile_investor_report",
    ]
    status: Literal["running", "done", "error"]
    label: str
    result: Optional[dict[str, Any]] = None


class InvestorReport(BaseModel):
    feasibility_score: int
    tam: float
    sam: float
    som: float
    competitors: list[dict[str, Any]]
    swot: dict[str, list[str]]
    unit_economics: dict[str, float]
    next_steps: list[str]
    verdict: str


# Outbound messages: backend -> frontend over the client WebSocket
class WSOutMessage(BaseModel):
    type: Literal["audio", "transcript", "tool_event", "report", "confidence_update", "error"]
    data: Optional[str] = None            # base64 audio, for type="audio"
    role: Optional[Literal["user", "agent"]] = None   # for type="transcript"
    text: Optional[str] = None            # for type="transcript"
    event: Optional[ToolEvent] = None     # for type="tool_event"
    report: Optional[InvestorReport] = None  # for type="report"
    score: Optional[int] = None           # for type="confidence_update"
    message: Optional[str] = None         # for type="error"
