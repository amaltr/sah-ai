# SAFETY.md — Non-Negotiable Safety Constraints

> **This document is a hard constraint, not a guideline.**
> Every agent, every code path, every code review must treat these as invariants.
> Violating any of these is a blocking defect, not a tradeoff.

---

## 1. Content Generation Boundaries

### 1.1 Never Generate
- Specific drug dosage, sourcing, or administration guidance — under **any** framing (fictional, hypothetical, harm-reduction, "for a friend," educational, or otherwise).
- Medication management advice (do not suggest starting, stopping, or adjusting any medication including MOUD).
- Diagnostic claims — never claim to diagnose SUD severity, withdrawal risk, or any clinical condition.
- Treatment prescriptions — never claim to prescribe or recommend specific treatments.

### 1.2 Always Generate With Guardrails
- All generative text in crisis-adjacent flows must pass through `lib/safety/filter.ts` **before** reaching the client.
- Generated scripts are constrained to ≤60 words spoken length.
- Tone is controlled: no shaming language, no ultimatums, no "tough love" framing, no blame attribution.
- Every generated response in a risk-adjacent context must include a hotline reference.

---

## 2. Crisis Path: Classify → Select → Filter → Deliver

### 2.1 The Iron Rule
Any user input classified as `possible-overdose` or `self-harm-risk` **must**:
1. **Bypass free-text generation entirely** — no generative model call for the response.
2. Return **only** pre-authored, versioned static content from `lib/content/crisis-static.ts`.
3. Include the appropriate `tel:` link action (988 or 911).
4. Log the escalation event (metadata only, not transcript content).

### 2.2 Fail-Closed Classifier
When the risk classifier returns an ambiguous, unparseable, or error result:
- Default to `possible-overdose` (the **safest** branch).
- **Never** default to `general`.
- This is a deliberate, documented design choice — not a bug.

---

## 3. Hotline Numbers (Hardcoded Constants)

| Service | Number | Notes |
|---|---|---|
| **988 Suicide & Crisis Lifeline** | `988` (call/text/chat) | Covers suicide, mental health, **and** substance use crises. 24/7. |
| **SAMHSA National Helpline** | `1-800-662-4357` | Free, 24/7/365 treatment referral and information. |
| **911** | `911` | Medical emergencies, overdose in progress. |
| **Crisis Text Line** | Text `HOME` to `741741` | Text-based crisis support. |

These numbers must be:
- Rendered as real `tel:` / `sms:` links (not decorative buttons).
- Visible on **every** screen without scrolling.
- Functional with **zero** dependency on the Gemini API connection.
- Sourced from `lib/content/crisis-static.ts` constants, not scattered string literals.

---

## 4. API Key Security

### 4.1 Server-Only Key
- `GEMINI_API_KEY` is a server-only environment variable.
- Read **only** inside `app/api/*/route.ts` handlers on the Node.js runtime.
- **Never** in a `NEXT_PUBLIC_*` variable.
- **Never** in the client bundle.
- **Never** hardcoded in source files.

### 4.2 Ephemeral Token Constraints
Any ephemeral token minted for the Live API **must** set `live_connect_constraints`:
- Fixed model identifier.
- Fixed system instruction (the DBT/urge-surfing companion persona).
- Fixed response modality (`AUDIO`).
- An unconstrained token allows a client to override the safety system prompt — this is a **known real-world vulnerability class** for this API.

---

## 5. Data Handling

### 5.1 No Persistence of Raw Transcripts
- This build stores **no** raw conversation transcripts anywhere.
- Process in memory per-request only.
- `localStorage` is used only for user-saved scripts (demo-scoped, non-durable).

### 5.2 Caregiver Data Isolation
- A caregiver-scoped context must **never** access raw PIR (Person in Recovery) data.
- Caregiver-visible data is always a derived summary, never raw content.
- This is enforced at the API/data layer, not just the UI layer.

---

## 6. Offline / Degraded Mode

When the Gemini API is unreachable:
- Static hotline numbers and `tel:` links **must** still render and function.
- The triage decision tree's terminal nodes (call 911, call 988) **must** still work.
- The UI must show a meaningful degraded state, not an error screen.
- Crisis-static content is bundled client-side, not fetched from an API.

---

## 7. Regulatory Positioning

This product is positioned as **wellness/psychoeducation/care-navigation software**:
- **Not** a diagnostic tool.
- **Not** a treatment device.
- **Not** a replacement for 988, SAMHSA, or clinical care.
- **Not** a medication management system.

This positioning keeps the product outside FDA SaMD enforcement scope and is both the ethically correct and legally prudent framing.
