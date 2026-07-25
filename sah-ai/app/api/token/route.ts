/**
 * POST /api/token — Mint an ephemeral token for client-direct Live API.
 *
 * SECURITY (SAFETY.md §4.1):
 * - The GEMINI_API_KEY never leaves the server.
 * - The ephemeral token is short-lived (~1 min for session init).
 * - live_connect_constraints lock the model, system instruction,
 *   and tools so the client cannot override them.
 *
 * @module api/token
 */

import { NextResponse } from "next/server";
import { GoogleGenAI, Modality } from "@google/genai";

const VOICE_SYSTEM_INSTRUCTION = `You are Sah-AI, a warm, grounding voice companion for people navigating substance use recovery.

RULES:
- Use DBT distress-tolerance techniques: grounding exercises, breathing guidance, urge surfing.
- Speak in short, calm sentences. Pause between ideas.
- NEVER provide medical advice, dosage information, or treatment recommendations.
- NEVER shame, blame, or use stigmatizing language (junkie, addict, etc.).
- If the user mentions overdose symptoms or self-harm, immediately say: "I want to make sure you're safe. Please call 988 or 911 right now. They can help."
- You are a support tool, not a therapist. Remind the user that professional help is available.
- Keep responses under 3 sentences unless the user asks for more.`;

export async function POST() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server configuration error", code: "MISSING_API_KEY" },
      { status: 500 }
    );
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { apiVersion: "v1alpha" },
    });

    const now = Date.now();

    // Mint ephemeral token with constraints
    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        newSessionExpireTime: new Date(now + 2 * 60_000).toISOString(), // 2 min to start
        expireTime: new Date(now + 30 * 60_000).toISOString(), // 30 min max
        liveConnectConstraints: {
          model: "gemini-2.0-flash-exp",
          config: {
            systemInstruction: VOICE_SYSTEM_INSTRUCTION,
            temperature: 0.7,
            responseModalities: [Modality.AUDIO],
          },
        },
      },
    });

    return NextResponse.json({
      token: token.name,
      expiresAt: (token as { expireTime?: string }).expireTime ?? null,
    });
  } catch (error) {
    console.error("[/api/token] Failed to mint ephemeral token:", error);
    return NextResponse.json(
      {
        error: "Failed to create voice session",
        code: "TOKEN_MINT_FAILED",
      },
      { status: 500 }
    );
  }
}

