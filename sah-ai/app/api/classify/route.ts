/**
 * POST /api/classify — Risk classification endpoint.
 *
 * Thin adapter over lib/safety/classify.ts.
 * Validates input with zod, calls classifyRiskLevel(),
 * returns structured result.
 *
 * On classification error, the underlying function fails-closed
 * to "possible-overdose" (ARD-003). This route inherits that behavior.
 *
 * @module api/classify
 */

import { NextRequest, NextResponse } from "next/server";
import { classifyRiskLevel } from "@/lib/safety/classify";
import { ClassifyRequestSchema } from "@/lib/types";
import { getCrisisContentForTag } from "@/lib/content/crisis-static";
import { CRISIS_TAGS } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ClassifyRequestSchema.safeParse(body);

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

    const result = await classifyRiskLevel(parsed.data.input);

    // If crisis tag, include static content in response
    const isCrisis = CRISIS_TAGS.includes(result.tag);
    const crisisContent = isCrisis
      ? getCrisisContentForTag(result.tag)
      : undefined;

    return NextResponse.json({
      tag: result.tag,
      confidence: result.confidence,
      isCrisis,
      crisisContent,
    });
  } catch (error) {
    console.error("[/api/classify] Unhandled error:", error);

    // Even on route-level error, fail-closed: return overdose response
    return NextResponse.json(
      {
        tag: "possible-overdose",
        confidence: 0,
        isCrisis: true,
        crisisContent: getCrisisContentForTag("possible-overdose"),
        error: "Classification error — showing safety content",
        code: "CLASSIFY_ERROR",
      },
      { status: 200 } // 200, not 500: client must render the crisis content
    );
  }
}
