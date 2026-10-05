# MarsVidya V1 Design Specification

## Purpose

MarsVidya V1 is a production-ready, mobile-first AI English Teacher. A learner can speak or type a question, receive a concise and encouraging teaching response, hear that response aloud, and continue the conversation. The product should feel like a focused AI teacher application, not a course marketplace or a generic SaaS dashboard.

The initial audience is English learners who benefit from simple explanations and optional Hindi or Hinglish support. The primary success criterion is a reliable end-to-end interaction:

```text
microphone -> speech-to-text -> AI teacher -> text-to-speech -> playback
```

Chat Mode reuses the same conversation and teaching logic without the speech stages.

## Scope

V1 includes:

- A premium, minimal MarsVidya landing and teacher workspace
- A static AI teacher image behind a replaceable teacher component boundary
- Browser microphone capture and an explicit voice interaction state machine
- Text chat and shared conversation history
- OpenAI-backed chat, speech-to-text, and text-to-speech adapters
- Deterministic development adapters for credential-free local use
- Auth.js with Google OAuth behind a replaceable authentication boundary
- PostgreSQL persistence through Prisma
- User profile and learning-progress foundations
- Server-side usage tracking and plan enforcement
- Razorpay Checkout, signature verification, and webhook-driven billing state
- Optional Cloudflare R2 audio storage behind an object-storage interface
- Typed validation, safe errors, rate limiting, structured logging, and analytics abstractions
- Automated unit, integration, and UI tests
- Deployment and local-development documentation

V1 explicitly excludes interactive avatars, lip sync, 3D, advanced adaptive learning, community features, a course marketplace, a large admin dashboard, Redis as a runtime requirement, and a separate Android application.

## Architecture

MarsVidya is a Next.js App Router modular monolith. The same deployable application contains the web UI and platform-independent HTTP APIs. Internal boundaries preserve this dependency direction:

```text
UI -> application logic -> service interfaces -> repositories/provider adapters
```

React components do not import Prisma, provider SDKs, secrets, or billing logic. Route handlers authenticate requests, validate input, enforce request-size and rate limits, and invoke application services. Application services coordinate repositories and provider-neutral interfaces. Provider adapters implement OpenAI, Cloudflare R2, Razorpay, and local development behavior.

The backend APIs are platform-independent so a future Android client can reuse authentication, conversations, AI services, learning progress, subscriptions, and usage enforcement.

## Application Modules

The application is divided into focused modules:

- `ai-teacher`: stable teacher presentation interface with a V1 static implementation
- `voice`: recording, playback, permissions, and voice-state orchestration
- `chat`: message composition and conversation display
- `conversations`: conversation and message application logic
- `learning`: session and progress foundations
- `profile`: learner preferences and goals
- `subscriptions`: plans, entitlements, Razorpay checkout, and webhook processing
- `usage`: provider usage recording and server-side limit enforcement
- `services`: AI, STT, TTS, storage, analytics, logging, and rate-limit contracts/adapters
- `server`: authentication, validation, database access, repositories, and security utilities

Each unit exposes a small typed interface and does not require consumers to understand its internals.

## User Experience

### Teacher workspace

The home page is the primary teacher workspace. It uses white, soft blue, sky blue, and navy with subtle gradients, rounded surfaces, soft shadows, generous whitespace, and accessible contrast. The static teacher is the visual hero.

On mobile, the header contains the MarsVidya wordmark and a compact profile or sign-in control. The teacher occupies the visual center. The lower interaction area contains the current voice status, waveform, a large thumb-reachable microphone control, and a Chat Mode entry point. Safe-area padding prevents controls from colliding with mobile browser chrome.

On desktop, the same hierarchy becomes a balanced workspace with a constrained maximum width and a secondary conversation/status region. It does not simply stretch the mobile layout.

### Teacher boundary

`AITeacher` owns the stable public contract. V1 renders `StaticTeacher`; a future `InteractiveTeacher` can consume the same status and speaking props. Voice, chat, persistence, and AI services never depend on the rendering implementation.

### Voice state machine

The client permits only these primary transitions:

```text
idle -> listening -> transcribing -> thinking -> speaking -> idle
```

The user can cancel an active interaction. Supported failures transition to `error`; retry returns through a valid idle state before restarting. Impossible transitions are rejected by the reducer/state-transition function.

The UI communicates status through text as well as animation. Listening has a restrained pulse, thinking has a subtle processing indicator, and speaking has an animated waveform. With `prefers-reduced-motion`, these become static state indicators.

### Chat

Chat is mobile-first and uses the same AI teacher persona and conversation model. It supports typed questions, loading, retry, safe error display, keyboard submission, and accessible focus management. Chat and voice messages can participate in the same conversation while retaining their `inputType`.

## Voice and Chat Data Flow

For voice input:

