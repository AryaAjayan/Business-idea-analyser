from tools._client import structure_as_json


async def analyze_competitors(idea: str, search_results: str) -> dict:
    prompt = f"""
You are a strict business analyst. Using ONLY the information in the search
findings below, extract real competitors. Do NOT invent names, do NOT add
companies that are not mentioned in the search findings.

If the search findings do not contain clear competitor information, return
an empty key_competitors list. It is better to return nothing than to
hallucinate companies.

Produce a JSON object with this exact shape, nothing else, no markdown fences:

{{
  "key_competitors": [
    {{"name": "...", "strengths": ["..."], "weaknesses": ["..."]}}
  ],
  "gap_analysis": "one or two sentence summary of the market gap, drawn ONLY from the search findings. If no gap is evident, write 'No clear gap identified from available evidence.'"
}}

Business idea: {idea}
Search findings (ONLY source of truth - do not add anything beyond this):
{search_results}
"""
    fallback = {
        "key_competitors": [],
        "gap_analysis": "Could not extract competitor data from search results.",
    }
    return await structure_as_json(prompt, fallback)


async def generate_swot(idea: str, market_context: str) -> dict:
    prompt = f"""
You are a strict business analyst. Using ONLY the information in the market
context below, generate a SWOT analysis. Every bullet point must be directly
supported by something in the provided market context.

Rules:
- Do NOT add generic industry clichés (e.g. "large market opportunity") unless
  specifically evidenced in the context.
- Do NOT invent threats or opportunities not mentioned in the context.
- If there is not enough evidence for a category, return an empty list for
  that category. Empty lists are correct and honest.
- Maximum 4 items per category.

Produce a JSON object with this exact shape, nothing else, no markdown fences:

{{
  "strengths": ["..."],
  "weaknesses": ["..."],
  "opportunities": ["..."],
  "threats": ["..."]
}}

Business idea: {idea}
Market context (ONLY source of truth - do not add anything beyond this):
{market_context}
"""
    fallback = {
        "strengths": [],
        "weaknesses": [],
        "opportunities": [],
        "threats": [],
    }
    return await structure_as_json(prompt, fallback)
