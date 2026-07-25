/**
 * Script Generator Page — personalized recovery support scripts.
 *
 * Two modes: PIR (Person in Recovery) and Caregiver.
 * Uses preset buttons for zero-typing common scenarios,
 * plus an optional free-text field for custom context.
 *
 * Generated scripts pass through safetyFilterCheck() server-side.
 * If filter rejects → fallback template (never blank, never unfiltered).
 *
 * @module scripts/page
 */

"use client";

import { useState } from "react";
import type { UserMode, ScriptTone, GeneratedScript } from "@/lib/types";

const PIR_PRESETS = [
  "Craving after conflict",
  "Craving after seeing a substance",
  "Feeling isolated",
  "Withdrawal anxiety",
  "Tempted at a social event",
] as const;

const CAREGIVER_PRESETS = [
  "Found evidence of use",
  "Suspect relapse",
  "Setting a boundary",
  "They won't talk to me",
  "First time confronting them",
] as const;

export default function ScriptsPage() {
  const [mode, setMode] = useState<UserMode>("pir");
  const [tone, setTone] = useState<ScriptTone>("gentle");
  const [context, setContext] = useState("");
  const [script, setScript] = useState<GeneratedScript | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const presets = mode === "pir" ? PIR_PRESETS : CAREGIVER_PRESETS;

  async function generateScript(selectedContext: string) {
    setLoading(true);
    setScript(null);
    setSaved(false);

    try {
      const res = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          context: selectedContext,
          tone,
        }),
      });

      if (!res.ok) {
        throw new Error(`Generation failed: ${res.status}`);
      }

      const data = (await res.json()) as GeneratedScript;
      setScript(data);
    } catch {
      // On error, the API returns a fallback template
      setScript({
        scriptText:
          "Take a breath. You've been through hard moments before. " +
          "This feeling will pass. Call 988 if you need support.",
        tone: "gentle",
        citationsUsed: ["988 Suicide & Crisis Lifeline"],
      });
    } finally {
      setLoading(false);
    }
  }

  function saveScript() {
    if (!script) return;

    // Demo-scoped: localStorage only (ARD-005)
    const existing = JSON.parse(
      localStorage.getItem("sah-ai-scripts") || "[]"
    ) as Array<GeneratedScript & { savedAt: string; context: string }>;

    existing.push({
      ...script,
      context,
      savedAt: new Date().toISOString(),
    });

    localStorage.setItem("sah-ai-scripts", JSON.stringify(existing));
    setSaved(true);
  }

  return (
    <div className="scripts">
      <h1 className="scripts__title">Script Generator</h1>
      <p className="scripts__subtitle">
        What to say when you don&apos;t know what to say.
      </p>

      {/* Mode Toggle */}
      <div
        className="scripts__mode-toggle"
        role="radiogroup"
        aria-label="Select mode"
      >
        <button
          role="radio"
          aria-checked={mode === "pir"}
          className={`scripts__mode-btn ${
            mode === "pir" ? "scripts__mode-btn--active" : ""
          }`}
          onClick={() => {
            setMode("pir");
            setScript(null);
          }}
          id="mode-pir"
        >
          For me
        </button>
        <button
          role="radio"
          aria-checked={mode === "caregiver"}
          className={`scripts__mode-btn scripts__mode-btn--caregiver ${
            mode === "caregiver" ? "scripts__mode-btn--active" : ""
          }`}
          onClick={() => {
            setMode("caregiver");
            setScript(null);
          }}
          id="mode-caregiver"
        >
          For a caregiver
        </button>
      </div>

      {/* Tone Controls (caregiver only) */}
      {mode === "caregiver" && (
        <div className="scripts__tone" aria-label="Select tone">
          {(["gentle", "direct", "boundary-setting"] as const).map((t) => (
            <button
              key={t}
              className={`scripts__tone-btn ${
                tone === t ? "scripts__tone-btn--active" : ""
              }`}
              onClick={() => setTone(t)}
            >
              {t === "boundary-setting" ? "Boundary" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* Preset Buttons */}
      <div className="scripts__presets">
        <p className="scripts__presets-label">Quick scenarios:</p>
        {presets.map((preset) => (
          <button
            key={preset}
            className="scripts__preset-btn"
            onClick={() => {
              setContext(preset);
              generateScript(preset);
            }}
            disabled={loading}
          >
            {preset}
          </button>
        ))}
      </div>

      {/* Custom Context */}
      <div className="scripts__custom">
        <label htmlFor="custom-context" className="scripts__custom-label">
          Or describe your situation:
        </label>
        <textarea
          id="custom-context"
          className="scripts__custom-input"
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder={
            mode === "pir"
              ? "What's happening right now?"
              : "What situation are you dealing with?"
          }
          rows={3}
          maxLength={500}
        />
        <button
          className="scripts__generate-btn"
          onClick={() => generateScript(context)}
          disabled={loading || !context.trim()}
          id="generate-script-btn"
        >
          {loading ? "Generating..." : "Generate script"}
        </button>
      </div>

      {/* Generated Script Display */}
      {script && (
        <div className="scripts__result" aria-live="polite">
          <div className="scripts__result-card">
            <p className="scripts__result-label">
              ✨ AI-generated script
              <span className="scripts__result-tone">({script.tone})</span>
            </p>
            <blockquote className="scripts__result-text">
              {script.scriptText}
            </blockquote>
            {(script.citationsUsed?.length ?? 0) > 0 && (
              <p className="scripts__result-citations">
                Sources: {script.citationsUsed?.join(", ")}
              </p>
            )}
            <div className="scripts__result-actions">
              <button
                className="scripts__save-btn"
                onClick={saveScript}
                disabled={saved}
              >
                {saved ? "✓ Saved" : "Save this script"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
