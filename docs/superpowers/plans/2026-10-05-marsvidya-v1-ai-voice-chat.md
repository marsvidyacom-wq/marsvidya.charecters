# MarsVidya V1 AI, Voice, and Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the teacher UI to provider-neutral chat, transcription, synthesis, and a complete browser voice pipeline.

**Architecture:** Application services depend on narrow AI/STT/TTS interfaces. Route handlers validate and normalize HTTP input; OpenAI and deterministic development adapters live behind factories selected only on the server.

**Tech Stack:** Next.js Route Handlers, TypeScript, Zod, OpenAI SDK, Web Media APIs, Vitest, Testing Library

**Spec:** `docs/superpowers/specs/2026-10-05-marsvidya-v1-design.md`

## Global Constraints

- Provider credentials never reach browser code.
- Chat defaults to concise, encouraging English-teacher behavior with optional Hindi/Hinglish only when useful.
- Provider calls have explicit timeouts and bounded retry only for safe transient failures.
- Audio uploads enforce non-empty content, MIME allowlists, and size limits.
- The UI permits only valid voice-state transitions and supports cancellation.
- Development adapters are allowed outside production; production fails closed when required provider configuration is absent.

## Review Focus

- Empty audio must return a validation error before provider invocation; Task 3 tests it.
- An unsupported audio MIME type must return HTTP 415; Task 3 tests it.
- A provider timeout must return a stable safe error rather than provider text; Task 2 tests it.
- Playback rejection must leave the controller recoverable in `error`; Task 4 tests it.
- User text that attempts to replace the teacher system behavior must remain user content; Task 1 tests persona placement.

---

### Task 1: Service contracts, teacher prompt, and development adapters

**Files:**
- Create: `src/services/ai/types.ts`, `src/services/ai/AIService.ts`, `src/services/ai/teacher-prompt.ts`
- Create: `src/services/speech/SpeechToTextService.ts`, `src/services/tts/TextToSpeechService.ts`
- Create: `src/services/ai/MockAIService.ts`, `src/services/speech/MockSpeechToTextService.ts`, `src/services/tts/MockTextToSpeechService.ts`
- Create: `src/services/services.test.ts`
- Create: `src/server/errors/application-error.ts`, `src/server/errors/to-http-error.ts`, `src/server/errors/errors.test.ts`

**Interfaces:**
- Consumes: `ChatMessageView` from the foundation plan
- Produces: `AIService.generateResponse(request: AIRequest): Promise<AIResponse>`, `SpeechToTextService.transcribe(audio: AudioInput): Promise<Transcript>`, `TextToSpeechService.synthesize(text: string): Promise<AudioResult>`, and `toHttpError(error: unknown): HttpError`

- [ ] **Step 1: Write contract tests for deterministic mock output, empty TTS text, the fixed teacher persona, and prompt-injection text remaining in a user message.**

- [ ] **Step 2: Write error-mapping tests for validation, timeout, provider-unavailable, configuration, and unknown errors.**

- [ ] **Step 3: Run `npm test -- src/services src/server/errors` and verify missing interfaces fail.**

- [ ] **Step 4: Implement provider-neutral request/result types and the MarsVidya system prompt.**

- [ ] **Step 5: Implement deterministic mock services and sanitized application errors.**

- [ ] **Step 6: Run focused tests and `npm run typecheck`; expect all to pass.**

- [ ] **Step 7: Commit with `git commit -m "feat: define AI and speech service contracts"`.**

### Task 2: OpenAI adapters and service factories

**Files:**
- Create: `src/services/ai/OpenAIService.ts`, `src/services/ai/create-ai-service.ts`
- Create: `src/services/speech/OpenAISpeechToTextService.ts`, `src/services/speech/create-speech-service.ts`
- Create: `src/services/tts/OpenAITextToSpeechService.ts`, `src/services/tts/create-tts-service.ts`
- Create: `src/services/openai-adapters.test.ts`
- Modify: `src/config/env.ts`, `.env.example`

**Interfaces:**
- Consumes: service contracts from Task 1
- Produces: `createAIService(env: ServerEnv): AIService`, `createSpeechToTextService(env: ServerEnv): SpeechToTextService`, and `createTextToSpeechService(env: ServerEnv): TextToSpeechService`

