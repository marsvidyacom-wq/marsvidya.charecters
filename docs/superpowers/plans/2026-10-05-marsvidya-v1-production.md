# MarsVidya V1 Billing, Storage, and Production Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete Razorpay billing, optional R2 audio storage, security/observability hardening, deployment documentation, and full release verification.

**Architecture:** Billing and storage remain provider adapters behind application interfaces. Webhooks are authoritative and idempotent; cross-cutting logging, analytics, validation, and security utilities wrap route boundaries without leaking private content.

**Tech Stack:** Razorpay, Cloudflare R2/S3-compatible SDK, Next.js Route Handlers, Prisma, Vitest, Testing Library, Playwright

**Spec:** `docs/superpowers/specs/2026-10-05-marsvidya-v1-design.md`

## Global Constraints

- MarsVidya never stores card numbers, CVVs, payment credentials, or binary audio in PostgreSQL.
- Razorpay orders are server-created; signatures and raw-body webhooks are verified server-side.
- Webhook processing is idempotent and authoritative for durable billing state.
- R2 is optional and core conversation correctness does not depend on storage.
- Logs and analytics omit credentials, tokens, raw audio, and full private conversations.
- Completion requires successful lint, type check, tests, and production build.

## Review Focus

- Replayed Razorpay webhooks must not duplicate payments; Task 1 tests idempotency.
- A validly signed webhook for an unknown local user/order must be acknowledged safely and logged for reconciliation; Task 1 tests it.
- An R2 upload failure must not discard a completed transcript or AI response; Task 2 tests graceful degradation.
- Log metadata containing keys named `token`, `authorization`, or `apiKey` must be redacted recursively; Task 3 tests it.
- A request body above its endpoint limit must be rejected before full parsing/provider work; Task 3 tests it.

---

### Task 1: Razorpay checkout and webhook reconciliation

**Files:**
- Create: `src/features/subscriptions/BillingProvider.ts`, `src/features/subscriptions/billing-service.ts`
- Create: `src/services/billing/RazorpayBillingProvider.ts`
- Create: `src/server/security/verify-razorpay-signature.ts`
- Create: `src/app/api/billing/checkout/route.ts`, `src/app/api/billing/verify/route.ts`
- Create: `src/app/api/webhooks/razorpay/route.ts`
- Create: `src/features/subscriptions/billing.test.ts`
- Create: `src/app/pricing/page.tsx`, `src/components/billing/RazorpayCheckoutButton.tsx`
- Modify: `src/config/plans.ts`, `src/config/env.ts`, `.env.example`

**Interfaces:**
- Consumes: authenticated user, Prisma subscription/payment models, centralized plans
- Produces: `BillingProvider.createCheckout(input): Promise<CheckoutSession>`, `verifyCheckout(input): Promise<VerifiedPayment>`, and `processWebhook(rawBody: string, signature: string): Promise<WebhookResult>`

- [ ] **Step 1: Write signature tests using fixed secrets/fixtures for valid, invalid, tampered, and missing signatures.**

- [ ] **Step 2: Write service tests for server-derived amounts, unknown plans, duplicate events, out-of-order subscription events, unknown local references, and successful payment reconciliation.**

- [ ] **Step 3: Run focused tests and verify billing interfaces are missing.**

- [ ] **Step 4: Implement Razorpay signature helpers and the provider adapter without exposing the key secret to client code.**

- [ ] **Step 5: Implement transactional checkout verification and idempotent webhook processing.**

- [ ] **Step 6: Implement the authenticated checkout route, raw-body webhook route, pricing page, and accessible checkout button.**

- [ ] **Step 7: Run focused tests, lint, type checking, and build.**

- [ ] **Step 8: Commit with `git commit -m "feat: integrate Razorpay subscriptions"`.**

### Task 2: Optional Cloudflare R2 audio storage

**Files:**
- Create: `src/services/storage/ObjectStorageService.ts`
- Create: `src/services/storage/NoopObjectStorageService.ts`
- Create: `src/services/storage/R2ObjectStorageService.ts`
- Create: `src/services/storage/create-storage-service.ts`
- Create: `src/services/storage/storage.test.ts`
- Create: `src/server/repositories/PrismaAudioFileRepository.ts`
- Modify: speech routes, `src/config/env.ts`, `.env.example`

