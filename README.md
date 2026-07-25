# Sah-AI

**AI-augmented recovery support with human/clinical escalation** — not a replacement for 988, SAMHSA, or clinical care.

> A voice-first, zero-typing GenAI platform that supports individuals navigating substance use disorders and their caregivers, at the moment when cognitive load is highest.

---

## What This Is

Sah-AI is a hackathon prototype demonstrating three core capabilities:

1. **Crisis/Craving Voice Companion** — One tap launches a voice conversation grounded in DBT distress-tolerance techniques via Gemini Live API. Zero typing required.
2. **Emergency Triage** — A structured decision tree that routes users to 988, 911, or the voice companion. Guidance text is always pre-authored, never freely generated.
3. **Personalized Script Generator** — Context-aware scripts for both people in recovery (PIR) and caregivers, safety-filtered before display.

### What This Is NOT

- ❌ Not a diagnostic tool
- ❌ Not a medication management system
- ❌ Not a replacement for crisis hotlines or clinical care
- ❌ Not a treatment device (positioned as wellness/psychoeducation/care-navigation)

---

## Safety Architecture

The core design principle: **Classify → Select → Filter → Deliver**, never **Generate → Deliver** for anything crisis-adjacent.

- **Risk Classifier** — Every user input is classified before any generative response. Ambiguous inputs default to the *safest* branch (fail-closed), never to "general."
- **Static Crisis Content** — Overdose and self-harm responses are pre-authored, clinician-reviewable content. The LLM *selects* which content to serve; it never *writes* crisis guidance.
- **Safety Filter** — All generated text passes through a deterministic filter before reaching the client. Filter failure → pre-approved template, never raw model output.
- **Always-Available Hotlines** — 988, SAMHSA (1-800-662-4357), 911, and Crisis Text Line are visible on every screen, functional with zero dependency on the Gemini API.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) + TypeScript (strict mode) |
| GenAI | Gemini API via `@google/genai` |
| Voice | Client-direct Gemini Live API with ephemeral tokens |
| Validation | zod |
| Testing | Vitest |
| Deploy | Vercel |

---

## Project Structure

```
sah-ai/
├── app/                    # Next.js App Router pages + API routes
│   ├── api/
│   │   ├── token/          # Ephemeral token mint (constrained)
│   │   ├── classify/       # Risk classification endpoint
│   │   └── generate-script/# Script generation + safety filter
│   ├── companion/          # Voice companion page + error boundary
│   ├── triage/             # Emergency triage flow + error boundary
│   ├── scripts/            # Script generator page + error boundary
│   ├── components/         # Shared components
│   │   ├── hotline-footer  # Persistent hotline links (zero API dep)
│   │   ├── crisis-card     # Pre-authored crisis content renderer
│   │   ├── error-state     # Degraded-mode fallback UI
│   │   └── error-boundary  # React error boundary → crisis card
│   ├── globals.css         # Full design system (~890 lines)
│   ├── layout.tsx          # Root layout with hotline footer
│   └── page.tsx            # Home page with breathing CTA
├── lib/                    # Pure domain logic (no framework imports)
│   ├── safety/
│   │   ├── classify.ts     # classifyRiskLevel() — fail-closed
│   │   ├── classify.test.ts# 10 tests
│   │   ├── filter.ts       # safetyFilterCheck() — deterministic
│   │   └── filter.test.ts  # 13 tests
│   ├── content/
│   │   └── crisis-static.ts # Pre-authored crisis content + hotlines
│   ├── services/
│   │   └── samhsa-locator.ts # SAMHSA findtreatment.gov client (TS port)
│   └── types.ts            # RiskTag, schemas, Facility, error types
├── docs/                   # Architecture documentation
│   ├── PRD.md              # Product Requirements Document
│   ├── ARD.md              # Architecture Decision Records
│   ├── decisions.md        # Quick-reference tradeoff log
│   └── demo-script.md      # 90-second demo walkthrough
├── tasks/                  # Task management
│   ├── todo.md             # Build checklist
│   └── lessons.md          # Lessons learned
├── archive/                # Initial research (pre-build)
├── SAFETY.md               # Non-negotiable safety constraints
├── CLAUDE.md               # Agent operating instructions
└── README.md               # This file
```


---

## Getting Started

### Prerequisites
- Node.js 18+
- A [Google AI Studio](https://aistudio.google.com/) API key

### Setup
```bash
cd sah-ai

# Install dependencies
npm install

# Set environment variables
cp .env.example .env.local
# Edit .env.local and add your GEMINI_API_KEY

# Run tests (safety library)
npm test

# Run development server
npm run dev
```

### Environment Variables

| Variable | Required | Notes |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Server-only. Never `NEXT_PUBLIC_`. |

---

## Designed But Not Built (Hackathon Scope)

The full architecture is documented in [archive/recovery-platform-solution-architecture.md](file:///c:/Users/trakh/OneDrive/Documents/dev/work/promptwars/archive/recovery-platform-solution-architecture.md). Features designed but deferred:

- RAG-based psychoeducation library (SAMHSA/NIDA/CDC corpus)
- Persistent check-in tracking with trend analysis
- Authentication and consent model (42 CFR Part 2-aware)
- Circle-of-Care caregiver data isolation (API-enforced)
- Care navigation / treatment locator
- Multi-agent orchestration
- MCP server integrations

---

## Crisis Resources

If you or someone you know is in crisis:

- **988 Suicide & Crisis Lifeline**: Call or text **988** (24/7)
- **SAMHSA National Helpline**: **1-800-662-4357** (24/7/365, free)
- **Crisis Text Line**: Text **HOME** to **741741**
- **Emergency**: Call **911**
