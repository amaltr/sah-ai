/**
 * Tests for the risk classifier — classifyRiskLevel().
 *
 * TDD: These tests are written FIRST, before the implementation.
 * The most critical invariant: fail-closed to "possible-overdose"
 * on any error, ambiguity, or unparseable response (ARD-003, SAFETY.md §2.2).
 *
 * NOTE: Tests that hit the real Gemini API are integration tests and
 * should be run separately. These unit tests mock the API call.
 *
 * @module safety/classify.test
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { classifyRiskLevel, CLASSIFY_SYSTEM_PROMPT } from "./classify";

// ---------------------------------------------------------------------------
// Mock Setup
// ---------------------------------------------------------------------------

const mockGenerateContent = vi.fn();

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: {
      generateContent: mockGenerateContent,
    },
  })),
}));

describe("classifyRiskLevel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set the API key env var for tests
    process.env.GEMINI_API_KEY = "test-key";
  });

  // -----------------------------------------------------------------------
  // Fail-Closed Invariant (ARD-003, SAFETY.md §2.2)
  // -----------------------------------------------------------------------

  it("defaults to 'possible-overdose' when API call throws an error", async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error("API unavailable"));

    const result = await classifyRiskLevel("some input");
    expect(result.tag).toBe("possible-overdose");
  });

  it("defaults to 'possible-overdose' on malformed API response", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: "this is not valid json",
    });

    const result = await classifyRiskLevel("some input");
    expect(result.tag).toBe("possible-overdose");
  });

  it("defaults to 'possible-overdose' when response contains unknown tag", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({ tag: "unknown-tag", confidence: 0.9 }),
    });

    const result = await classifyRiskLevel("some input");
    expect(result.tag).toBe("possible-overdose");
  });

  it("defaults to 'possible-overdose' on empty input", async () => {
    const result = await classifyRiskLevel("");
    expect(result.tag).toBe("possible-overdose");
  });

  // -----------------------------------------------------------------------
  // Correct Classification
  // -----------------------------------------------------------------------

  it("returns 'craving' for craving-related input", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({ tag: "craving", confidence: 0.95 }),
    });

    const result = await classifyRiskLevel("I really want to use right now");
    expect(result.tag).toBe("craving");
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("returns 'possible-overdose' for overdose-related input", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({ tag: "possible-overdose", confidence: 0.98 }),
    });

    const result = await classifyRiskLevel(
      "My friend is not responding and turning blue"
    );
    expect(result.tag).toBe("possible-overdose");
  });

  it("returns 'self-harm-risk' for self-harm input", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({ tag: "self-harm-risk", confidence: 0.92 }),
    });

    const result = await classifyRiskLevel(
      "I don't want to be here anymore"
    );
    expect(result.tag).toBe("self-harm-risk");
  });

  it("returns 'education' for educational questions", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({ tag: "education", confidence: 0.88 }),
    });

    const result = await classifyRiskLevel(
      "What is medication-assisted treatment?"
    );
    expect(result.tag).toBe("education");
  });

  it("returns 'caregiver-request' for caregiver-specific input", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({ tag: "caregiver-request", confidence: 0.90 }),
    });

    const result = await classifyRiskLevel(
      "What should I say to my son who just relapsed?"
    );
    expect(result.tag).toBe("caregiver-request");
  });

  // -----------------------------------------------------------------------
  // System prompt integrity
  // -----------------------------------------------------------------------

  it("has a system prompt that references the SAFETY.md constraints", () => {
    expect(CLASSIFY_SYSTEM_PROMPT).toContain("possible-overdose");
    expect(CLASSIFY_SYSTEM_PROMPT).toContain("self-harm-risk");
    expect(CLASSIFY_SYSTEM_PROMPT).toContain("craving");
  });
});
