"""
Pure-math tools. No LLM calls here on purpose - Vera should never guess
numbers, these functions give her real ones to reason over.
"""


def calculate_tam_sam_som(
    market_size_estimate: float,
    target_segment_pct: float,
    obtainable_pct: float,
) -> dict:
    """
    market_size_estimate: TAM in USD (Total Addressable Market)
    target_segment_pct: what % of TAM is the realistic target segment (SAM), 0-100
    obtainable_pct: what % of SAM is realistically obtainable in a few years (SOM), 0-100
    """
    tam = max(0.0, market_size_estimate)
    sam = tam * (max(0.0, min(100.0, target_segment_pct)) / 100)
    som = sam * (max(0.0, min(100.0, obtainable_pct)) / 100)

    return {
        "tam_usd": round(tam, 2),
        "sam_usd": round(sam, 2),
        "som_usd": round(som, 2),
    }


def estimate_unit_economics(
    estimated_price: float,
    estimated_cac: float = 0.0,
    estimated_retention_months: float = 12.0,
) -> dict:
    """
    estimated_price: monthly price per customer, in whatever currency the
        founder used (keep it consistent, don't silently convert)
    estimated_cac: customer acquisition cost, defaults to 0 if unknown
    estimated_retention_months: how many months an average customer stays
    """
    ltv = estimated_price * max(0.0, estimated_retention_months)
    margin_pct = None  # unknown until we have a real CAC
    ltv_cac_ratio = None

    if estimated_cac > 0:
        margin_pct = round(((ltv - estimated_cac) / ltv) * 100, 1)
        ltv_cac_ratio = round(ltv / estimated_cac, 2)

    return {
        "cac": round(estimated_cac, 2),
        "ltv": round(ltv, 2),
        "estimated_margin_pct": margin_pct,  # None = not estimated
        "ltv_cac_ratio": ltv_cac_ratio,
    }
