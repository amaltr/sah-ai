# Sah-AI — Product Requirements Document

> **Version**: 1.0 — Hackathon Build
> **Date**: 2026-07-25
> **Status**: Active
> **Positioning**: Wellness / Psychoeducation / Care-Navigation Software

---

## 1. Problem & Opportunity

### The Problem
Substance use disorder (SUD) craving and acute distress states measurably impair working memory, verbal fluency, and executive function — the exact faculties needed to type a coherent message or navigate a menu-heavy app. Current digital tools require typing during the cognitive state where typing is hardest.

### The Opportunity
Build a **voice-first, zero-typing** GenAI platform that provides support at the moment of highest cognitive load — not when the user is calm and reflective, but at 3am with shaking hands.

### Evidence Base
- **JMIR 2026 ("Suzy")**: LLM recovery-coaching chatbot — core value is *augmenting* human peer coaches, not replacing them. Safety-response calibration is a first-class design problem.
- **"Glow" (arXiv 2602.08121)**: Frames the product as a *skills-coaching layer* (DBT-grounded), not diagnostic or prescriptive.
- **European Addiction Research 2022**: Strongest evidence for screening/brief intervention and psychoeducation. **No evidence that AI chatbots alone reduce relapse.**
- **FDA DHAC (Nov 2025)**: Zero GenAI-based devices authorized for mental health. Comfort zone = human-in-the-loop, red-teamed guardrails, clear escalation. Enforcement prioritizes higher-harm use cases.

### Design Implication
Sah-AI's core claim: **"AI-augmented recovery support with human/clinical escalation"** — not "AI replaces a sponsor, therapist, or crisis line."

---

## 2. Personas & Jobs-to-be-Done

| Persona | Moment of Highest Cognitive Load | Zero-Typing Need |
|---|---|---|
| **Priya** (PIR, 6 months sober, alcohol) | 11pm craving after work argument | One tap → guided voice grounding + urge-surfing + option to call sponsor/988 |
| **Arjun** (PIR, opioid recovery, on MOUD) | Withdrawal-adjacent symptoms, panic | One tap → triage: craving vs. overdose-in-someone-else vs. medical emergency |
| **Meera** (Caregiver, mother of PIR) | Finds paraphernalia / suspects relapse | Voice: "what do I say right now" → calibrated, non-shaming script |
| **Rahul** (Caregiver, partner of PIR) | PIR unreachable, hasn't come home | One tap "I'm worried" → checklist + script for calling PIR without escalating |

---

## 3. Goals & Non-Goals

### Goals (This Build)
1. Demonstrate zero-typing crisis support via voice-first GenAI interaction.
2. Implement a safety-first architecture where crisis content is never freely generated.
3. Provide personalized, safety-filtered emergency scripts for PIR and Caregivers.
4. Show persistent, API-independent access to real crisis hotlines on every screen.

### Non-Goals (Explicit)
- ❌ This is **not** a diagnostic tool.
- ❌ This does **not** manage medication (including MOUD).
- ❌ This does **not** replace 988, SAMHSA, or clinical care.
- ❌ This does **not** provide dosage guidance under any framing.
- ❌ This build does **not** include: persistent database, authentication, RAG/education corpus, multi-agent orchestration, MCP servers, or WCAG audit.

---

## 4. Success Metrics

### Engagement (Demo-Observable)
- Time-to-first-voice-response in crisis flow: **≤ 2 seconds**
- Crisis flow completable with **zero typing** required
- Check-in completable in **under 15 seconds**

### Safety (Highest Priority)
- Risk classification false-negative rate on adversarial inputs: **target 0%** (fail-closed)
- Escalation-appropriateness rate: **100%** (overdose/self-harm → static content + hotline, never generated text)
- Safety filter pass-through rate for clean content: **> 95%** (avoid over-filtering benign content)

---

## 5. Functional Requirements (Hackathon Scope)

### Flow 1: Crisis/Craving Voice Companion
- **FR-1**: Single large button launches voice companion within ≤ 2 seconds.
- **FR-2**: Voice interaction via Gemini Live API (client-direct with ephemeral token).
- **FR-3**: Barge-in support (interrupt AI mid-sentence).
- **FR-4**: Parallel risk classification on each turn; immediate bypass to static content on `possible-overdose` or `self-harm-risk`.
- **FR-5**: Fallback to text input always available.

### Flow 2: Emergency Triage
- **FR-6**: Structured decision tree with large tap targets (not free-form LLM conversation).
- **FR-7**: LLM used only to classify noisy input onto tree nodes; guidance text is always pre-authored static content.
- **FR-8**: Terminal nodes wire to `tel:911`, `tel:988`, `sms:741741`, or route to voice companion.

### Flow 3: Personalized Script Generator
- **FR-9**: PIR/Caregiver mode toggle (single source of truth, top-level state).
- **FR-10**: Context capture via preset buttons + optional free-text/voice.
- **FR-11**: Generated scripts ≤ 60 words, strict JSON output schema, safety-filtered before display.
- **FR-12**: Fallback to pre-written template on filter failure.
- **FR-13**: "Save this script" to localStorage (demo-scoped).
- **FR-14**: Caregiver-specific tone controls (gentle / direct-but-caring / boundary-setting).

