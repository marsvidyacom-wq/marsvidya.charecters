# MarsVidya V1 Foundation and UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a runnable, tested Next.js foundation and the responsive MarsVidya teacher, voice-state, and chat interfaces.

**Architecture:** This phase establishes a strict App Router project, shared design primitives, and client-side interaction boundaries. Domain state lives in pure TypeScript modules; React components consume those modules and do not import provider or database code.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, Framer Motion, Zod, Vitest, Testing Library

**Spec:** `docs/superpowers/specs/2026-10-05-marsvidya-v1-design.md`

## Global Constraints

- The application is mobile-first and must not overflow at 360, 375, 390, 412, 430, 768, 1024, 1280, or 1440+ pixel widths.
- Server Components are the default; Client Components are limited to interactive regions.
- The static teacher must be replaceable without changing voice, chat, persistence, or AI logic.
- The UI must support keyboard navigation, visible focus, screen-reader status, comfortable touch targets, and `prefers-reduced-motion`.
- Product code uses strict TypeScript with no unjustified `any`, no secrets in client bundles, and no direct provider or database access from React components.
- Every task ends with passing focused tests and a commit.

## Review Focus

- A browser without `MediaRecorder` must show a helpful unsupported-browser state; Task 2 pins this in the voice capability tests.
- A rapid second microphone click must not create an impossible transition; Task 2 pins this in reducer tests.
- A blank or whitespace-only chat message must not submit; Task 4 pins this in component tests.
- Reduced-motion users must not receive continuous waveform animation; Task 3 pins this in CSS/component tests.
- The 360px layout must keep the microphone reachable without horizontal overflow; Task 3 pins this in responsive checks.

---

### Task 1: Project foundation and configuration

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `vitest.config.ts`, `vitest.setup.ts`
- Create: `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`
- Create: `src/config/env.ts`, `src/config/env.test.ts`
- Create: `.env.example`, `.gitignore`

**Interfaces:**
- Consumes: none
- Produces: `getServerEnv(): ServerEnv`, `publicEnv: PublicEnv`, and scripts `dev`, `build`, `lint`, `typecheck`, `test`, `test:watch`

- [ ] **Step 1: Initialize the package manifest and install only the runtime and test dependencies named in the Tech Stack.**

Use the current stable Next.js scaffold conventions, keep source under `src/`, and do not overwrite the existing `docs/` directory.

- [ ] **Step 2: Add strict TypeScript, Tailwind/PostCSS, ESLint, Vitest, and Testing Library configuration.**

- [ ] **Step 3: Write the failing environment tests.**

Test names: `accepts_empty_optional_provider_configuration_in_development`, `rejects_missing_required_production_configuration`, and `never_exposes_server_secrets_through_public_env`.

- [ ] **Step 4: Run `npm test -- src/config/env.test.ts` and verify the tests fail because `getServerEnv` is missing.**

- [ ] **Step 5: Implement `getServerEnv(): ServerEnv` and `publicEnv: PublicEnv` with Zod in `src/config/env.ts`.**

Development permits absent provider credentials; production requires database, auth, Google OAuth, and OpenAI values. Razorpay and R2 remain optional until their features are enabled.

- [ ] **Step 6: Run `npm test -- src/config/env.test.ts`, `npm run typecheck`, and `npm run lint`; expect all to pass.**

- [ ] **Step 7: Commit with `git commit -m "chore: establish Next.js project foundation"`.**

### Task 2: Voice capability and state machine

**Files:**
- Create: `src/features/voice/voice-state.ts`
- Create: `src/features/voice/voice-state.test.ts`
- Create: `src/features/voice/browser-capabilities.ts`
- Create: `src/features/voice/browser-capabilities.test.ts`
- Create: `src/types/voice.ts`

**Interfaces:**
- Consumes: none
- Produces: `VoicePhase`, `VoiceState`, `VoiceEvent`, `transitionVoiceState(state: VoiceState, event: VoiceEvent): VoiceState`, and `getVoiceCapability(windowLike: WindowLike): VoiceCapability`

- [ ] **Step 1: Write reducer tests for the exact happy sequence `idle -> listening -> transcribing -> thinking -> speaking -> idle`, cancellation, retry, duplicate clicks, and illegal events.**

- [ ] **Step 2: Write capability tests asserting unsupported `mediaDevices`, `getUserMedia`, or `MediaRecorder` returns `{ supported: false, reason: "unsupported-browser" }`.**