1. The browser checks microphone API support and requests permission after a user gesture.
2. Audio is captured locally and validated for non-empty content.
3. The browser uploads the recording to the MarsVidya speech-to-text endpoint.
4. The endpoint authenticates when persistence or plan entitlements require it, validates MIME type and size, applies rate limits, and invokes `SpeechToTextService`.
5. The transcript is passed to the same conversation application service used by Chat Mode.
6. `AIService` produces a teacher response using the MarsVidya teaching persona.
7. Conversation messages and usage records are persisted for authenticated users.
8. `TextToSpeechService` synthesizes the response.
9. The browser receives or streams playable audio and enters the speaking state.
10. Playback completion returns the controller to idle.

For text input, steps 1-4 and 8-10 are omitted unless the learner explicitly requests audio playback.

Provider calls use explicit timeouts. Retries are bounded and limited to safe transient failures; the application does not blindly replay non-idempotent billing actions.

## Provider Strategy

### OpenAI

Separate `AIService`, `SpeechToTextService`, and `TextToSpeechService` contracts prevent a single provider choice from leaking through the application. OpenAI adapters implement each contract independently. Model names and provider selection are centralized environment-backed configuration, not scattered constants.

When no OpenAI key is configured outside production, deterministic mock adapters provide representative transcripts, teaching replies, and a safe no-audio/development response. Production fails closed with a clear configuration error rather than silently using mocks.

### Object storage

`ObjectStorageService` supports writing, reading through signed URLs, and deleting objects. The first production adapter targets Cloudflare R2 through its S3-compatible API. Local development defaults to a no-persistence or filesystem-safe development adapter, and core conversation correctness never depends on object storage.

Audio is stored only when the configured retention behavior requires it. PostgreSQL stores object metadata and keys, never binary audio blobs.

### Authentication

Auth.js provides Google OAuth for V1. Authentication access is wrapped in server helpers that return the application user identity and never expose provider-specific session details to domain logic. Public pages and a limited local demonstration remain accessible; saved history, profiles, progress, and billing require authentication.

### Razorpay

The browser requests checkout creation from MarsVidya. The server derives the user and selected plan, validates eligibility, and creates the Razorpay order or subscription. The browser receives only public checkout configuration and the server-created identifier.

Checkout completion is verified server-side using Razorpay signatures. Webhooks are signature-verified, idempotently processed, and authoritative for durable payment and subscription state. MarsVidya never stores card numbers, CVVs, or payment credentials.

## Data Model

Prisma manages the PostgreSQL schema and versioned migrations. The initial model set is intentionally focused:

- Auth.js account/session/verification models as required by the adapter
- `User`: identity, email, name, timestamps, and last login
- `Profile`: native language, English level, learning goal, daily goal, and timezone
- `Conversation`: owner, mode, title, and timestamps
- `Message`: conversation, role, content, input type, timestamp, and provider-neutral metadata
- `LearningSession`: learner, timing, focus skill, and completion summary
- `LearningProgress`: learner, skill, level/progress value, and timestamps
- `AIUsage`: learner, service, provider, model, input/output units, duration, estimated cost, and timestamp
- `Subscription`: learner, plan, status, provider identifiers, period dates, and timestamps
- `Payment`: learner, provider identifier, amount, currency, status, and timestamp
- `AudioFile`: learner, optional message, object key, duration, MIME type, size, and timestamp
- A minimal webhook/idempotency record where required to guarantee safe Razorpay event processing

Enums constrain roles, input modes, service types, skill categories, and billing states. Provider-specific raw payloads are not persisted unless a narrowly documented reconciliation need arises.

## Plans, Usage, and Limits

Free, Pro, and Premium plan definitions live in one typed server configuration module. Pricing and entitlements are referenced by stable plan IDs rather than duplicated throughout UI and route code.

Every AI, STT, and TTS operation records server-observed usage. Limits are checked on the server before provider invocation and recorded after completion. The client may display usage but never supplies authoritative plan, identity, counters, payment state, or cost.

The rate-limit interface supports authenticated-user and IP keys with endpoint-specific policies. V1 includes a bounded in-memory implementation suitable for local development and a replaceable distributed implementation boundary. PostgreSQL correctness does not depend on Redis.

## API Surface

The initial route handlers are:

```text
POST /api/ai/chat
POST /api/ai/speech-to-text
POST /api/ai/text-to-speech
GET  /api/conversations
POST /api/conversations
GET  /api/learning/progress
POST /api/learning/session
GET  /api/profile
PATCH /api/profile
POST /api/billing/checkout
POST /api/billing/verify
POST /api/webhooks/razorpay
```

Auth.js exposes its required authentication handler. Protected routes derive the user from the server session. Request and response schemas are typed and runtime-validated. APIs return stable application error codes and do not reveal provider or database internals.

## Errors and Resilience

Application errors use categories such as validation, authentication, authorization, rate limit, configuration, provider unavailable, timeout, and internal failure. Route handlers translate these to consistent HTTP responses and learner-friendly messages.

