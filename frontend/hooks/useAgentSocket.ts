"use client";

import { useRef, useState, useCallback } from "react";
import type { AgentState, ToolEvent, InvestorReport, WSMessage } from "@/lib/types";

const AGENT_AUDIO_SAMPLE_RATE = 24000; // Gemini Live's audio output rate

export function useAgentSocket(wsUrl: string) {
  const [connected, setConnected] = useState(false);
  const [agentState, setAgentState] = useState<AgentState>("idle");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<Array<{ role: "user" | "agent"; text: string }>>([]);
  const [toolEvents, setToolEvents] = useState<ToolEvent[]>([]);
  const [report, setReport] = useState<InvestorReport | null>(null);
  const [agentAmplitude, setAgentAmplitude] = useState(0);
  const [confidenceScore, setConfidenceScore] = useState(0);
  const [confidenceHistory, setConfidenceHistory] = useState<number[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const scheduledSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const nextStartTimeRef = useRef(0);

  const getPlaybackContext = useCallback(() => {
    if (!playbackContextRef.current) {
      playbackContextRef.current = new AudioContext({ sampleRate: AGENT_AUDIO_SAMPLE_RATE });
    }
    return playbackContextRef.current;
  }, []);

  /** Stops everything currently queued/playing - called the instant Gemini
   * signals an interruption, so barge-in actually feels instant instead of
   * finishing the old sentence first (the exact bug we saw in AI Studio). */
  const flushPlayback = useCallback(() => {
    scheduledSourcesRef.current.forEach((src) => {
      try {
        src.stop();
      } catch {
        // already stopped, ignore
      }
    });
    scheduledSourcesRef.current = [];
    nextStartTimeRef.current = 0;
  }, []);

  const playAgentAudioChunk = useCallback(
    (base64Pcm: string) => {
      const ctx = getPlaybackContext();

      // Always try to resume — Chrome may have auto-suspended the context
      // if it was created outside a user-gesture, or after a period of silence.
      if (ctx.state !== "running") {
        ctx.resume().catch(() => {});
      }

      const binary = atob(base64Pcm);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

      const pcm16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(pcm16.length);
      let sumSquares = 0;
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 0x8000;
        sumSquares += float32[i] * float32[i];
      }
      setAgentAmplitude(Math.min(1, Math.sqrt(sumSquares / pcm16.length) * 4));

      const buffer = ctx.createBuffer(1, float32.length, AGENT_AUDIO_SAMPLE_RATE);
      buffer.copyToChannel(float32, 0);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);

      const startAt = Math.max(ctx.currentTime, nextStartTimeRef.current);
      source.start(startAt);
      nextStartTimeRef.current = startAt + buffer.duration;

      scheduledSourcesRef.current.push(source);
      source.onended = () => {
        scheduledSourcesRef.current = scheduledSourcesRef.current.filter((s) => s !== source);
        // When the last queued chunk finishes playing, Vera has finished her
        // turn. Reset state to listening and clear the time cursor so the
        // next turn's chunks schedule from "now" instead of a stale offset.
        if (scheduledSourcesRef.current.length === 0) {
          nextStartTimeRef.current = 0;
          setAgentState("listening");
        }
      };
    },
    [getPlaybackContext]
  );

  const connect = useCallback((sessionId?: string) => {
    // Reset all state for a completely fresh start
    setTranscript([]);
    setAgentState("idle");
    setAgentAmplitude(0);
    setConfidenceScore(0);
    setConfidenceHistory([]);
    setToolEvents([]);
    setReport(null);
    setActiveSessionId(sessionId || null);

    const url = sessionId ? `${wsUrl}?session_id=${sessionId}` : wsUrl;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      // Create (or resume) the playback AudioContext here, while we are
      // inside a user-gesture call stack (button click -> connect()).
      // Chrome suspends AudioContexts created outside user gestures, which
      // causes scheduled audio to fire onended immediately with no sound.
      const ctx = getPlaybackContext();
      ctx.resume().catch(() => {});
    };
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    ws.onmessage = (event) => {
      const msg: WSMessage = JSON.parse(event.data);

      switch (msg.type) {
        case "audio":
          setAgentState("speaking");
          playAgentAudioChunk(msg.data);
          break;

        case "interrupted":
          flushPlayback();
          setAgentState("listening");
          break;

        case "transcript":
          setTranscript((prev) => [...prev, { role: msg.role, text: msg.text }]);
          break;

        case "tool_event":
          setAgentState("thinking");
          setToolEvents((prev) => {
            const idx = prev.findIndex((e) => e.id === msg.event.id);
            if (idx === -1) return [...prev, msg.event];
            const copy = [...prev];
            copy[idx] = msg.event;
            return copy;
          });
          break;

        case "report":
          setReport(msg.report);
          break;

        case "confidence_update":
          setConfidenceScore(msg.score);
          setConfidenceHistory(prev => [...prev, msg.score]);
          break;

        case "error":
          console.error("Agent error:", msg.message);
          break;
      }
    };
  }, [wsUrl, getPlaybackContext, playAgentAudioChunk, flushPlayback]);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    flushPlayback();
    setAgentState("idle");
  }, [flushPlayback]);

  const sendAudioChunk = useCallback((base64Pcm: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "audio", data: base64Pcm }));
    }
  }, []);

  const sendTextInput = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "text_input", text }));
    }
  }, []);

  const generateReport = useCallback(() => {
    const hasSwot = toolEvents.some(e => e.tool === "generate_swot" && e.status === "done");
    const hasMarket = toolEvents.some(e => e.tool === "calculate_tam_sam_som" && e.status === "done");
    
    if (!hasSwot || !hasMarket) {
       if (!window.confirm("Nova hasn't gathered full market data yet (e.g. SWOT, Market Size). The report may have empty sections. Generate anyway?")) {
         return;
       }
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "generate_report" }));
    }
  }, [toolEvents]);

  const setLanguage = useCallback((lang: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "set_language", language: lang }));
    }
  }, []);

  return {
    transcript,
    agentState,
    agentAmplitude,
    confidenceScore,
    confidenceHistory,
    toolEvents,
    report,
    activeSessionId,
    connected,
    connect,
    disconnect,
    sendAudioChunk,
    sendTextInput,
    generateReport,
    setLanguage,
    setAgentState,
  };
}