# Architecture Decision Records (ARDs)

> Each decision is numbered, dated, and includes context, options considered, decision, and consequences.
> Format follows Michael Nygard's ADR template.

---

## ARD-001: Next.js App Router + Vercel over separate backend/client

**Date**: 2026-07-25
**Status**: Accepted
**Context**: The original architecture spec (archive v1) assumed separate `/backend` (Node.js/FastAPI) and `/client` (React Native/PWA) directories. For a 4-hour hackathon build, standing up two separate services with their own deployment, CORS config, and health checks is overhead that directly competes with feature development time.

**Options Considered**:
1. **Separate backend + client** — More realistic production architecture but 30-60 min setup overhead.
2. **Next.js App Router monolith on Vercel** — API routes serve as backend; single deploy target; zero CORS issues.
3. **Firebase (Functions + Hosting)** — Similar monolith benefit but less TypeScript-native.

**Decision**: Option 2 — Next.js App Router on Vercel.

**Consequences**:
- ✅ Single deployment artifact, zero infra management during hackathon.
- ✅ API routes and UI share TypeScript types (no schema drift).
- ⚠️ Vercel serverless cannot host persistent WebSocket servers → forces client-direct Live API pattern (which is actually lower latency, so this constraint improved the design).
- ⚠️ Not representative of production architecture (would likely split in production).

---

## ARD-002: Client-direct Gemini Live API with ephemeral tokens

**Date**: 2026-07-25
**Status**: Accepted (with fallback plan)
**Context**: The voice companion needs low-latency speech-to-speech. Two options: proxy through backend, or connect client directly to Gemini Live API.

**Options Considered**:
1. **Backend WebSocket proxy** — Backend mediates all Live API traffic. Adds latency but controls everything server-side.
2. **Client-direct with ephemeral tokens** — Client connects directly to Gemini's WebSocket. Backend only mints a short-lived token with locked `live_connect_constraints` (model, system instruction, modality).
3. **Web Speech API + generateContent** — Browser-native speech recognition + text-based Gemini call + browser TTS. No Live API at all.

**Decision**: Option 2 as primary, Option 3 as fallback.

**Consequences**:
- ✅ Lowest latency path — no backend hop for audio.
- ✅ Barge-in support native to Live API.
- ⚠️ `live_connect_constraints` is critical — without it, a client can override the safety system prompt. This is the single most important security line in the codebase.
- ⚠️ If ephemeral token API surface isn't available/stable, fall back to Option 3 within 15 minutes (do not spend more time debugging).
- ❌ Client has a direct connection to a generative model — mitigated by locked constraints, but architecturally less controlled than a proxy.

---

## ARD-003: Fail-closed classifier (default to safest branch)

**Date**: 2026-07-25
**Status**: Accepted
**Context**: The risk classifier maps user input to one of: `craving`, `possible-overdose`, `self-harm-risk`, `education`, `caregiver-request`, `general`. What happens when the classifier returns an ambiguous, malformed, or error result?

**Options Considered**:
1. **Default to `general`** — Treats ambiguous input as non-risky. Lower friction but potential safety gap.
2. **Default to `possible-overdose`** — Treats ambiguous input as highest-risk. Higher friction but zero safety gap.
3. **Return an error to the client** — User sees an error message. Worst UX but explicit.

**Decision**: Option 2 — Default to `possible-overdose` (fail closed to safest branch).

**Consequences**:
- ✅ No false negatives on safety-critical classification — the most important invariant.
- ⚠️ Potential false positives (benign input treated as crisis) — acceptable tradeoff.
- ⚠️ Over-triggering could frustrate repeat users — acceptable for hackathon; in production, would tune with more sophisticated confidence thresholds.

---

## ARD-004: Rule-based safety filter (not a second model call)

**Date**: 2026-07-25
**Status**: Accepted
**Context**: Generated text (scripts, companion responses) must be filtered before reaching the client. Should the filter be a second generative model call or a deterministic rule-based check?

**Options Considered**:
1. **Second Gemini call** — Higher accuracy on nuanced content (shaming tone, implicit dosage advice). Adds latency and cost.
2. **Rule-based (regex/keyword)** — Fast, deterministic, zero latency, fully testable. Lower accuracy on nuanced cases.
3. **Hybrid** — Rule-based first pass, model call only for edge cases.

**Decision**: Option 2 for hackathon build.

**Consequences**:
- ✅ Zero additional latency or API cost.
- ✅ Fully deterministic and unit-testable — strong code-quality signal for judges.
- ⚠️ Will miss subtle shaming language or implicit dosage framing that a model would catch. Acceptable for hackathon; production would use Option 3.
- Implementation requires: defined keyword/pattern lists (not deferred to "implementation").

---

## ARD-005: No database, no auth for hackathon build

**Date**: 2026-07-25
**Status**: Accepted
**Context**: The full architecture spec includes Postgres + pgvector, OAuth/passkeys, consent records. In a 4-hour window, each of these is a 60+ minute setup and represents unfinished abstraction risk.

