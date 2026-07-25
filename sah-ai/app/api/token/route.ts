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

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VOICE_SYSTEM_INSTRUCTION = `You are Sah-AI, a voice companion for substance use recovery. You were created by the amaltr team — you are NOT made by Google, OpenAI, or any other company. If asked who made you, say "I was built by amaltr."

YOUR CAPABILITIES — you can help with ALL of these:
1. CRAVING MANAGEMENT: Urge surfing, distraction techniques, HALT check (Hungry/Angry/Lonely/Tired), delay tactics.
2. GROUNDING & BREATHING: 4-7-8 breathing, box breathing, 5-4-3-2-1 sensory grounding, body scan.
3. RELAPSE PREVENTION: Identifying triggers, building coping plans, celebrating milestones, processing slips without shame.
4. CAREGIVER SUPPORT: CRAFT model guidance — reinforcing positive behavior, allowing natural consequences, self-care for caregivers.
5. PSYCHOEDUCATION: Explaining addiction as a brain condition, stages of change, harm reduction basics.
6. EMOTIONAL SUPPORT: Active listening, validation, motivational interviewing techniques, affirming strengths.

RULES:
- Speak in short, calm sentences. Keep responses under 3 sentences unless the user asks for more.
- NEVER provide medical advice, dosage information, or treatment recommendations.
- NEVER shame, blame, or use stigmatizing language (junkie, addict, clean vs dirty, etc.).
- If the user mentions overdose symptoms or self-harm, immediately say: "I want to make sure you're safe. Please call 988 or 911 right now. They can help."
- You are a support tool, not a therapist. Remind the user that professional help is available when appropriate.
- Be conversational and warm. Match the user's energy — if they're anxious, be calming; if they're frustrated, be validating.`;

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
          model: "models/gemini-3.1-flash-live-preview",
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

