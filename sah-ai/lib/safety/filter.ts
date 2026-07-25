/**
 * Deterministic safety filter for generated text content.
 *
 * SAFETY INVARIANT (SAFETY.md §1.2, ARD-004):
 * - This is a rule-based filter, not a second model call.
 * - Zero additional latency or API cost.
 * - Fully deterministic and unit-testable.
 * - Fail-closed: on any detected violation, returns { safe: false }.
 *
 * No generated text reaches the client in a crisis-adjacent flow
 * without passing through this function first.
 *
 * @module safety/filter
 */

import type { SafetyFilterResult } from "../types";

// ---------------------------------------------------------------------------
// Pattern Definitions (defined here, not deferred — per lesson L-003)
// ---------------------------------------------------------------------------

/**
 * Dosage patterns — detect quantity + unit combinations that suggest
 * medication/drug dosage guidance. (SAFETY.md §1.1)
 */
const DOSAGE_PATTERNS: readonly RegExp[] = [
  /\b\d+\s*(mg|ml|mcg|grams?|g|pills?|tabs?|tablets?|doses?|units?|cc|ounces?|oz)\b/i,
  /\btake\s+\d+\b/i,
  /\b\d+\s*(times?\s+(a|per)\s+(day|daily|week|hour))\b/i,
];

/**
 * Sourcing patterns — detect language that directs users toward
 * acquiring substances. (SAFETY.md §1.1)
 */
const SOURCING_PATTERNS: readonly RegExp[] = [
  /\bwhere\s+to\s+(buy|get|find|score|obtain|purchase)\b/i,
  /\b(dealer|plug|connect|hookup|supplier)\b/i,
  /\b(buy|purchase|order|get)\s+(drugs?|substances?|pills?|meds?)\b/i,
  /\bhow\s+to\s+(get|obtain|acquire)\s+(high|loaded|wasted)\b/i,
];

/**
 * Shaming language patterns — detect blame, stigma, or ultimatum
 * language that clinical evidence shows is harmful to recovery.
 * (SAFETY.md §1.2, FR-19)
 */
const SHAMING_PATTERNS: readonly RegExp[] = [
  /\b(ashamed|worthless|pathetic|disgrace|disgusting)\b/i,
  /\b(junkie|addict|crackhead|druggie|drunk|loser)\b/i,
  /\byou\s+(should\s+be\s+)?(ashamed|embarrassed)\b/i,
  /\bif\s+you\s+(don'?t|do\s+not)\s+(stop|quit)/i,
  /\byou('?ll|\s+will)\s+(lose|end\s+up|never|destroy)/i,
  /\byou\s+(are|'re)\s+(weak|failure|hopeless|useless)\b/i,
];

/**
 * Risk-adjacent keywords — when these appear in generated content,
 * the content MUST also include a hotline reference. (SAFETY.md §3)
 */
const RISK_ADJACENT_KEYWORDS: readonly RegExp[] = [
  /\b(overdose|overdosing|od'?d|od'?ing)\b/i,
  /\b(self[- ]?harm|self[- ]?injury|cutting|hurting\s+(myself|yourself|themselves))\b/i,
  /\b(suicid|kill\s+(myself|yourself|themselves))\b/i,
  /\b(end(ing)?\s+(it|my\s+life|things|everything))\b/i,
  /\b(don'?t\s+want\s+to\s+(live|be\s+here|go\s+on))\b/i,
];

/**
 * Hotline references that satisfy the hotline-required check.
 * If risk-adjacent keywords are present, at least one of these
 * must also be present in the text.
 */
const HOTLINE_REFERENCES: readonly RegExp[] = [
  /\b988\b/,
  /\b1[- ]?800[- ]?662[- ]?4357\b/,
  /\b741741\b/,
  /\b911\b/,
  /\bsamhsa\b/i,
  /\bcrisis\s+(lifeline|line|hotline|text)\b/i,
  /\bnational\s+helpline\b/i,
];

/** Maximum word count for generated content. */
const MAX_WORD_COUNT = 200;

// ---------------------------------------------------------------------------
// Filter Implementation
// ---------------------------------------------------------------------------

/**
 * Check generated text content against safety rules.
 *
 * This is a pure function with zero side effects, zero network calls,
 * and deterministic output. Suitable for unit testing in isolation.
 *
 * @param text - The generated text to check
 * @returns SafetyFilterResult — { safe: true } or { safe: false, reason: string }
 */
export function safetyFilterCheck(text: string): SafetyFilterResult {
  // Edge case: empty or whitespace-only content
  if (!text || !text.trim()) {
    return { safe: false, reason: "Content is empty" };
  }

  const trimmed = text.trim();

  // Check dosage patterns
  for (const pattern of DOSAGE_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        safe: false,
        reason: "Content contains dosage or medication quantity information",
      };
    }
  }

  // Check sourcing patterns
  for (const pattern of SOURCING_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        safe: false,
        reason: "Content contains substance sourcing language",
      };
    }
  }

  // Check shaming patterns
  for (const pattern of SHAMING_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        safe: false,
        reason: "Content contains shaming or stigmatizing language",
      };
    }
  }

  // Check length bounds
  const wordCount = trimmed.split(/\s+/).length;
  if (wordCount > MAX_WORD_COUNT) {
    return {
      safe: false,
      reason: `Content exceeds ${MAX_WORD_COUNT}-word length limit (${wordCount} words)`,
    };
  }

  // Check hotline requirement for risk-adjacent content
  const hasRiskKeywords = RISK_ADJACENT_KEYWORDS.some((pattern) =>
    pattern.test(trimmed)
  );
  if (hasRiskKeywords) {
    const hasHotlineRef = HOTLINE_REFERENCES.some((pattern) =>
      pattern.test(trimmed)
    );
    if (!hasHotlineRef) {
      return {
        safe: false,
        reason:
          "Content references risk-adjacent topics without a hotline reference",
      };
    }
  }

  return { safe: true };
}