**Options Considered**:
1. **Build DB + auth** — More realistic but guaranteed to be half-finished.
2. **Skip entirely, use localStorage for demo-only persistence** — Fast, honest about scope.
3. **Use Firebase for quick auth** — Faster than raw OAuth but still 30+ min for proper setup.

**Decision**: Option 2 — No DB, no auth. localStorage only, explicitly documented as demo-scoped.

**Consequences**:
- ✅ Zero infrastructure setup time.
- ✅ No half-finished abstractions (which hurt code quality more than no abstraction).
- ⚠️ Cannot demonstrate consent model, check-in tracking, or caregiver data isolation enforcement. Documented as "designed, not built."
- ⚠️ localStorage is not durable or secure — every usage site has a code comment stating this.

---

## ARD-006: Three flows only (Crisis Voice, Triage, Script Generator)

**Date**: 2026-07-25
**Status**: Accepted
**Context**: The full architecture spec defines 7 use cases (UC-1 through UC-7). Time budget is 4 hours.

**Options Considered**:
1. **Build all 7 UCs** — Impossible in time budget. Would result in all 7 being broken.
2. **Build 3 UCs deeply** — Each UC maps to a key claim in the problem statement.
3. **Build 1 UC perfectly** — Maximum depth but doesn't demonstrate breadth.

**Decision**: Option 2 — Three flows.

**Rationale for selection**:
- **Crisis Voice Companion** → Proves "zero-typing interventions"
- **Emergency Triage** → Proves "contextual safety tools"
- **Script Generator** → Proves "personalized emergency scripts"

These three together cover every key phrase in the problem statement.

**Consequences**:
- ✅ Each flow gets ~45-60 minutes of focused development.
- ⚠️ RAG/education, check-in tracking, care navigation, consent model are absent from demo. Pitch must frame these as "designed, not built in this window" (referencing the full architecture doc).

---

## ARD-007: Design System — Calm, Warm, Non-Clinical

**Date**: 2026-07-25
**Status**: Accepted
**Context**: The problem statement serves users under acute stress with a health-adjacent topic that carries stigma. Visual design has direct UX consequences: siren-red "emergency app" aesthetics can be triggering; clinical/sterile aesthetics can feel institutional and alienating; infantilizing aesthetics (cartoons, gamification) can undermine trust.

**Decision**: Warm, grounded palette. Muted earth tones with a single, intentional accent for the crisis action. Typography that reads as steady and human, not corporate or startup. See [frontend-design skill](file:///c:/Users/trakh/OneDrive/Documents/dev/work/promptwars/.agents/skills/frontend-design/SKILL.md) for detailed design direction.

**Consequences**:
- Design decisions are made *before* coding, not in a "polish" phase.
- PIR mode and Caregiver mode have distinct visual treatments (different accent colors) for mode clarity.
- The crisis button is the single bold visual element on every screen — the "signature" per the frontend-design skill.

---

## ARD-008: TypeScript-only backend over Python/Hybrid

**Date**: 2026-07-25
**Status**: Accepted
**Context**: The existing SAMHSA MCP server is Python (FastAPI-style via FastMCP). The original architecture doc suggested "Node.js/TypeScript or Python (FastAPI)." The question: should the backend be Python to reuse existing code, or TypeScript for stack unity?

**Options Evaluated** (comprehensive 8-dimension analysis):
1. **TypeScript-only** (Next.js API Routes on Vercel) — current plan.
2. **Python-only** (FastAPI on Vercel) — reuse SAMHSA client, FastAPI for all backend.
3. **Hybrid** (Next.js + FastAPI in `/api/`) — both languages, Vercel auto-detect.
4. **Separate services** (FastAPI on Cloud Run + React on Vercel) — 2 deploys.

**Decision**: Option 1 — TypeScript-only.

**Evidence-backed reasoning**:
- **Schema drift**: TypeScript-only eliminates frontend-to-backend type mismatches at compile time. Hybrid/Python options require maintaining parallel type definitions (Pydantic + zod), risking runtime bugs under time pressure.
- **Cold-start latency**: Vercel's Python runtime cold-starts at 200-500ms vs Node.js at ~50ms. The `/api/classify` route runs on every voice turn — this latency is perceptible.
- **Gemini SDK parity**: Both Python and JS SDKs are at feature parity (confirmed July 2026). No advantage either way.
- **SAMHSA rewrite cost**: ~30 min to rewrite 50 lines of Python `httpx.get()` logic as TypeScript `fetch()`. This is 12.5% of the time budget but buys unified typing across the entire codebase.
- **Code quality signal**: TypeScript `strict: true` is a compile-time guarantee visible to judges. Python type hints are advisory unless `mypy --strict` is explicitly configured (extra setup in a 4-hour window).
- **Testing**: Single test framework (Vitest) vs two (Vitest + pytest). One test config = less can break.

**Consequences**:
- ✅ Zero schema drift between frontend and backend.
- ✅ Single deployment target, single test framework, single language.
- ✅ Strongest code quality signal for highest-weight evaluation criterion.
- ⚠️ Requires rewriting SAMHSA locator client in TypeScript (~30 min, ~50 lines).
- ⚠️ If the developer is significantly more productive in Python (2x+), this decision should be revisited. Velocity in a hackathon trumps ideal architecture.
