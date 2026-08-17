from tools._client import structure_as_json


async def analyze_competitors(idea: str, search_results: str) -> dict:
    prompt = f"""
You are an expert business analyst. Identify the key competitors for the following business idea.
Use the search findings below, but ALSO use your own deep knowledge of the industry to identify major established players.

For each competitor, list their main strengths and weaknesses relative to the proposed idea.
If you cannot identify specific competitors, list general substitute solutions people use today.

Produce a JSON object with this exact shape, nothing else, no markdown fences:

{{
  "key_competitors": [
    {{"name": "...", "strengths": ["..."], "weaknesses": ["..."]}}
  ],
  "gap_analysis": "One or two sentence summary of the market gap or opportunity."
}}

Business idea: {idea}
Search findings and context:
{search_results}
"""
    fallback = {
        "key_competitors": [],
        "gap_analysis": "Could not extract competitor data from search results.",
    }
    return await structure_as_json(prompt, fallback)


async def generate_swot(idea: str, market_context: str) -> dict:
    prompt = f"""
You are an expert business analyst. Generate a comprehensive SWOT analysis for the following business idea.

Use the provided market context, but ALSO deeply rely on your own industry knowledge, logic, and strategic reasoning to identify strengths, weaknesses, opportunities, and threats.

Rules:
- Be highly specific to this exact idea and market dynamics.
- Avoid generic filler (e.g., "good team", "large market").
- Provide 2 to 4 highly insightful bullet points per category.
- Do NOT return empty categories. You are an expert; you can always deduce strategic risks and advantages.

Produce a JSON object with this exact shape, nothing else, no markdown fences:

{{
  "strengths": ["..."],
  "weaknesses": ["..."],
  "opportunities": ["..."],
  "threats": ["..."]
}}

Business idea: {idea}
Market context:
{market_context}
"""
    fallback = {
        "strengths": [],
        "weaknesses": [],
        "opportunities": [],
        "threats": [],
    }
    return await structure_as_json(prompt, fallback)
