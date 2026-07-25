/**
 * Voice Companion Page — Bidirectional Gemini Live API Streaming.
 *
 * Architecture (ARD-002):
 * - Ephemeral token minted server-side with v1alpha constraints.
 * - Client captures microphone PCM (16kHz 16-bit mono) via Web Audio API.
 * - Client streams `realtimeInput` base64 audio chunks to Gemini WebSocket.
 * - Client decodes incoming 24kHz PCM base64 audio from Gemini and plays via Web Audio API.
 * - Parallel: text parts sent to /api/classify for crisis detection.
 * - Crisis detection immediately terminates session & displays pre-authored static card.
 *
 * @module companion/page
 */

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { CrisisCard } from "../components/crisis-card";
import { ErrorState } from "../components/error-state";
import type { CrisisContent, ClassifyResult } from "@/lib/types";

type SessionState =
  | "idle"
  | "connecting"
  | "listening"
  | "speaking"
  | "crisis"
  | "error";

export default function CompanionPage() {
  const [state, setState] = useState<SessionState>("idle");
  const [crisisContent, setCrisisContent] = useState<CrisisContent | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [transcript, setTranscript] = useState<string>("");

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);

  // Clean up Web Audio resources
  const cleanupAudio = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (playbackCtxRef.current) {
      playbackCtxRef.current.close().catch(() => {});
      playbackCtxRef.current = null;
    }
    nextStartTimeRef.current = 0;
  }, []);

  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, [cleanupAudio]);

  // Play incoming 24kHz 16-bit PCM audio base64 chunk from Gemini
  const playAudioChunk = useCallback((base64Data: string) => {
    try {
      if (!playbackCtxRef.current || playbackCtxRef.current.state === "closed") {
        const AudioCtx =
          window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        playbackCtxRef.current = new AudioCtx({ sampleRate: 24000 });
      }

      const playbackCtx = playbackCtxRef.current;
      if (playbackCtx.state === "suspended") {
        playbackCtx.resume();
      }

      const binary = atob(base64Data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / (int16[i] < 0 ? 0x8000 : 0x7fff);
      }

      const audioBuffer = playbackCtx.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      const source = playbackCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(playbackCtx.destination);

      const currentTime = playbackCtx.currentTime;
      if (nextStartTimeRef.current < currentTime) {
        nextStartTimeRef.current = currentTime;
      }
      source.start(nextStartTimeRef.current);
      nextStartTimeRef.current += audioBuffer.duration;
    } catch (e) {
      console.error("[companion] Error playing audio chunk:", e);
    }
  }, []);

  const handleCrisisDetected = useCallback(
    (content: CrisisContent) => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      cleanupAudio();
      setCrisisContent(content);
      setState("crisis");
    },
    [cleanupAudio]
  );

  // Parallel Risk Classification on text transcripts
  const classifyInput = useCallback(
    async (text: string) => {
      try {
        const res = await fetch("/api/classify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: text }),
        });
        const result = (await res.json()) as ClassifyResult & {
          isCrisis?: boolean;
          crisisContent?: CrisisContent;
        };
        if (result.isCrisis && result.crisisContent) {
          handleCrisisDetected(result.crisisContent);
        }
      } catch {
        // Classification network error doesn't break active voice session
      }
    },
    [handleCrisisDetected]
  );

  const startSession = useCallback(async () => {
    if (state === "connecting" || state === "listening" || state === "speaking") {
      return;
    }

    setState("connecting");
    setErrorMessage("");
    setTranscript("");

    try {
      // Step 1: Fetch short-lived ephemeral token
      const tokenRes = await fetch("/api/token", { method: "POST" });
      if (!tokenRes.ok) {
        throw new Error(`Token fetch failed: ${tokenRes.status}`);
      }
      const { token } = await tokenRes.json();

      // Step 2: Request Microphone access (16kHz 1-channel mono)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      mediaStreamRef.current = stream;

      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx({ sampleRate: 16000 });
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      // Step 3: Open Gemini WebSocket BidiConnect
      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=${token}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setState("listening");

        // Send setup frame
        ws.send(
          JSON.stringify({
            setup: {
              generationConfig: {
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: {
                      voiceName: "Aoede",
                    },
                  },
                },
              },
            },
          })
        );

        // Connect microphone processor to send PCM base64 chunks
        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return;

          const inputData = e.inputBuffer.getChannelData(0);
          const pcm16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }

          const bytes = new Uint8Array(pcm16.buffer);
          let binary = "";
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64 = btoa(binary);

          ws.send(
            JSON.stringify({
              realtimeInput: {
                mediaChunks: [
                  {
                    mimeType: "audio/pcm;rate=16000",
                    data: base64,
                  },
                ],
              },
            })
          );
        };

        source.connect(processor);
        processor.connect(audioCtx.destination);
      };

      ws.onmessage = async (event) => {
        try {
          const rawText =
            typeof event.data === "string" ? event.data : await (event.data as Blob).text();
          const data = JSON.parse(rawText);

          // Handle incoming parts from model turn
          if (data?.serverContent?.modelTurn?.parts) {
            for (const part of data.serverContent.modelTurn.parts) {
              // Audio data from Gemini
              if (part?.inlineData?.data) {
                setState("speaking");
                playAudioChunk(part.inlineData.data);
              }
              // Text transcript from Gemini
              if (part?.text) {
                setTranscript((prev) => prev + " " + part.text);
                classifyInput(part.text);
              }
            }
          }

          if (data?.serverContent?.turnComplete) {
            setState("listening");
          }
        } catch {
          // Non-JSON message handler
        }
      };

      ws.onerror = (err) => {
        console.error("[companion] WebSocket error:", err);
        setState("error");
        setErrorMessage("Voice connection error. Crisis hotlines are still available below.");
      };

      ws.onclose = () => {
        cleanupAudio();
        if (state !== "crisis" && state !== "error") {
          setState("idle");
        }
        wsRef.current = null;
      };
    } catch (error) {
      console.error("[companion] Session start failed:", error);
      cleanupAudio();
      setState("error");
      setErrorMessage(
        "Could not access microphone or connect to voice service. Help is available below."
      );
    }
  }, [state, cleanupAudio, playAudioChunk, classifyInput]);

  const endSession = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    cleanupAudio();
    setState("idle");
  }, [cleanupAudio]);

  if (state === "crisis" && crisisContent) {
    return (
      <div className="companion">
        <CrisisCard content={crisisContent} />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="companion">
        <ErrorState message={errorMessage} />
      </div>
    );
  }

  return (
    <div className="companion">
      <div className="companion__header">
        <h1 className="companion__title">Voice Companion</h1>
        <div className="status-indicator" aria-live="polite">
          <span
            className={`status-indicator__dot ${
              state !== "idle" ? "status-indicator__dot--active" : ""
            }`}
          />
          <span>
            {state === "idle" && "Ready"}
            {state === "connecting" && "Connecting microphone..."}
            {state === "listening" && "Listening..."}
            {state === "speaking" && "Sah-AI Speaking..."}
          </span>
        </div>
      </div>

      <div className="companion__main">
        {state === "idle" ? (
          <button
            onClick={startSession}
            className="home__cta companion__cta"
            id="start-voice-btn"
            aria-label="Start voice session — talk to Sah-AI"
          >
            <span className="home__cta-icon" aria-hidden="true">
              🎙️
            </span>
            <span className="home__cta-text">Start talking</span>
          </button>
        ) : (
          <button
            onClick={endSession}
            className="companion__end-btn"
            id="end-voice-btn"
            aria-label="End voice session"
          >
            End session
          </button>
        )}
      </div>

      {transcript.trim() && (
        <div className="companion__transcript" aria-live="polite">
          <p className="companion__transcript-text">{transcript}</p>
        </div>
      )}

      <p className="companion__hint">
        {state === "idle"
          ? "Tap the button and allow mic access to talk. No typing needed."
          : "Take a slow breath. Sah-AI is listening."}
      </p>
    </div>
  );
}
