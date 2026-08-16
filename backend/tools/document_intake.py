import io
import pypdf
from typing import Optional
from tools._client import get_text_client

def extract_pdf_text(file_bytes: bytes) -> str:
    """Extracts text from a PDF, truncating to the first 4000 characters."""
    reader = pypdf.PdfReader(io.BytesIO(file_bytes))
    extracted = []
    total_len = 0
    
    for page in reader.pages:
        text = page.extract_text()
        if text:
            extracted.append(text)
            total_len += len(text)
            if total_len > 4000:
                break
                
    full_text = "\n".join(extracted)
    return full_text[:4000]

def extract_image_summary(file_bytes: bytes, mime_type: str) -> str:
    """Summarizes business-relevant content from an image using Gemini."""
    client = get_text_client()
    
    # We can pass the raw bytes directly if we wrap them properly, 
    # but the simplest way with the genai SDK is usually uploading or passing inline data.
    # The client allows dicts for inline data.
    response = client.models.generate_content(
        model="gemini-3.1-flash-lite",
        contents=[
            "Please summarize any business-relevant content, text, or charts visible in this image. Be concise and factual.",
            {"mime_type": mime_type, "data": file_bytes}
        ]
    )
    return response.text
