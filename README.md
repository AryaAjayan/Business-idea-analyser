# Nova - Business Idea Analyzer

Nova is a highly advanced, agentic AI business advisor designed to help founders analyze, refine, and validate their business ideas in real time. Moving beyond traditional chat interfaces, Nova uses a true voice-native architecture to actively listen, reason, and autonomously trigger backend tools to conduct live market research, perform competitive analysis, and generate a comprehensive investor report.

## Architectural Highlights

This project was built to demonstrate enterprise-grade AI architecture, focusing on performance, autonomy, and clean separation of concerns.

### 1. True Voice-Native Architecture
Unlike standard wrappers that rely on slow, robotic text-to-speech pipelines, this application streams raw PCM audio over WebSockets directly to a natively multimodal model (Google Gemini Live API). This enables true duplex communication, sub-second latency, and natural barge-in (interruption) capabilities. 

### 2. Authentic Agentic Workflow
Nova acts as an autonomous agent rather than a simple chatbot. The AI serves as the central reasoning engine. When a founder describes an idea, the agent autonomously halts the conversation, triggers deterministic Python tools (like `search_market_data` or `calculate_tam_sam_som`), parses the resulting JSON, and incorporates that live data back into the voice stream without human intervention. 

### 3. Elegant Side-Channel UI
To solve the UX challenge of displaying dense data without forcing the AI to read lists out loud, the application utilizes a "side-channel" UI. The React frontend dynamically renders an "Agent Workspace", a live "Feasibility Meter", and sparkline charts that react to the AI's internal state and tool executions in real time.

### 4. Clean Separation of Concerns
The architecture is strictly decoupled:
*   **Frontend (Next.js 15):** A stateless React application handling the complex Web Audio API, WebSocket connection lifecycle, and dynamic UI rendering.
*   **Backend (FastAPI):** A Python backend handling the heavy lifting of WebSocket orchestration, synchronous/asynchronous tool execution, state aggregation, and SQLite persistence.

## Features

*   **Real-time Voice Interaction:** Fluid, low-latency voice conversations.
*   **Autonomous Market Research:** Automatically scrapes the web for market size, competitors, and trends during the conversation using the Tavily API.
*   **Live Feasibility Scoring:** Dynamically updates a confidence score based on the strength of the idea and evidence gathered.
*   **Instant Investor Report Generation:** Compiles all findings into a structured, downloadable PDF report (SWOT, TAM/SAM/SOM, Unit Economics).
*   **Document Intake:** Allows founders to upload existing research or pitch decks as context before starting the session.
*   **Fallback Input:** Seamlessly downgrades to text-input over WebSockets if microphone permissions are denied.

## Tech Stack

### Frontend
*   **Framework:** Next.js 15 (React 19)
*   **Styling:** Tailwind CSS, Framer Motion
*   **Data Visualization:** Recharts
*   **PDF Generation:** @react-pdf/renderer
*   **Audio Processing:** Native Web Audio API

### Backend
*   **Framework:** FastAPI (Python 3.10+)
*   **AI Engine:** Google GenAI SDK (Gemini Live API)
*   **Search Engine:** Tavily API
*   **Database:** SQLite (built-in)
*   **Concurrency:** asyncio, WebSockets

## Prerequisites

*   Node.js (v18 or higher)
*   Python (3.10 or higher)
*   Gemini API Key
*   Tavily API Key

## Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/AryaAjayan/Business-idea-analyser.git
    cd Business-idea-analyser
    ```

2.  **Setup Backend:**
    ```bash
    cd backend
    python -m venv venv
    
    # Windows
    venv\Scripts\activate
    # macOS/Linux
    source venv/bin/activate
    
    pip install -r requirements.txt
    ```

3.  **Setup Frontend:**
    ```bash
    cd ../frontend
    npm install
    ```

4.  **Environment Variables:**
    Create a `.env` file in the `backend` directory:
    ```env
    GEMINI_API_KEY=your_gemini_api_key
    TAVILY_API_KEY=your_tavily_api_key
    ```
    Create a `.env.local` file in the `frontend` directory:
    ```env
    NEXT_PUBLIC_WS_URL=ws://localhost:8001/ws
    NEXT_PUBLIC_API_URL=http://localhost:8001
    ```

## Running the Application

You need to run both the backend and frontend servers simultaneously.

**Start the Backend Server:**
```bash
cd backend
# Ensure your virtual environment is activated
uvicorn main:app --port 8001
```

**Start the Frontend Server:**
```bash
cd frontend
npm run dev
```

The application will be available at `http://localhost:3000`.

## Project Structure

```text
├── backend/
│   ├── main.py              # FastAPI server setup and REST endpoints
│   ├── gemini_session.py    # Manages the Gemini Live WebSocket lifecycle
│   ├── storage.py           # SQLite database operations
│   ├── schemas.py           # Pydantic models for type safety
│   ├── tools/               # Autonomous agent tools (SWOT, Financials, etc.)
│   └── sessions.db          # Local SQLite database (generated at runtime)
└── frontend/
    ├── app/                 # Next.js app router and global layouts
    ├── components/          # Reusable React UI components
    ├── hooks/               # Custom React hooks for Audio and WebSockets
    ├── lib/                 # Shared TypeScript types
    └── tailwind.config.js   # Tailwind CSS configuration
```
