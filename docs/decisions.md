# Decisions Log

> Quick-reference tradeoff log. For full rationale, see [ARD.md](file:///c:/Users/trakh/OneDrive/Documents/dev/work/promptwars/docs/ARD.md).

| # | Decision | Chosen | Rejected | Why (one line) |
|---|----------|--------|----------|----------------|
| 1 | Framework | Next.js App Router + Vercel | Separate backend + client | Single deploy, zero CORS, API routes = backend |
| 2 | Voice transport | Client-direct Live API + ephemeral tokens | Backend WebSocket proxy | Lowest latency; Vercel can't host persistent WS |
| 3 | Classifier failure mode | Fail closed (→ `possible-overdose`) | Fail open (→ `general`) | False positives are annoying; false negatives are dangerous |
| 4 | Safety filter | Rule-based (regex/keyword) | Second model call | Zero latency, fully testable, deterministic |
| 5 | Persistence | None (localStorage only, demo-scoped) | Postgres + pgvector | Half-finished DB hurts code quality more than no DB |
| 6 | Scope | 3 flows (Voice, Triage, Script Gen) | All 7 UCs | Each flow proves one problem-statement claim |
| 7 | Design system | Calm/warm/non-clinical | Siren-red / corporate / gamified | Users under acute stress; clinical aesthetics alienate |
| 8 | Naming | `Sah-AI` | `Sahay` | Team/project preference (cosmetic only) |
| 9 | Voice fallback | Web Speech API + generateContent | None | Must have a plan if Live API integration fails |
| 10 | TypeScript strictness | `strict: true`, no `any` | Relaxed | Highest eval weight is code quality |
| 11 | Dependencies | Minimal: `@google/genai`, `zod`, `next`, `react` | Kitchen sink | Each new dep is unreviewed surface area in 4 hours |
| 12 | Error shape | `{ error: string, code: string, fallbackContent?: CrisisContent }` | Ad-hoc per route | Consistent contract; crisis-safe fallback always available |
| 13 | PIR/Caregiver state | Top-level React Context, single source of truth | Per-component local state | Prevents mode-mismatch bug across screens |
| 14 | Hotline rendering | `tel:` / `sms:` links from constants | Buttons with onClick handlers | Real accessibility; works without JS; works offline |
| 15 | SAMHSA integration | Direct TypeScript HTTP client (`lib/services/samhsa-locator.ts`) | Local MCP / FastMCP / Gemini tool-calling | MCP is agent-time protocol, not runtime web-app protocol; 1 HTTP call vs 3-4 MCP round trips |
| 16 | Backend language | TypeScript (Next.js API Routes) | Python (FastAPI) / Hybrid / Separate | Schema drift risk, Vercel cold-start latency (200-500ms Python vs ~50ms Node), code quality signal (TS strict > Python hints) — see ARD-008 |
| 17 | Companion Attribution | Single Developer ("Amal T R") | "Amaltr team" or "Google" | Single creator clarity; prevents LLM defaulting to provider branding |
| 18 | Voice Interruption | Barge-in VAD + Playback Context Flush | Non-interruptible monologue | User can cut off companion mid-sentence during distress |
| 19 | Next.js Framework Version | Next.js 16.2.11 | Next.js 15.1.6 | Mitigates CVE-2025-66478 security vulnerability and passes Vercel build checks |

---

## Resolved Decisions

| # | Question | Options | Decision / Resolution |
|---|----------|---------|-----------------------|
| O-1 | Styling approach | Tailwind CSS vs. Vanilla CSS | ✅ Resolved: Custom Vanilla CSS (`globals.css`) for total design system control and zero build overhead. |
| O-2 | Live API model identifier | Gemini Live Preview models | ✅ Resolved: `models/gemini-3.1-flash-live-preview` for Live API, `models/gemini-3.6-flash` for Unary Generation & Classifier. |
| O-3 | Safety filter patterns | Specific regex/keyword lists | ✅ Resolved: Defined in `lib/safety/filter.ts` covering dosage, sourcing, administration, and stigmatizing terms. |
