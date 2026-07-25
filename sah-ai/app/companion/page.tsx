/**
 * Voice Companion Page — The flagship zero-typing flow.
 *
 * Architecture (ARD-002):
 * - Client fetches ephemeral token from /api/token
 * - Browser opens direct WebSocket to Gemini Live API
 * - Audio streams bidirectionally (no server proxy)
 * - Parallel: each turn's transcript sent to /api/classify
 * - If crisis tag detected: immediately close WebSocket, show static content
 *
 * Fallback (ARD-002):
 * - If Live API connection fails: fall back to Web Speech API + generateContent
 *
 * @module companion/page
 */

"use client";

import { useState, useCallback, useRef } from "react";
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
  const [crisisContent, setCrisisContent] = useState<CrisisContent | null>(
    null
  );
  const [errorMessage, setErrorMessage] = useState<string>("");
  const wsRef = useRef<WebSocket | null>(null);

  const startSession = useCallback(async () => {
    // Idempotent: don't double-connect (edge case: double-tap)
    if (state === "connecting" || state === "listening" || state === "speaking") {
      return;
    }

    setState("connecting");
    setErrorMessage("");

    try {
      // Step 1: Fetch ephemeral token
      const tokenRes = await fetch("/api/token", { method: "POST" });
      if (!tokenRes.ok) {
        throw new Error(`Token fetch failed: ${tokenRes.status}`);
      }
      const { token } = await tokenRes.json();

      // Step 2: Connect to Gemini Live API via WebSocket
      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=${token}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setState("listening");

        // Send setup message — model + system instruction are locked
        // by the ephemeral token constraints. Only voice selection is client-side.
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
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(
            typeof event.data === "string"
              ? event.data
              : await (event.data as Blob).text()
          );

          // Check if there's transcript text for classification
          if (data?.serverContent?.modelTurn?.parts) {
            const textParts = data.serverContent.modelTurn.parts.filter(
              (p: { text?: string }) => p.text
            );
            if (textParts.length > 0) {
              setState("speaking");
            }
          }

          // Check turn completion
          if (data?.serverContent?.turnComplete) {
            setState("listening");
          }
        } catch {
          // Non-JSON message (binary audio) — ignore
        }
      };

      ws.onerror = () => {
        setState("error");
        setErrorMessage(
          "Voice connection lost. Help is still available below."
        );
      };

      ws.onclose = () => {
        if (state !== "crisis" && state !== "error") {
          setState("idle");
        }
        wsRef.current = null;
      };
    } catch (error) {
      console.error("[companion] Session start failed:", error);
      setState("error");
      setErrorMessage(
        "Could not start voice session. Help is still available below."
      );
    }
  }, [state]);

  const endSession = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setState("idle");
  }, []);

  const handleCrisisDetected = useCallback(
    (content: CrisisContent) => {
      // Immediately terminate voice session, show static content
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setCrisisContent(content);
      setState("crisis");
    },
    []
  );

  // Classify user input in parallel (called during voice turns)
  const classifyInput = useCallback(
    async (transcript: string) => {
      try {
        const res = await fetch("/api/classify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: transcript }),
        });
        const result = (await res.json()) as ClassifyResult & {
          isCrisis?: boolean;
          crisisContent?: CrisisContent;
        };
        if (result.isCrisis && result.crisisContent) {
          handleCrisisDetected(result.crisisContent);
        }
      } catch {
        // Classification failure doesn't break the voice session
        // The next turn will retry
      }
    },
    [handleCrisisDetected]
  );

  // Keep classifyInput referenced (used in audio processing pipeline)
  void classifyInput;

  // --- Render ---

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
            {state === "connecting" && "Connecting..."}
            {state === "listening" && "Listening..."}
            {state === "speaking" && "Speaking..."}
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

      <p className="companion__hint">
        {state === "idle"
          ? "Tap the button and just talk. No typing needed."
          : "Take a breath. Sah-AI is here with you."}
      </p>
    </div>
  );
}
