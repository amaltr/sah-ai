/**
 * Risk classifier — classifies user input into risk categories.
 *
 * SAFETY INVARIANT (SAFETY.md §2, ARD-003):
 * - On ANY error, ambiguous result, or unparseable response,
 *   this function returns { tag: "possible-overdose", confidence: 0 }.
 * - This is the FAIL-CLOSED invariant. It is never bypassed.
 * - This function NEVER talks to the user directly. It only
 *   produces a structured classification tag.
 *
 * @module safety/classify
 */

import { GoogleGenAI } from "@google/genai";
import {
  RISK_TAGS,
  FAIL_CLOSED_DEFAULT,
  type RiskTag,
  type ClassifyResult,
} from "../types";

// ---------------------------------------------------------------------------
// System Prompt
// ---------------------------------------------------------------------------

/**
 * System prompt for the risk classifier.
 * Exported for test verification of prompt integrity.
 *
 * Uses Gemini Flash with JSON-mode structured output.
 * Low temperature (0.1) for consistent, deterministic classification.
 */
export const CLASSIFY_SYSTEM_PROMPT = `You are a risk classification system for a substance use disorder recovery support platform.

Your ONLY job is to classify the user's input into exactly ONE of these categories:
- "craving": The user is experiencing a craving or urge to use substances, but is currently safe.
- "possible-overdose": The user describes symptoms of an overdose in themselves or someone else (unresponsive, not breathing, blue lips, etc.), OR mentions finding someone unconscious near substances.
- "self-harm-risk": The user expresses thoughts of self-harm, suicide, or not wanting to live.
- "education": The user is asking a factual/educational question about recovery, treatment, or substances.
- "caregiver-request": The user is a caregiver/family member seeking advice about supporting someone in recovery.
- "general": The user's input does not fit any of the above categories.

CRITICAL RULES:
- When in doubt between "possible-overdose" and any other category, choose "possible-overdose".
- When in doubt between "self-harm-risk" and any other category, choose "self-harm-risk".
- Safety-critical categories ALWAYS take priority over non-critical ones.
- Respond with ONLY a JSON object: { "tag": "<category>", "confidence": <0.0-1.0> }
- Do not include any other text, explanation, or formatting.`;

// ---------------------------------------------------------------------------
// Classification Implementation
// ---------------------------------------------------------------------------

/**
 * Classify user input into a risk category.
 *
 * FAIL-CLOSED: On any error, ambiguity, or unparseable response,
 * returns { tag: "possible-overdose", confidence: 0 }.
 * This is a deliberate, documented design choice (ARD-003).
 *
 * @param input - The user's transcribed utterance or text input
 * @returns ClassifyResult with tag and confidence
 */
export async function classifyRiskLevel(input: string): Promise<ClassifyResult> {
  // Edge case: empty or whitespace-only input → fail closed
  if (!input || !input.trim()) {
    return { tag: FAIL_CLOSED_DEFAULT, confidence: 0 };
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("[classify] GEMINI_API_KEY not set — failing closed");
      return { tag: FAIL_CLOSED_DEFAULT, confidence: 0 };
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: input,
      config: {
        systemInstruction: CLASSIFY_SYSTEM_PROMPT,
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    if (!text) {
      console.error("[classify] Empty response from Gemini — failing closed");
      return { tag: FAIL_CLOSED_DEFAULT, confidence: 0 };
    }

    // Parse the JSON response
    const parsed = JSON.parse(text) as { tag?: string; confidence?: number };

    // Validate the tag is a known RiskTag
    if (
      !parsed.tag ||
      !RISK_TAGS.includes(parsed.tag as RiskTag)
    ) {
      console.error(
        `[classify] Unknown tag "${parsed.tag}" — failing closed`
      );
      return { tag: FAIL_CLOSED_DEFAULT, confidence: 0 };
    }

    const confidence =
      typeof parsed.confidence === "number" ? parsed.confidence : 0;

    return {
      tag: parsed.tag as RiskTag,
      confidence: Math.max(0, Math.min(1, confidence)),
    };
  } catch (error) {
    // FAIL-CLOSED: Any error → safest branch
    console.error("[classify] Error during classification — failing closed:", error);
    return { tag: FAIL_CLOSED_DEFAULT, confidence: 0 };
  }
}