- [ ] **Step 3: Run `npm test -- src/features/voice` and verify missing exports fail.**

- [ ] **Step 4: Implement the discriminated unions and pure `transitionVoiceState` function.**

Illegal events return the existing state; `RETRY` is accepted only from `error` and returns `idle`.

- [ ] **Step 5: Implement `getVoiceCapability` without reading global browser objects during module initialization.**

- [ ] **Step 6: Run `npm test -- src/features/voice` and `npm run typecheck`; expect all to pass.**

- [ ] **Step 7: Commit with `git commit -m "feat: add voice interaction state machine"`.**

### Task 3: Design system and AI teacher workspace

**Files:**
- Create: `src/components/ui/Button.tsx`, `src/components/ui/Card.tsx`, `src/components/ui/StatusMessage.tsx`
- Create: `src/components/navigation/MarsVidyaHeader.tsx`
- Create: `src/components/ai-teacher/AITeacher.tsx`, `src/components/ai-teacher/StaticTeacher.tsx`
- Create: `src/components/voice/AudioWaveform.tsx`, `src/components/voice/VoiceButton.tsx`, `src/components/voice/VoiceStatus.tsx`
- Create: `src/features/voice/TeacherWorkspace.tsx`, `src/features/voice/TeacherWorkspace.test.tsx`
- Create: `public/images/ai-teacher/marsvidya-teacher.webp`
- Modify: `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`

**Interfaces:**
- Consumes: `VoiceState` from Task 2
- Produces: `AITeacherProps { phase: VoicePhase; isSpeaking: boolean }` and `TeacherWorkspaceProps { initialState?: VoiceState }`

- [ ] **Step 1: Generate one original, high-quality static teacher asset with no text or embedded branding and save it as the declared WebP.**

- [ ] **Step 2: Write component tests for the MarsVidya heading, teacher alt text, microphone accessible name, textual phase status, and Chat Mode link.**

- [ ] **Step 3: Add a reduced-motion assertion that the waveform receives a non-animated presentation class/state.**

- [ ] **Step 4: Run `npm test -- src/features/voice/TeacherWorkspace.test.tsx` and verify the missing components fail.**

- [ ] **Step 5: Implement the design tokens and small UI primitives in `globals.css` and `src/components/ui`.**

- [ ] **Step 6: Implement the stable `AITeacher` boundary, `StaticTeacher`, voice controls, and the responsive workspace.**

At 360px the main container uses `max-width: 100%`, the microphone target is at least 48px, and bottom padding includes `env(safe-area-inset-bottom)`.

- [ ] **Step 7: Run the focused test, `npm run typecheck`, and `npm run lint`; expect all to pass.**

- [ ] **Step 8: Start the dev server and inspect 360px and 1440px layouts for overflow, focus visibility, and teacher/control overlap.**

- [ ] **Step 9: Commit with `git commit -m "feat: build responsive AI teacher workspace"`.**

### Task 4: Chat interface shell

**Files:**
- Create: `src/types/chat.ts`
- Create: `src/components/chat/ChatMessage.tsx`, `src/components/chat/ChatInput.tsx`
- Create: `src/features/conversations/ChatWorkspace.tsx`, `src/features/conversations/ChatWorkspace.test.tsx`
- Create: `src/app/chat/page.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: shared UI primitives from Task 3
- Produces: `ChatMessageView`, `ChatSubmitHandler = (content: string) => Promise<void>`, and `ChatWorkspaceProps { onSubmit?: ChatSubmitHandler }`

- [ ] **Step 1: Write tests asserting blank input is rejected, Enter submits once, Shift+Enter inserts a newline, loading disables duplicate submission, and errors preserve draft text.**

- [ ] **Step 2: Run `npm test -- src/features/conversations/ChatWorkspace.test.tsx` and verify missing components fail.**

- [ ] **Step 3: Implement typed message display, accessible live status, and the controlled chat input.**

- [ ] **Step 4: Implement `/chat` with a local placeholder submit handler that clearly identifies development mode; do not call a provider from the component.**

- [ ] **Step 5: Run the focused tests, `npm run typecheck`, and `npm run lint`; expect all to pass.**

- [ ] **Step 6: Commit with `git commit -m "feat: add accessible chat workspace"`.**

## Phase Verification

- [ ] Run `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build`.
- [ ] Confirm the home and chat pages render without provider credentials.
- [ ] Record any manual responsive findings before starting the AI/voice plan.

