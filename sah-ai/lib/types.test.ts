/**
 * Tests for Zod Schema Validation & Data Types — types.ts
 *
 * Verifies request validation schemas for API inputs.
 *
 * @module types.test
 */

import { describe, it, expect } from "vitest";
import {
  ClassifyRequestSchema,
  GenerateScriptRequestSchema,
} from "./types";

describe("Schema Validation (Zod)", () => {
  it("validates valid ClassifyRequest", () => {
    const valid = ClassifyRequestSchema.safeParse({ input: "I am craving" });
    expect(valid.success).toBe(true);
  });

  it("rejects non-string or missing input in ClassifyRequest", () => {
    const empty = ClassifyRequestSchema.safeParse({ input: 123 });
    expect(empty.success).toBe(false);

    const missing = ClassifyRequestSchema.safeParse({});
    expect(missing.success).toBe(false);
  });

  it("validates valid GenerateScriptRequest for PIR mode", () => {
    const valid = GenerateScriptRequestSchema.safeParse({
      mode: "pir",
      context: "Craving after conflict",
      tone: "gentle",
    });
    expect(valid.success).toBe(true);
  });

  it("validates valid GenerateScriptRequest for Caregiver mode", () => {
    const valid = GenerateScriptRequestSchema.safeParse({
      mode: "caregiver",
      context: "Found evidence of use",
      tone: "boundary-setting",
    });
    expect(valid.success).toBe(true);
  });

  it("rejects invalid mode or tone", () => {
    const invalidMode = GenerateScriptRequestSchema.safeParse({
      mode: "invalid-mode",
      context: "Valid context",
    });
    expect(invalidMode.success).toBe(false);
  });
});
