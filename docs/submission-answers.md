# Sah-AI Hackathon Submission Answers

---

### Question 1: Describe the changes/updates made in the deployed version

Sah-AI is a voice-first recovery platform for substance use disorders built with Next.js 15, TypeScript, and Gemini AI.

Key updates in the deployed version:
1. **Safety Library & Fail-Closed Invariant**: `classifyRiskLevel` (Gemini Flash classifier) defaulting to `possible-overdose` on error, regex `safetyFilterCheck` (intercepting dosage/sourcing/shaming text), and static crisis content (`crisis-static.ts`).
2. **Gemini Live API Voice Companion**: Bidirectional Web Audio mic streaming (16kHz PCM) and Gemini 3.1 Flash Live audio playback over WebSockets via server-minted constrained tokens (`/api/token`).
3. **Emergency Triage**: 4-branch decision tree routing users to 988, 911, or urge-surfing guidance with native `tel:`/`sms:` links.
4. **Script Generator**: PIR & Caregiver CRAFT script generator powered by Gemini 3.6 Flash, safety-filtered before display.
5. **Hotline Footer & Error Boundaries**: Persistent 988/SAMHSA footer (zero API dependencies) and React Error Boundaries across all flows.

---

### Question 2: Mention the Gen AI services utilized in the submission, and where did you utilize it?

Sah-AI utilizes Google Gemini GenAI services via `@google/genai` across three architectural layers:

1. **Gemini 3.1 Flash Live API (`models/gemini-3.1-flash-live-preview`)**:
   - *Location*: `/app/companion/page.tsx` & `/app/api/token/route.ts`
   - *Usage*: Powers real-time voice companion using server-minted ephemeral tokens with `v1alpha` constraints. Manages low-latency bidirectional PCM audio streaming for DBT distress tolerance.

2. **Gemini 3.6 Flash (`models/gemini-3.6-flash`)**:
   - *Location*: `/app/api/generate-script/route.ts`
   - *Usage*: Generates personalized recovery scripts for Persons in Recovery (PIR) and Caregivers (CRAFT model). Output is safety-filtered in real-time.

3. **Gemini Flash Structured JSON Classifier**:
   - *Location*: `/lib/safety/classify.ts` & `/app/api/classify/route.ts`
   - *Usage*: Classifies user utterances into structured risk categories (`craving`, `possible-overdose`, `self-harm-risk`, `education`, `caregiver-request`) with a fail-closed invariant.