**Interfaces:**
- Consumes: authenticated user, AudioFile Prisma model
- Produces: `put(input: StorageWrite): Promise<StoredObject>`, `createSignedReadUrl(key: string, expiresInSeconds: number): Promise<string>`, and `delete(key: string): Promise<void>`

- [ ] **Step 1: Write tests for disabled storage, key scoping, MIME metadata, signed URL expiry, provider failure, and conversation success when storage fails.**

- [ ] **Step 2: Run focused tests and verify storage interfaces are missing.**

- [ ] **Step 3: Implement no-op and R2 adapters plus environment-backed factory selection.**

- [ ] **Step 4: Persist audio metadata only after a successful object write; sanitize object keys and never expose bucket credentials.**

- [ ] **Step 5: Integrate optional recording/response retention without making it part of conversation correctness.**

- [ ] **Step 6: Run focused tests, integration tests, type checking, and lint.**

- [ ] **Step 7: Commit with `git commit -m "feat: add optional R2 audio storage"`.**

### Task 3: Structured logging, analytics, and route hardening

**Files:**
- Create: `src/services/analytics/AnalyticsService.ts`, `src/services/analytics/ServerAnalyticsService.ts`
- Create: `src/server/observability/logger.ts`, `src/server/observability/logger.test.ts`
- Create: `src/server/http/with-route-observability.ts`, `src/server/http/body-limits.ts`
- Create: `src/server/security/security.test.ts`
- Modify: all application route handlers

**Interfaces:**
- Consumes: route request IDs, authenticated user where appropriate, provider metadata
- Produces: `Logger.info/error(event: LogEvent)`, `AnalyticsService.track(event: AnalyticsEvent): Promise<void>`, and `withRouteObservability(handler): RouteHandler`

- [ ] **Step 1: Write recursive-redaction tests for secrets, tokens, authorization headers, nested objects, and private conversation fields.**

- [ ] **Step 2: Write route-boundary tests for body limits, request IDs, latency/status fields, safe failures, and analytics payloads without conversation text.**

- [ ] **Step 3: Run focused tests and verify observability utilities are missing.**

- [ ] **Step 4: Implement a small structured JSON logger and analytics interface without adding an external telemetry dependency.**

- [ ] **Step 5: Implement route wrappers and apply them consistently to protected and provider-backed endpoints.**

- [ ] **Step 6: Run focused tests, all route tests, lint, type checking, and build.**

- [ ] **Step 7: Commit with `git commit -m "feat: harden API observability and security"`.**

### Task 4: End-to-end checks, documentation, and deployment readiness

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/home.spec.ts`, `tests/e2e/chat.spec.ts`, `tests/e2e/voice.spec.ts`
- Create: `README.md`
- Modify: `package.json`, `.env.example`, `.gitignore`

**Interfaces:**
- Consumes: the complete application
- Produces: scripts `test:e2e`, `prisma:generate`, `db:migrate`, `db:deploy`, `db:seed`, and complete operator documentation

- [ ] **Step 1: Write Playwright tests for home rendering, keyboard chat submission, blank-message rejection, mock voice happy sequence, error/retry, reduced motion, and 360px/1440px overflow.**

- [ ] **Step 2: Run `npm run test:e2e` and fix only application defects exposed by the tests.**

- [ ] **Step 3: Write the README with architecture, prerequisites, local mock mode, Google OAuth, OpenAI, PostgreSQL, migrations, Razorpay, optional R2, tests, production build, Vercel deployment, security notes, and future roadmap.**

- [ ] **Step 4: Audit `.env.example` and `.gitignore`; confirm every read environment variable is documented and no real value is present.**

- [ ] **Step 5: Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`, and `npm run build`; record exact results.**

- [ ] **Step 6: Run a clean-install check with the lockfile and a clean-database migration check.**

- [ ] **Step 7: Inspect the production client bundles and browser network requests for secrets.**

- [ ] **Step 8: Commit with `git commit -m "docs: complete production readiness and verification"`.**

## Release Verification

- [ ] Verify the app starts without OpenAI, Razorpay, R2, or Redis credentials in development mock mode.
- [ ] Verify production configuration fails closed when required credentials are missing.
- [ ] Verify Google sign-in and protected ownership with configured credentials.
- [ ] Verify one sandbox Razorpay transaction and one signed webhook when sandbox credentials are available.
- [ ] Verify one real voice round trip and optional R2 object lifecycle when credentials are available.
- [ ] Report unavailable credential-dependent checks as unverified limitations; do not claim they passed.
