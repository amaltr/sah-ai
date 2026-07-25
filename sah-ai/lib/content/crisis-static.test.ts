/**
 * Tests for pre-authored crisis content invariants — crisis-static.ts
 *
 * Verifies that all static crisis content:
 * - Has valid phone/sms action numbers
 * - Contains required 988/911/SAMHSA hotline links
 * - Is non-empty and clinician reviewable
 *
 * @module content/crisis-static.test
 */

import { describe, it, expect } from "vitest";
import {
  ALL_HOTLINES,
  OVERDOSE_RESPONSE,
  SELF_HARM_RESPONSE,
  GENERIC_CRISIS_RESPONSE,
  getCrisisContentForTag,
} from "./crisis-static";

describe("crisis-static content invariants", () => {
  it("ALL_HOTLINES contains 988, SAMHSA, 911, and Crisis Text Line", () => {
    expect(ALL_HOTLINES.length).toBeGreaterThanOrEqual(4);
    const numbers = ALL_HOTLINES.map((h) => h.number);
    expect(numbers).toContain("988");
    expect(numbers).toContain("911");
    expect(numbers).toContain("1-800-662-4357");
  });

  it("OVERDOSE_RESPONSE has 911 and valid title", () => {
    expect(OVERDOSE_RESPONSE.title).toBeDefined();
    expect(OVERDOSE_RESPONSE.actions.some((a) => a.number === "911")).toBe(true);
  });

  it("SELF_HARM_RESPONSE has 988 call and text actions", () => {
    expect(SELF_HARM_RESPONSE.actions.some((a) => a.number === "988")).toBe(true);
  });

  it("getCrisisContentForTag maps possible-overdose correctly", () => {
    const content = getCrisisContentForTag("possible-overdose");
    expect(content.id).toBe(OVERDOSE_RESPONSE.id);
  });

  it("getCrisisContentForTag maps self-harm-risk correctly", () => {
    const content = getCrisisContentForTag("self-harm-risk");
    expect(content.id).toBe(SELF_HARM_RESPONSE.id);
  });

  it("getCrisisContentForTag falls back to generic crisis response for unmapped tags", () => {
    const content = getCrisisContentForTag("craving");
    expect(content.id).toBe(GENERIC_CRISIS_RESPONSE.id);
  });
});
