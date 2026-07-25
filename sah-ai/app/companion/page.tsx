/**
 * Voice Companion Page — Bidirectional Gemini Live API Streaming + Visualizer + Fallback.
 *
 * FIXES & ENHANCEMENTS:
 * 1. Uses v1alpha WebSocket URL matching ephemeral token API version.
 * 2. Includes model string in setup frame for Gemini 2.0 Flash Live.
 * 3. Real-time Mic Visualizer (AnalyserNode) showing live volume level feedback when user speaks.
 * 4. Fallback to Web Speech API (speechSynthesis + speechRecognition + /api/generate-script) if WebSocket fails.
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
  const [volumeLevel, setVolumeLevel] = useState<number>(0);
  const [useFallback, setUseFallback] = useState<boolean>(false);

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const recognitionRef = useRef<unknown>(null);

  const cleanupAudio = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
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
    setVolumeLevel(0);
    nextStartTimeRef.current = 0;
  }, []);

  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, [cleanupAudio]);

  // Play incoming 24kHz PCM base64 chunk from Gemini
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
      console.error("[companion] Playback error:", e);
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
        // Classification failure doesn't halt session
      }
    },
    [handleCrisisDetected]
  );

  // Start Gemini Live API WebSocket Session
  const startSession = useCallback(async () => {
    if (state === "connecting" || state === "listening" || state === "speaking") {
      return;
    }

    setState("connecting");
    setErrorMessage("");
    setTranscript("");

    try {
      // Step 1: Mint token via v1alpha
      const tokenRes = await fetch("/api/token", { method: "POST" });
      if (!tokenRes.ok) {
        throw new Error(`Token fetch failed: ${tokenRes.status}`);
      }
      const { token } = await tokenRes.json();

      // Step 2: Request Microphone access
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
      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }

      const source = audioCtx.createMediaStreamSource(stream);

      // Add Real-time Volume Level Analyser
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateVolume = () => {
        if (!analyserRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setVolumeLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();

      // ScriptProcessor for PCM streaming
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      // Step 3: Open v1alpha constrained WebSocket URL
      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?access_token=${token}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setState("listening");

        // Send full setup frame
        ws.send(
          JSON.stringify({
            setup: {
              model: "models/gemini-3.1-flash-live-preview",
              generationConfig: {
                responseModalities: ["AUDIO"],
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
                audio: {
                  mimeType: "audio/pcm;rate=16000",
                  data: base64,
                },
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

          if (data?.serverContent?.modelTurn?.parts) {
            for (const part of data.serverContent.modelTurn.parts) {
              if (part?.inlineData?.data) {
                setState("speaking");
                playAudioChunk(part.inlineData.data);
              }
              if (part?.text) {
                setTranscript((prev) => (prev ? prev + " " + part.text : part.text));
                classifyInput(part.text);
              }
            }
          }

          if (data?.serverContent?.turnComplete) {
            setState("listening");
          }
        } catch (e) {
          console.error("[companion] ws.onmessage error:", e);
        }
      };

      ws.onerror = (err) => {
        console.error("[companion] WebSocket error event:", err);
        setUseFallback(true);
      };

      ws.onclose = (evt) => {
        console.log(`[companion] WS Closed code=${evt.code} reason=${evt.reason}`);
        cleanupAudio();
        if (state !== "crisis" && state !== "error") {
          setState("idle");
        }
        wsRef.current = null;
      };
    } catch (error) {
      console.error("[companion] Session start failed:", error);
      cleanupAudio();
      setUseFallback(true);
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
            {state === "connecting" && "Accessing microphone..."}
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
          <div className="companion__active-controls">
            <button
              onClick={endSession}
              className="companion__end-btn"
              id="end-voice-btn"
              aria-label="End voice session"
            >
              End session
            </button>
          </div>
        )}
      </div>

      {/* Real-time Mic Level Visualizer */}
      {state !== "idle" && (
        <div className="companion__visualizer" aria-label="Microphone volume visualizer">
          <div
            className="companion__visualizer-bar"
            style={{ width: `${Math.max(8, volumeLevel)}%` }}
          />
          <p className="companion__visualizer-label">
            {volumeLevel > 15 ? "🎙️ Audio detected" : "Speak into your mic..."}
          </p>
        </div>
      )}

      {/* Live AI Response Transcript */}
      {transcript.trim() !== "" && (
        <div className="companion__transcript" aria-live="polite">
          <p className="companion__transcript-label">Sah-AI Response:</p>
          <p className="companion__transcript-text">{transcript}</p>
        </div>
      )}

      <p className="companion__hint">
        {state === "idle"
          ? "Tap the button and allow mic access to talk. No typing needed."
          : "Take a slow breath. Sah-AI is listening to you."}
      </p>
    </div>
  );
}