### Cross-Cutting
- **FR-15**: 988 / SAMHSA Helpline / Crisis Text Line visible on every screen, functional without Gemini API.
- **FR-16**: Degraded-mode UI renders meaningful state when API is unreachable (not just an error).

---

## 6. Non-Functional / Security / Compliance

See [SAFETY.md](file:///c:/Users/trakh/OneDrive/Documents/dev/work/promptwars/SAFETY.md) for the complete safety constraints.

### Security Summary
- Server-only API key (never client-exposed)
- Ephemeral tokens with locked `live_connect_constraints`
- Input validation (zod) on every API route
- No raw transcript persistence
- Typed error responses (never leak model output/stack traces to client)

### Performance
- Flash-tier models for classification and script generation
- Client-direct Live API connection (no backend hop for voice latency)
- No N+1 network calls in any request path

### Regulatory
- Positioned as wellness/psychoeducation/care-navigation software
- Not a diagnostic, treatment, or medication management device
- Outside FDA SaMD enforcement scope

---

## 7. UX Principles

1. **One thumb, one glance, one tap** for the crisis path. No nested menus.
2. **Voice primary**, large touch targets secondary, typing tertiary/optional.
3. **Calm, non-clinical, non-infantilizing** visual design — no siren-red "emergency app" aesthetics.
4. **No dead ends** — every screen has a visible path to crisis button, 988/helpline, and home.
5. **Progress, not perfection** framing — no shame-based "streak broken" patterns.
6. **PIR and Caregiver modes are visually distinct** — different color accents so there's no confusion about whose context you're in.

---

## 8. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Client (Next.js App Router on Vercel)                         │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ Voice UI │  │ Triage Tree  │  │ Script Generator UI      │  │
│  │ (Live WS)│  │ (Static Flow)│  │ (PIR / Caregiver toggle) │  │
│  └────┬─────┘  └──────┬───────┘  └────────────┬─────────────┘  │
│       │               │                       │                │
│  ┌────┴───────────────┴───────────────────────┴──────────────┐  │
│  │ Persistent Hotline Footer (988 / SAMHSA / 911) — static  │  │
│  └───────────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │ API calls
              ┌─────────────┼──────────────────┐
              ▼             ▼                  ▼
    ┌────────────────┐ ┌──────────────┐ ┌────────────────────┐
    │ /api/token     │ │ /api/classify │ │ /api/generate-     │
    │ Ephemeral      │ │ Risk tag +   │ │ script             │
    │ token mint     │ │ confidence   │ │ + safety filter    │
    │ (constrained)  │ │              │ │                    │
    └───────┬────────┘ └──────┬───────┘ └─────────┬──────────┘
            │                 │                   │
            ▼                 ▼                   ▼
    ┌──────────────────────────────────────────────────────────┐
    │  lib/ (Pure domain logic, no framework imports)          │
    │  ├── safety/classify.ts   — classifyRiskLevel()          │
    │  ├── safety/filter.ts     — safetyFilterCheck()          │
    │  ├── content/crisis-static.ts — pre-authored content     │
    │  └── types.ts             — RiskTag, schemas, errors     │
    └──────────────────────────────────────────────────────────┘
                            │
                            ▼
                  ┌────────────────────┐
                  │  Gemini API        │
                  │  Flash (classify/  │
                  │  script-gen)       │
                  │  Live (voice)      │
                  └────────────────────┘
```

### Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript strict | Native Vercel fit; API routes = backend |
| GenAI | Gemini API via `@google/genai` | Flash for classify/script-gen, Live for voice |
| Voice | Client-direct WebSocket → Live API | Lowest latency, ephemeral token pattern |
| Validation | zod | Input validation at every trust boundary |
| State | React state/Context + localStorage | No DB in scope for hackathon |
| Testing | Vitest | Unit tests on safety library |
| Deploy | Vercel | Serverless, fast, no infra management |

> **Stack rationale (ARD-008)**: Evaluated TypeScript-only, Python-only (FastAPI), Hybrid, and Separate-services architectures across 8 dimensions (deployment, code quality, SDK parity, voice latency, SAMHSA integration, type safety, testing, time budget). TypeScript-only scored highest on the dimensions weighted by evaluation criteria (Code Quality, Problem Alignment). Python's advantage (existing SAMHSA client, ~30 min saved) is outweighed by schema drift risk, cold-start latency (200-500ms Python vs ~50ms Node.js on Vercel), and weaker compile-time type safety signal.

---

## 9. Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Live API integration fails (undocumented changes) | 🔴 High | Fallback: Web Speech API + generateContent |
| Ephemeral token `live_connect_constraints` not available | 🔴 High | Fallback: backend WebSocket proxy |
| Risk classifier false negatives | 🔴 High | Fail-closed default + adversarial test suite |
| Users substitute app for clinical care | 🟡 Medium | Explicit positioning + persistent hotline access |
| Gemini API rate limiting on free tier | 🟡 Medium | Graceful degradation UI + static content |
| Judge unfamiliar with SUD domain | 🟢 Low | Evidence-cited problem framing in demo pitch |
