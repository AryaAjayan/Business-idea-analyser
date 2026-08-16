# Frontend - Nova AI Architect

This directory contains the Next.js frontend application for Nova, providing a fluid, voice-native interface for founders to interact with the AI business advisor.

## Architectural Overview

The frontend is designed as a stateless, highly reactive presentation layer. It captures raw microphone input using the native Web Audio API, streams PCM data over WebSockets to the backend, and dynamically renders dense data visualizations based on real-time state updates from the AI agent.

### Core Components

*   **`app/page.tsx`**: The primary application view. It orchestrates the audio stream, WebSocket connection, and layout management.
*   **`hooks/useAudioStream.ts`**: Handles microphone permissions, captures raw audio, and converts it into the precise 16kHz PCM format required by Gemini Live.
*   **`hooks/useAgentSocket.ts`**: Manages the bidirectional WebSocket connection. It handles audio playback of the agent's voice and implements instantaneous audio queue flushing for seamless barge-in (interruption) capabilities.
*   **`components/VoiceOrb.tsx`**: The primary interaction interface, reacting dynamically to microphone amplitude and agent states (listening, thinking, speaking).
*   **`components/AgentWorkspace.tsx`**: A side-channel UI that visualizes the autonomous tools currently being executed by the backend.
*   **`components/InvestorSnapshot.tsx`**: Renders the final, aggregated business report, including Recharts visualizations for financial metrics.

## Setup Instructions

1.  **Install Dependencies:**
    ```bash
    cd frontend
    npm install
    ```

2.  **Environment Configuration:**
    Create a `.env.local` file in this directory to point the frontend to your local backend:
    ```env
    NEXT_PUBLIC_WS_URL=ws://localhost:8001/ws
    NEXT_PUBLIC_API_URL=http://localhost:8001
    ```

## Running the Application

Start the Next.js development server:

```bash
npm run dev
```

The application will be accessible at `http://localhost:3000`.

## Technical Considerations

*   **Web Audio API:** The application uses `ScriptProcessorNode` for audio capture to ensure reliable cross-browser compatibility within strict time constraints.
*   **Barge-in Logic:** True conversational interruption is achieved by forcefully stopping all scheduled `AudioBufferSourceNode` playback the moment an `interrupted` event is received from the WebSocket.
*   **PDF Generation:** The application uses `@react-pdf/renderer` to generate highly styled, downloadable PDF reports entirely on the client side, eliminating the need for complex backend PDF rendering pipelines.
