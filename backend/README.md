# Backend - Nova AI Architect

This directory contains the FastAPI backend that orchestrates the Gemini Live API session, manages state, and executes autonomous tools for Nova.

## Architectural Overview

The backend acts as the secure, stateful brain of the application. It maintains an active WebSocket connection with the Next.js frontend, forwarding raw audio bytes directly to Google's Gemini Live API. Instead of merely proxying requests, it intercepts tool-call requests from Gemini, executes the appropriate deterministic Python functions, and injects the live data back into the LLM's context stream.

### Core Modules

*   **`main.py`**: The FastAPI entry point. It defines the `/ws` WebSocket route, manages connection lifecycles, and exposes REST endpoints for session history management.
*   **`gemini_session.py`**: The orchestration engine. It initializes the `google-genai` async client, maintains the duplex stream, and maps model tool-calls to local Python functions.
*   **`storage.py`**: A lightweight SQLite persistence layer. It stores session transcripts, tool states, and generated reports without requiring external database infrastructure.
*   **`schemas.py`**: Pydantic models ensuring strict type safety for data flowing between the frontend, backend, and the LLM.
*   **`tools/`**: The deterministic capability extensions for Nova.
    *   `search.py`: Live web scraping via the Tavily API.
    *   `financials.py`: Calculates TAM/SAM/SOM and Unit Economics.
    *   `swot.py`: Structures raw market data into SWOT frameworks.
    *   `report.py`: Aggregates state into a final Investor Report JSON.

## Setup Instructions

1.  **Virtual Environment:**
    ```bash
    cd backend
    python3 -m venv venv
    
    # Windows
    venv\Scripts\activate
    # macOS/Linux
    source venv/bin/activate
    ```

2.  **Install Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

3.  **Environment Configuration:**
    Create a `.env` file in this directory with the following keys:
    ```env
    GEMINI_API_KEY=your_gemini_api_key
    TAVILY_API_KEY=your_tavily_api_key
    ```

## Running the Server

Start the application using Uvicorn:

```bash
uvicorn main:app --port 8001
```

The server will be accessible at `http://localhost:8001`.

## Security & Scalability Notes

*   **State Management:** Session state is maintained in-memory per WebSocket connection and flushed to SQLite upon disconnection. 
*   **Budgeting:** To prevent infinite tool-calling loops, a strict tool execution budget is enforced within `gemini_session.py`.
*   **CORS:** Currently configured for local development. For production deployment, restrict the `allow_origins` array in `main.py` to the deployed frontend domain.