Examples include:

- “Your microphone permission is required for speaking practice.”
- “The AI teacher is temporarily unavailable. Please try again.”
- “Your connection seems unstable.”
- “Something went wrong. Please try again.”

Technical details, stack traces, Prisma errors, provider response bodies, tokens, and secrets are never returned to the client. Recoverable UI failures preserve the learner's typed text or transcript where safe and offer a clear retry.

## Security

- Secrets remain server-only and are documented through placeholders in `.env.example`.
- All request bodies, query parameters, uploads, and webhook payloads are runtime-validated.
- Audio endpoints enforce MIME allowlists and request-size limits.
- Sensitive identity, plan, and billing state come from trusted server data.
- Authorization checks ownership for conversations, messages, audio, profiles, and learning records.
- OAuth and session cookies use secure production settings.
- Provider calls use timeouts and sanitized logging.
- Razorpay webhook verification uses the raw request body and constant-time-safe verification where applicable.
- Logs and analytics exclude credentials, tokens, full private conversations, and raw audio.
- `.gitignore` excludes environment files, build artifacts, credentials, and private keys.

## Observability and Analytics

Structured server logging records request ID, authenticated user ID when appropriate, endpoint, latency, status, provider, model, and error category. It deliberately omits secrets and private message content.

An analytics interface records product events including landing, sign-up, microphone, speech, AI response, TTS, chat, conversation, learning-session, and subscription events. Analytics payloads contain identifiers and coarse metadata, not private conversation text.

## Performance and Accessibility

Server Components are the default. Client Components are limited to microphone control, waveform/state UI, chat interaction, checkout, and other truly interactive regions. Heavy browser-only modules load dynamically. Images use Next.js optimization, provider SDKs remain server-side where possible, and the initial page does not wait for AI, database, or billing services.

The UI uses semantic landmarks, labeled controls, visible keyboard focus, comfortable touch targets, sufficient contrast, screen-reader status announcements, accessible chat input, and reduced-motion behavior. It is checked at 360, 375, 390, 412, 430, 768, 1024, 1280, and 1440+ pixel widths without horizontal overflow.

## Testing and Verification

Unit tests cover service contracts, voice-state transitions, validation, usage calculations, plan limits, safe error mapping, and Razorpay signature verification.

Integration tests cover chat, STT, TTS, authentication boundaries, repository behavior, ownership enforcement, checkout creation, and webhook idempotency. Provider adapters are mocked at their interface boundaries.

UI tests cover microphone permissions, the complete state sequence, cancellation, failure/retry behavior, chat submission, loading, error display, and keyboard accessibility. Responsive and reduced-motion behavior receive targeted checks.

Before completion, the project must pass:

```text
npm run lint
npm run typecheck
npm test
npm run build
```

Any additional end-to-end or database-backed test command is documented and run when its required local services are available. No capability is described as verified unless the corresponding command or manual check has actually completed.

## Delivery Sequence

Implementation proceeds in these runnable milestones:

1. Project foundation, strict TypeScript, design tokens, validation, and folder boundaries
2. Responsive teacher workspace, static teacher, chat UI, and voice state machine
3. Provider-neutral backend contracts, safe errors, and local adapters
4. OpenAI chat/STT/TTS adapters and the complete browser voice pipeline
5. Prisma schema, repositories, migrations, conversations, and usage persistence
6. Auth.js Google OAuth and protected user features
7. Profile and learning-progress foundations
8. Razorpay checkout, verification, webhooks, and plan enforcement
9. Optional R2 audio storage adapter
10. Rate limiting, structured logging, analytics, security hardening, and complete tests
11. Production build verification and deployment documentation

Each milestone keeps the app runnable. Interfaces are introduced because they isolate an actual provider or responsibility, not as speculative framework code.

## Environment and Deployment

The environment template documents PostgreSQL, Auth.js/Google OAuth, OpenAI, Razorpay, optional R2, and optional distributed-rate-limit settings. Development starts without Redis and can render the UI and exercise mock AI flows without external AI or storage credentials. Database and OAuth features require their documented services.

The production target is Vercel with managed PostgreSQL and optional Cloudflare R2. Prisma migrations are created and versioned in development and applied with `prisma migrate deploy` in production. Production data is never reset as part of deployment.

## Future Compatibility

The stable teacher, service, repository, authentication, storage, and API boundaries allow later replacement or extension without rebuilding the application:

- `StaticTeacher` can become `InteractiveTeacher` with lip sync and expression inputs.
- Additional AI, STT, and TTS providers can implement the existing contracts.
- Redis or another distributed store can implement rate limiting and transient coordination.
- A future Android app can consume the same authenticated APIs.
- Learning modules can grow into personalized exercises and curriculum without coupling them to provider SDKs.

These are compatibility constraints only; their implementations are not part of V1.
