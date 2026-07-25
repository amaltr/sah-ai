/**
 * Tests for the safety filter — safetyFilterCheck().
 *
 * TDD: These tests are written FIRST, before the implementation.
 * Each test documents one safety invariant from SAFETY.md.
 *
 * @module safety/filter.test
 */

import { describe, it, expect } from "vitest";
import { safetyFilterCheck } from "./filter";

describe("safetyFilterCheck", () => {
  // -----------------------------------------------------------------------
  // Dosage / Sourcing Detection (SAFETY.md §1.1)
  // -----------------------------------------------------------------------

  it("flags content containing dosage quantities as unsafe", () => {
    const result = safetyFilterCheck("Take 200mg of the medication twice daily");
    expect(result.safe).toBe(false);
    expect(result.reason).toContain("dosage");
  });

  it("flags content with drug sourcing language as unsafe", () => {
    const result = safetyFilterCheck("Here's where to buy substances near you");
    expect(result.safe).toBe(false);
    expect(result.reason).toContain("sourcing");
  });

  it("flags content with pill/tablet quantity references as unsafe", () => {
    const result = safetyFilterCheck("You should take 2 pills before bed");
    expect(result.safe).toBe(false);
    expect(result.reason).toContain("dosage");
  });

  // -----------------------------------------------------------------------
  // Shaming Language Detection (SAFETY.md §1.2)
  // -----------------------------------------------------------------------

  it("flags shaming language as unsafe", () => {
    const result = safetyFilterCheck(
      "You should be ashamed of yourself for relapsing"
    );
    expect(result.safe).toBe(false);
    expect(result.reason).toContain("shaming");
  });

  it("flags slur terms as shaming language", () => {
    const result = safetyFilterCheck("Stop being such a junkie");
    expect(result.safe).toBe(false);
    expect(result.reason).toContain("shaming");
  });

  it("flags ultimatum language as unsafe", () => {
    const result = safetyFilterCheck(
      "If you don't stop using, you'll lose everything"
    );
    expect(result.safe).toBe(false);
    expect(result.reason).toContain("shaming");
  });

  // -----------------------------------------------------------------------
  // Hotline Reference Requirement (SAFETY.md §3)
  // -----------------------------------------------------------------------

  it("flags risk-adjacent content missing hotline reference as unsafe", () => {
    const result = safetyFilterCheck(
      "I understand you're thinking about ending things. Let's talk about it."
    );
    expect(result.safe).toBe(false);
    expect(result.reason).toContain("hotline");
  });

  it("passes risk-adjacent content that includes a hotline reference", () => {
    const result = safetyFilterCheck(
      "I understand you're feeling overwhelmed. " +
        "If you need to talk right now, call 988 for support."
    );
    expect(result.safe).toBe(true);
  });

  // -----------------------------------------------------------------------
  // Length Bounds
  // -----------------------------------------------------------------------

  it("flags content exceeding 200-word length bound as unsafe", () => {
    const longContent = Array(201).fill("word").join(" ");
    const result = safetyFilterCheck(longContent);
    expect(result.safe).toBe(false);
    expect(result.reason).toContain("length");
  });

  it("passes content within length bounds", () => {
    const result = safetyFilterCheck(
      "Take a slow breath. You've been through hard moments before. " +
        "This feeling is temporary. Call 988 if you need support."
    );
    expect(result.safe).toBe(true);
  });

  // -----------------------------------------------------------------------
  // Clean Content
  // -----------------------------------------------------------------------

  it("passes clean recovery-support content as safe", () => {
    const result = safetyFilterCheck(
      "Right now, try grounding yourself. Feel your feet on the floor. " +
        "Name five things you can see. This craving will pass."
    );
    expect(result.safe).toBe(true);
  });

  it("passes caregiver boundary-setting script as safe", () => {
    const result = safetyFilterCheck(
      "Try saying: I love you, and I need to set this boundary for both of us. " +
        "I'm here when you're ready to talk."
    );
    expect(result.safe).toBe(true);
  });

  // -----------------------------------------------------------------------
  // Case Insensitivity
  // -----------------------------------------------------------------------

  it("is case-insensitive for pattern matching", () => {
    const result = safetyFilterCheck("WHERE TO BUY drugs near me");
    expect(result.safe).toBe(false);
    expect(result.reason).toContain("sourcing");
  });

  // -----------------------------------------------------------------------
  // Edge Cases
  // -----------------------------------------------------------------------

  it("flags empty string as unsafe", () => {
    const result = safetyFilterCheck("");
    expect(result.safe).toBe(false);
    expect(result.reason).toContain("empty");
  });

  it("handles content with only whitespace as unsafe", () => {
    const result = safetyFilterCheck("   \n\t  ");
    expect(result.safe).toBe(false);
    expect(result.reason).toContain("empty");
  });
});
