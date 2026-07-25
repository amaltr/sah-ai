/**
 * Emergency Triage Page — structured decision tree.
 *
 * SAFETY INVARIANT:
 * - Guidance text at terminal nodes is ALWAYS pre-authored (crisis-static.ts).
 * - The LLM may classify voice/text input to SELECT a branch,
 *   but never WRITES the guidance itself.
 * - All action links are real tel:/sms: links.
 *
 * Four branches:
 * 1. "I'm safe but craving" → route to voice companion
 * 2. "I'm worried about someone" → caregiver guidance + SAMHSA locator
 * 3. "This may be a medical emergency" → static overdose response + tel:911
 * 4. "I'm having thoughts of harming myself" → static self-harm response + tel:988
 *
 * @module triage/page
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { CrisisCard } from "../components/crisis-card";
import {
  OVERDOSE_RESPONSE,
  SELF_HARM_RESPONSE,
} from "@/lib/content/crisis-static";

type TriageBranch =
  | null
  | "craving"
  | "worried"
  | "emergency"
  | "self-harm";

export default function TriagePage() {
  const [branch, setBranch] = useState<TriageBranch>(null);

  // --- Terminal Node Renders ---

  if (branch === "emergency") {
    return (
      <div className="triage triage--terminal">
        <button
          onClick={() => setBranch(null)}
          className="triage__back"
          aria-label="Go back to triage options"
        >
          ← Back
        </button>
        <CrisisCard content={OVERDOSE_RESPONSE} />
      </div>
    );
  }

  if (branch === "self-harm") {
    return (
      <div className="triage triage--terminal">
        <button
          onClick={() => setBranch(null)}
          className="triage__back"
          aria-label="Go back to triage options"
        >
          ← Back
        </button>
        <CrisisCard content={SELF_HARM_RESPONSE} />
      </div>
    );
  }

  if (branch === "craving") {
    return (
      <div className="triage triage--terminal">
        <button
          onClick={() => setBranch(null)}
          className="triage__back"
          aria-label="Go back to triage options"
        >
          ← Back
        </button>
        <div className="crisis-card">
          <h2 className="crisis-card__title">You&apos;re safe, and that matters</h2>
          <div className="crisis-card__body">
            {[
              "Cravings are intense, but they pass. Most peak within 15-20 minutes.",
              "",
              "Try this grounding exercise:",
              "• Feel your feet on the floor.",
              "• Name 5 things you can see right now.",
              "• Take 3 slow breaths — in for 4, hold for 4, out for 4.",
              "",
              "If you want to talk it through, Sah-AI is here.",
            ].join("\n")}
          </div>
          <div className="crisis-card__actions">
            <Link href="/companion" className="crisis-card__action">
              🎙️ Talk to Sah-AI
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (branch === "worried") {
    return (
      <div className="triage triage--terminal">
        <button
          onClick={() => setBranch(null)}
          className="triage__back"
          aria-label="Go back to triage options"
        >
          ← Back
        </button>
        <div className="crisis-card">
          <h2 className="crisis-card__title">You care, and that counts</h2>
          <div className="crisis-card__body">
            {[
              "Caring about someone with a substance use disorder can feel overwhelming.",
              "",
              "Right now, focus on what you can control:",
              "• You can express concern without ultimatums.",
              "• You can offer help without enabling.",
              "• You can set boundaries and still show love.",
              "",
              "SAMHSA's helpline (1-800-662-4357) can connect you with local support groups and treatment options — for free, 24/7.",
            ].join("\n")}
          </div>
          <div className="crisis-card__actions">
            <a href="tel:1-800-662-4357" className="crisis-card__action">
              Call SAMHSA (1-800-662-4357)
            </a>
            <Link href="/scripts" className="crisis-card__action">
              📝 Get a script for what to say
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // --- Decision Tree Root ---

  return (
    <div className="triage">
      <h1 className="triage__title">What&apos;s happening right now?</h1>
      <p className="triage__subtitle">
        Tap the option that best describes your situation.
      </p>

      <div className="triage__options">
        <button
          onClick={() => setBranch("craving")}
          className="triage__option triage__option--safe"
          id="triage-craving"
        >
          <span className="triage__option-icon" aria-hidden="true">💪</span>
          <span className="triage__option-text">
            <strong>I&apos;m safe but craving</strong>
            <span>I need support right now</span>
          </span>
        </button>

        <button
          onClick={() => setBranch("worried")}
          className="triage__option triage__option--concern"
          id="triage-worried"
        >
          <span className="triage__option-icon" aria-hidden="true">💛</span>
          <span className="triage__option-text">
            <strong>I&apos;m worried about someone</strong>
            <span>A family member or friend</span>
          </span>
        </button>

        <button
          onClick={() => setBranch("emergency")}
          className="triage__option triage__option--emergency"
          id="triage-emergency"
        >
          <span className="triage__option-icon" aria-hidden="true">🚨</span>
          <span className="triage__option-text">
            <strong>This may be a medical emergency</strong>
            <span>Someone is unresponsive or not breathing</span>
          </span>
        </button>

        <button
          onClick={() => setBranch("self-harm")}
          className="triage__option triage__option--crisis"
          id="triage-self-harm"
        >
          <span className="triage__option-icon" aria-hidden="true">🤝</span>
          <span className="triage__option-text">
            <strong>I&apos;m having thoughts of harming myself</strong>
            <span>I need to talk to someone now</span>
          </span>
        </button>
      </div>
    </div>
  );
}
