/**
 * POST /api/generate-script — Personalized script generation.
 *
 * Generates recovery support scripts for PIR or Caregiver mode.
 * All generated text passes through safetyFilterCheck() before
 * reaching the client. If the filter rejects the output, a
 * pre-authored fallback template is returned instead.
 *
 * SAFETY INVARIANT: This route NEVER returns unfiltered LLM output.
 *
 * @module api/generate-script
 */

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { GenerateScriptRequestSchema, type GeneratedScript } from "@/lib/types";
import { safetyFilterCheck } from "@/lib/safety/filter";
import {
  FALLBACK_SCRIPT_PIR,
  FALLBACK_SCRIPT_CAREGIVER,
  GENERIC_CRISIS_RESPONSE,
} from "@/lib/content/crisis-static";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SCRIPT_SYSTEM_PROMPT_PIR = `You are a compassionate script writer helping someone in substance use recovery.

Generate a short, spoken script (under 60 words) they can read aloud or rehearse mentally.
The script should use DBT-grounded techniques: distress tolerance, grounding, or interpersonal effectiveness.

RULES:
- NEVER include dosage information or medication guidance.
- NEVER shame or blame the person.
- ALWAYS include a reference to 988 or SAMHSA (1-800-662-4357) if the situation involves risk.
- Keep the tone warm, practical, and non-clinical.
- Respond with ONLY a JSON object: { "scriptText": "...", "tone": "...", "citationsUsed": [...] }`;

const SCRIPT_SYSTEM_PROMPT_CAREGIVER = `You are a compassionate script writer helping a caregiver or family member of someone with a substance use disorder.

Generate a short, spoken script (under 60 words) they can use in conversation with their loved one.
Focus on CRAFT (Community Reinforcement and Family Training) principles: positive communication, setting boundaries without ultimatums, expressing concern without shame.

RULES:
- NEVER include ultimatums or threats.
- NEVER use stigmatizing language.
- ALWAYS suggest professional resources if the situation seems serious.
- Respond with ONLY a JSON object: { "scriptText": "...", "tone": "...", "citationsUsed": [...] }`;

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "Server configuration error",
        code: "MISSING_API_KEY",
        fallbackContent: GENERIC_CRISIS_RESPONSE,
      },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const parsed = GenerateScriptRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          code: "VALIDATION_ERROR",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { mode, context, tone } = parsed.data;

    const ai = new GoogleGenAI({ apiKey });

    const systemPrompt =
      mode === "pir"
        ? SCRIPT_SYSTEM_PROMPT_PIR
        : SCRIPT_SYSTEM_PROMPT_CAREGIVER;

    const userPrompt = `Context: ${context}\nTone: ${tone}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    if (!text) {
      console.error("[/api/generate-script] Empty response from Gemini");
      return NextResponse.json(
        mode === "pir" ? FALLBACK_SCRIPT_PIR : FALLBACK_SCRIPT_CAREGIVER
      );
    }

    // Parse the generated script
    let generated: GeneratedScript;
    try {
      generated = JSON.parse(text) as GeneratedScript;
    } catch {
      console.error("[/api/generate-script] Malformed JSON from Gemini");
      return NextResponse.json(
        mode === "pir" ? FALLBACK_SCRIPT_PIR : FALLBACK_SCRIPT_CAREGIVER
      );
    }

    // SAFETY: Filter the generated text before returning
    const filterResult = safetyFilterCheck(generated.scriptText);

    if (!filterResult.safe) {
      console.warn(
        `[/api/generate-script] Filter rejected output: ${filterResult.reason}`
      );
      // Return fallback template — never raw filtered output
      return NextResponse.json(
        mode === "pir" ? FALLBACK_SCRIPT_PIR : FALLBACK_SCRIPT_CAREGIVER
      );
    }

    return NextResponse.json(generated);
  } catch (error) {
    console.error("[/api/generate-script] Unhandled error:", error);
    // Return safety fallback script instead of failing
    const body = typeof request === "object" ? await request.json().catch(() => ({})) : {};
    const isCaregiver = body?.mode === "caregiver";
    return NextResponse.json(
      isCaregiver ? FALLBACK_SCRIPT_CAREGIVER : FALLBACK_SCRIPT_PIR
    );
  }
}