- [ ] **Step 1: Write adapter tests with a mocked OpenAI client for request mapping, usage mapping, audio metadata, timeout conversion, and sanitized failures.**

- [ ] **Step 2: Run `npm test -- src/services/openai-adapters.test.ts` and verify adapters are missing.**

- [ ] **Step 3: Implement the three OpenAI adapters using separately configured model names and `AbortSignal.timeout`.**

- [ ] **Step 4: Implement factories that choose mocks only in non-production when the OpenAI key is absent.**

- [ ] **Step 5: Run focused tests, type checking, and lint; expect all to pass.**

- [ ] **Step 6: Commit with `git commit -m "feat: add OpenAI service adapters"`.**

### Task 3: Typed AI route handlers

**Files:**
- Create: `src/server/http/parse-json.ts`, `src/server/http/request-id.ts`
- Create: `src/server/validation/ai.ts`
- Create: `src/features/conversations/respond-to-learner.ts`
- Create: `src/app/api/ai/chat/route.ts`
- Create: `src/app/api/ai/speech-to-text/route.ts`
- Create: `src/app/api/ai/text-to-speech/route.ts`
- Create: `src/app/api/ai/ai-routes.test.ts`

**Interfaces:**
- Consumes: service factories from Task 2
- Produces: `respondToLearner(input: LearnerTurn, deps: ConversationDeps): Promise<TeacherTurn>` and JSON/audio API contracts for the three endpoints

- [ ] **Step 1: Write route tests for valid chat, malformed JSON, blank text, empty audio, oversized audio, unsupported MIME, valid TTS, and sanitized provider failure.**

- [ ] **Step 2: Run the focused route test and verify missing handlers fail.**

- [ ] **Step 3: Implement Zod schemas and shared safe response/error helpers.**

- [ ] **Step 4: Implement `respondToLearner` so the application flow depends only on `AIService`.**

- [ ] **Step 5: Implement the three route handlers with explicit request-size checks and request IDs.**

- [ ] **Step 6: Run focused tests, lint, and type checking; expect all to pass.**

- [ ] **Step 7: Commit with `git commit -m "feat: expose typed AI and speech APIs"`.**

### Task 4: Browser recording, playback, and end-to-end voice controller

**Files:**
- Create: `src/features/voice/audio-recorder.ts`, `src/features/voice/audio-player.ts`
- Create: `src/features/voice/voice-api-client.ts`, `src/features/voice/useVoiceTeacher.ts`
- Create: `src/features/voice/useVoiceTeacher.test.tsx`
- Modify: `src/features/voice/TeacherWorkspace.tsx`
- Modify: `src/features/conversations/ChatWorkspace.tsx`, `src/app/chat/page.tsx`

**Interfaces:**
- Consumes: route contracts from Task 3 and voice state machine from the foundation plan
- Produces: `createAudioRecorder(stream: MediaStream): AudioRecorder`, `playAudio(blob: Blob, signal?: AbortSignal): Promise<void>`, and `useVoiceTeacher(): VoiceTeacherController`

- [ ] **Step 1: Write hook tests for permission denial, complete happy sequence, cancellation, transcript failure, AI failure, TTS failure, playback rejection, and retry.**

- [ ] **Step 2: Run the hook tests and verify the controller is missing.**

- [ ] **Step 3: Implement recorder and player wrappers with cleanup of tracks, object URLs, and abort signals.**

- [ ] **Step 4: Implement the typed API client and `useVoiceTeacher` orchestration without bypassing the reducer.**

- [ ] **Step 5: Connect the home workspace and Chat Mode to the real APIs while retaining development adapter behavior.**

- [ ] **Step 6: Run focused tests, lint, type checking, and the production build; expect all to pass.**

- [ ] **Step 7: Manually verify microphone permission and one complete interaction in a supported browser.**

- [ ] **Step 8: Commit with `git commit -m "feat: connect complete voice and chat pipeline"`.**

## Phase Verification

- [ ] Run `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build`.
- [ ] Verify mock mode without `AI_API_KEY` and real mode with a valid key when available.
- [ ] Confirm no provider credential appears in generated client JavaScript or browser network payloads.

