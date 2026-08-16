"""
compile_investor_report - assembles everything gathered so far in the
session into one InvestorReport-shaped dict. Gemini calls this with
optional verdict/idea_name args; all research data comes from session_state,
which gemini_session.py accumulates every time an earlier tool returns.
"""
from tools._client import structure_as_json
import json


def estimate_confidence(session_state: dict) -> int:
    """
    Conservative evidence-based heuristic.

    Starts at 30 (idea only, zero external evidence). Increases only when
    real tool results come in. Never exceeds ~80 from the heuristic alone
    — the upper range requires Nova to explicitly set it via report_confidence
    based on her full assessment of the conversation.

    Key principle: a missing section drags the score DOWN, not up. An empty
    SWOT or no searches means we should be less confident, not neutral.
    """
    searches = session_state.get("searches", [])
    competitors = session_state.get("competitors", {})
    swot = session_state.get("swot", {})
    unit_econ = session_state.get("unit_economics", {})
    tam_som = session_state.get("tam_som", {})

    # Base: very early stage, idea only
    score = 30

    # Web search evidence: each successful search adds grounding
    successful = [s for s in searches if s.get("status") == "success"]
    score += min(len(successful) * 6, 18)  # +6 per search, max +18 (3 searches)

    # Market sizing: only if TAM was actually calculated
    if tam_som.get("tam_usd", 0) > 0:
        score += 6

    # Competitor analysis grounded in search data
    comps = competitors.get("key_competitors", [])
    if len(comps) >= 3:
        score += 8  # found real competition landscape
    elif len(comps) >= 1:
        score += 4

    # Market gap identified
    gap = competitors.get("gap_analysis", "")
    if gap and "gap" in gap.lower() and "no clear gap" not in gap.lower():
        score += 6

    # Unit economics: only reward if CAC was actually provided (not 0)
    margin = unit_econ.get("estimated_margin_pct")  # None = not estimated
    cac = unit_econ.get("cac", 0)
    if margin is not None and cac > 0:
        if margin > 60:
            score += 8
        elif margin > 30:
            score += 4
        else:
            score -= 3  # bad margins are a negative signal

    # SWOT balance — penalise if more threats than opportunities
    threats = swot.get("threats", [])
    opportunities = swot.get("opportunities", [])
    if threats or opportunities:
        if len(opportunities) > len(threats):
            score += 4
        elif len(threats) > len(opportunities) + 1:
            score -= 6

    # Penalise structuring errors (LLM failed to parse results cleanly)
    if competitors.get("_structuring_error") or swot.get("_structuring_error"):
        score -= 5

    return max(0, min(80, score))  # heuristic caps at 80; Nova's explicit call can go higher


async def compile_investor_report(session_state: dict) -> dict:
    tam_som = session_state.get("tam_som", {})
    competitors = session_state.get("competitors", {})
    swot = session_state.get("swot", {})
    unit_econ = session_state.get("unit_economics", {})

    # Nova's explicit score (from report_confidence tool call) always wins.
    # Heuristic is only the fallback when Nova hasn't set one.
    nova_score = session_state.get("nova_confidence")
    score = nova_score if nova_score is not None else estimate_confidence(session_state)

    verdict_text = session_state.get("verdict", "See spoken summary for verdict.")

    # Generate 3 specific next steps using Flash-Lite
    # Get idea summary from session_state (main.py sets it on session start if resuming, but we don't have it natively here.
    # Actually, we can just pass the raw data, no need for the explicit idea name if not present).
    prompt = f"""
Based on this business idea analysis, give exactly 3 concrete, specific, 
actionable next steps the founder should take this week - not generic 
advice like 'do more research', but specific actions tied to what was 
actually found (e.g. naming the specific competitor to study, the specific 
customer segment to interview, the specific number to validate). Return 
JSON: {{ "next_steps": ["...", "...", "..."] }}

Competitors found: {json.dumps(competitors.get('key_competitors', []))}
SWOT: {json.dumps(swot)}
Unit economics: {json.dumps(unit_econ)}
"""
    next_steps_result = await structure_as_json(prompt, fallback={"next_steps": []})
    next_steps = next_steps_result.get("next_steps", [])
    if not isinstance(next_steps, list) or len(next_steps) != 3:
        next_steps = ["Conduct 5 user interviews.", "Validate CAC estimates.", "Review competitor pricing."]

    return {
        "feasibility_score": score,
        "tam": tam_som.get("tam_usd", 0),
        "sam": tam_som.get("sam_usd", 0),
        "som": tam_som.get("som_usd", 0),
        "competitors": competitors.get("key_competitors", []),
        "swot": {
            "strengths": swot.get("strengths", []),
            "weaknesses": swot.get("weaknesses", []),
            "opportunities": swot.get("opportunities", []),
            "threats": swot.get("threats", []),
        },
        "unit_economics": {
            "cac": unit_econ.get("cac", 0),
            "ltv": unit_econ.get("ltv", 0),
            # None means CAC was unknown — frontend should show "Not estimated"
            "margin_pct": unit_econ.get("estimated_margin_pct"),
        },
        "next_steps": next_steps,
        "verdict": verdict_text,
        # Tells the frontend which sections have real data vs placeholders
        "evidence_flags": {
            "has_web_searches": any(s.get("status") == "success" for s in session_state.get("searches", [])),
            "search_count": sum(1 for s in session_state.get("searches", []) if s.get("status") == "success"),
            "has_market_size": tam_som.get("tam_usd", 0) > 0,
            "has_competitors": len(competitors.get("key_competitors", [])) > 0,
            "has_swot": bool(swot.get("strengths") or swot.get("opportunities")),
            "has_unit_economics": unit_econ.get("cac", 0) > 0 or unit_econ.get("ltv", 0) > 0,
            "nova_score_used": nova_score is not None,
        },
    }