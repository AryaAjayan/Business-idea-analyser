"use client";

import { useRef, useState, useCallback } from "react";

const TARGET_SAMPLE_RATE = 16000;

/**
 * Captures microphone audio, converts it to 16-bit PCM at 16kHz (the format
 * Gemini Live expects), and reports live amplitude for the voice orb.
 *
 * Uses ScriptProcessorNode rather than AudioWorklet on purpose - it's
 * deprecated but far simpler to get working reliably under a tight deadline,
 * and still widely supported. If you have time later, migrating to an
 * AudioWorklet is the "proper" upgrade.
 *
 * IMPORTANT: do NOT call stop() between turns — call pauseRecording() instead.
 * stop() permanently closes the AudioContext; pauseRecording() just disconnects
 * the processor node so audio stops flowing while keeping the context alive for
 * the next turn.
 */
export function useAudioStream() {
  const [amplitude, setAmplitude] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [micFailed, setMicFailed] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const start = useCallback(async (onChunk: (base64Pcm: string) => void) => {
    // Reuse existing stream/context if already alive (resuming after a turn)
    let stream = streamRef.current;
    if (!stream || stream.getTracks().some((t) => t.readyState === "ended")) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        setMicFailed(false);
      } catch (err) {
        console.error("Microphone access failed:", err);
        setMicFailed(true);
        return;
      }
    }

    let audioContext = audioContextRef.current;
    if (!audioContext || audioContext.state === "closed") {
      audioContext = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });
      audioContextRef.current = audioContext;
    }
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    // Always create a fresh processor so onaudioprocess uses the latest onChunk
    processorRef.current?.disconnect();
    const source = audioContext.createMediaStreamSource(stream);
    sourceRef.current = source;

    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = (event) => {
      const input = event.inputBuffer.getChannelData(0);

      // live amplitude for the orb (simple RMS)
      let sumSquares = 0;
      for (let i = 0; i < input.length; i++) sumSquares += input[i] * input[i];
      const rms = Math.sqrt(sumSquares / input.length);
      setAmplitude(Math.min(1, rms * 4)); // scaled up, mic input is usually quiet

      // convert Float32 [-1,1] -> Int16 PCM
      const pcm16 = new Int16Array(input.length);
      for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }

      const bytes = new Uint8Array(pcm16.buffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      onChunk(btoa(binary));
    };

    source.connect(processor);
    processor.connect(audioContext.destination);
    setIsRecording(true);
  }, []);

  /** Between turns: stop audio flowing but keep the AudioContext and mic
   * stream alive so start() can resume instantly without re-requesting
   * microphone permissions or creating a new AudioContext. */
  const pauseRecording = useCallback(() => {
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    setIsRecording(false);
    setAmplitude(0);
  }, []);

  /** Full teardown — only call this when the whole session ends (End Session
   * button). Closes the AudioContext permanently. */
  const stop = useCallback(() => {
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    audioContextRef.current?.close();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioContextRef.current = null;
    streamRef.current = null;
    setIsRecording(false);
    setAmplitude(0);
  }, []);

  return { start, stop, pauseRecording, amplitude, isRecording, micFailed };
}
