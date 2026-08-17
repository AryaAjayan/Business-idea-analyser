"""
Small shared helper: a couple of the tools (SWOT, competitor analysis) need
to turn loose text into structured JSON. Rather than pull in a second LLM,
we reuse Gemini's free-tier Flash text model for this - it's a text
generation call, not a Live session, so it's simple request/response.
"""
import os
import json
from google import genai

_client = None


def get_text_client() -> genai.Client:
    global _client
    if _client is None:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY is not set in the environment.")
        _client = genai.Client(api_key=api_key)
    return _client


async def structure_as_json(prompt: str, fallback: dict) -> dict:
    """
    Calls Gemini 3.5 Flash-Lite (free tier) with a prompt asking for pure
    JSON back. Returns `fallback` if anything goes wrong, so a flaky call
    never crashes the live voice session.
    """
    try:
        client = get_text_client()
        resp = client.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents=prompt,
            config={"response_mime_type": "application/json"},
        )
        return json.loads(resp.text)
    except Exception as e:
        fallback["_structuring_error"] = str(e)
        return fallback
