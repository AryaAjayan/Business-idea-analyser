"""
search_market_data tool.

Tries Tavily's free-tier REST API (1,000 searches/month, no card required:
https://tavily.com). If TAVILY_API_KEY isn't set, falls back to a clearly
labeled stub so the rest of the pipeline still runs during development.
"""
import os
import httpx

TAVILY_URL = "https://api.tavily.com/search"
TIMEOUT_SECONDS = 6.0


async def search_market_data(idea: str, aspect: str) -> dict:
    """
    aspect is one of: "market_size", "competitors", "trends"
    Returns a small dict with a summary + raw results, safe to hand back to Gemini.
    """
    api_key = os.getenv("TAVILY_API_KEY")
    query = f"{idea} {aspect.replace('_', ' ')}"

    if not api_key:
        return {
            "status": "stub",
            "summary": (
                f"[No TAVILY_API_KEY set] Would have searched for: '{query}'. "
                "Add TAVILY_API_KEY to your .env to get real results."
            ),
            "sources": [],
        }

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
            resp = await client.post(
                TAVILY_URL,
                json={
                    "api_key": api_key,
                    "query": query,
                    "search_depth": "basic",
                    "max_results": 5,
                },
            )
            resp.raise_for_status()
            data = resp.json()

        results = data.get("results", [])
        summary = data.get("answer") or "No summary available."
        sources = [
            {"title": r.get("title"), "url": r.get("url")}
            for r in results[:5]
        ]
        return {"status": "success", "summary": summary, "sources": sources}

    except httpx.TimeoutException:
        return {
            "status": "timeout",
            "summary": f"Search for '{query}' timed out after {TIMEOUT_SECONDS}s. Proceeding without fresh data.",
            "sources": [],
        }
    except Exception as e:
        return {
            "status": "error",
            "summary": f"Search failed: {str(e)}. Proceeding without fresh data.",
            "sources": [],
        }
