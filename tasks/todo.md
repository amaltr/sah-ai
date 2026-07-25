# Sah-AI — Build Tasks

> Per CLAUDE.md: Plan → Verify Plan → Track Progress → Explain → Document → Capture Lessons

---

## Phase 0: Foundation ✅
- [x] Read and analyze archive research (v1 architecture, 4-hour plan)
- [x] Devil's advocate review of existing plan
- [x] Create `.gitignore`, `.gitattributes`
- [x] Create `SAFETY.md`, `docs/PRD.md`, `docs/ARD.md`, `docs/decisions.md`
- [x] Create `tasks/lessons.md`, `tasks/todo.md`, `README.md`
- [x] Initialize Next.js project with TypeScript strict mode
- [x] Create `.env.example`, `vitest.config.ts`
- [x] Git init + remote add (github.com/amaltr/sah-ai)
- [/] Install dependencies (npm install running — OneDrive sync bottleneck)
- [ ] Verify `npx tsc --noEmit` passes
- [ ] Verify `npm run dev` starts
- [ ] Initial commit + push

## Phase 1: Safety Library ✅ (code written, tests pending npm)
- [x] `lib/types.ts` — RiskTag, CrisisContent, zod schemas, Facility
- [x] `lib/safety/classify.test.ts` — 10 tests (fail-closed, all tags)
- [x] `lib/safety/classify.ts` — Gemini Flash classifier, fail-closed invariant
- [x] `lib/safety/filter.test.ts` — 13 tests (dosage, sourcing, shaming, hotline, length)
- [x] `lib/safety/filter.ts` — deterministic regex filter, zero API calls
- [x] `lib/content/crisis-static.ts` — overdose, self-harm, generic, fallbacks, hotlines
- [x] `lib/services/samhsa-locator.ts` — TypeScript port of SAMHSA MCP client
- [x] `app/api/token/route.ts` — ephemeral token mint with constraints
- [x] `app/api/classify/route.ts` — classification with crisis content embedding
- [x] `app/api/generate-script/route.ts` — script gen + safety filter + fallback
- [ ] Run `npm test` — verify all 23 tests pass

## Phase 2: Voice Companion ✅ (code written, E2E pending)
- [x] `app/globals.css` — full design system (navy/amber/sage, ~890 lines)
- [x] `app/layout.tsx` — root layout with HotlineFooter
- [x] `app/page.tsx` — home page with breathing amber CTA
- [x] `app/components/hotline-footer.tsx` — zero-API-dependency hotline links
- [x] `app/components/crisis-card.tsx` — pre-authored crisis content renderer
- [x] `app/components/error-state.tsx` — degraded-mode fallback UI
- [x] `app/companion/page.tsx` — voice companion with Live API WebSocket
  - [x] Ephemeral token fetch → WebSocket connect
  - [x] State machine: idle → connecting → listening → speaking → crisis → error
  - [x] Crisis detection → immediate session termination + static content
  - [x] Double-tap idempotent (state check before connect)
  - [x] Error state → hotline fallback (never blank screen)
- [ ] Manual E2E test of voice flow (requires running dev server)

## Phase 3: Emergency Triage ✅ (code written)
- [x] `app/triage/page.tsx` — 4-branch decision tree
  - [x] "Safe but craving" → grounding exercise + voice companion link
  - [x] "Worried about someone" → caregiver guidance + SAMHSA + script gen
  - [x] "Medical emergency" → static overdose steps + tel:911
  - [x] "Thoughts of harming myself" → static self-harm response + tel:988
- [x] All terminal nodes use real `tel:`/`sms:` links
- [x] Back button on every terminal node
- [ ] Manual test of all 4 branches (requires running dev server)

## Phase 4: Script Generator ✅ (code written)
- [x] `app/scripts/page.tsx` — PIR/Caregiver mode toggle
  - [x] Preset scenario buttons (5 per mode, zero-typing)
  - [x] Optional free-text context input
  - [x] Tone controls for caregiver mode (gentle/direct/boundary)
  - [x] AI-generated label on output (non-negotiable)
  - [x] Save to localStorage (demo-scoped)
- [ ] Manual test with example scripts (requires running dev server)

## Phase 5: Polish & Verification
- [x] `prefers-reduced-motion` CSS (already in globals.css)
- [x] Visible keyboard focus states (`:focus-visible` in globals.css)
- [x] Unique IDs on all interactive elements
- [ ] Error boundary component wrapping each flow
- [ ] Full manual walkthrough of all 3 flows
- [ ] Demo walkthrough script (90 seconds)
- [ ] Update root README with final run instructions
- [ ] Final commit + push
- [ ] **Final review: "Would a staff engineer approve this?"**
