# MarsVidya V1 Data, Authentication, and Learning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add PostgreSQL persistence, Google authentication, conversation ownership, learner profiles, learning progress, usage records, and server-side plan limits.

**Architecture:** Prisma repositories implement application-owned interfaces. Auth.js Google OAuth is translated to a small application user/session boundary; route handlers derive identity from that boundary and never accept an authoritative user ID from clients.

**Tech Stack:** PostgreSQL, Prisma ORM, Auth.js, Google OAuth, Next.js Route Handlers, Zod, Vitest

**Spec:** `docs/superpowers/specs/2026-10-05-marsvidya-v1-design.md`

## Global Constraints

- Database changes are versioned through Prisma migrations and production uses `prisma migrate deploy`.
- Passwords are not stored by MarsVidya.
- Protected resources enforce ownership using the authenticated server session.
- PostgreSQL stores audio metadata, never audio bytes.
- Usage and plan enforcement are authoritative on the server.
- Redis is not required for local development or core correctness.

## Review Focus

- A client-supplied `userId` must never override the session identity; Task 3 tests it.
- One user must not read another user's conversation by guessed ID; Task 2 tests it.
- Concurrent usage reservations must not exceed a plan limit; Task 5 tests transaction behavior.
- A deleted OAuth identity must not leave an active application session accepted; Task 3 tests null-user handling.
- Profile timezone and enum values must reject malformed values; Task 4 tests validation.

---

### Task 1: Prisma schema and database client

**Files:**
- Create: `prisma/schema.prisma`, `prisma/migrations/<generated>/migration.sql`, `prisma/seed.ts`
- Create: `src/server/db/prisma.ts`
- Create: `src/server/db/schema.test.ts`
- Modify: `package.json`, `.env.example`

**Interfaces:**
- Consumes: shared chat/voice domain types
- Produces: Prisma models and `getPrisma(): PrismaClient`

- [ ] **Step 1: Write schema assertions for User/Auth.js records, Profile, Conversation, Message, LearningSession, LearningProgress, AIUsage, Subscription, Payment, AudioFile, and webhook idempotency.**

- [ ] **Step 2: Run the schema test and verify required models/enums are absent.**

- [ ] **Step 3: Define the PostgreSQL schema with explicit relations, indexes, uniqueness, cascade behavior, and provider-neutral JSON metadata.**

- [ ] **Step 4: Generate the Prisma client and create the initial migration against the configured development database.**

- [ ] **Step 5: Add a minimal seed that creates plan reference data only; do not create fake users.**

- [ ] **Step 6: Run Prisma validation, focused tests, and type checking.**

- [ ] **Step 7: Commit with `git commit -m "feat: add production data schema"`.**

### Task 2: Conversation repositories and persistence

**Files:**
- Create: `src/features/conversations/ConversationRepository.ts`
- Create: `src/server/repositories/PrismaConversationRepository.ts`
- Create: `src/features/conversations/conversation-service.ts`
- Create: `src/server/repositories/conversations.integration.test.ts`
- Create: `src/app/api/conversations/route.ts`, `src/app/api/conversations/[id]/route.ts`
- Modify: `src/features/conversations/respond-to-learner.ts`

**Interfaces:**
- Consumes: Prisma client and `respondToLearner`
- Produces: `ConversationRepository`, `createConversation(userId: string, input: CreateConversationInput)`, `listConversations(userId: string)`, and `appendTurn(input: AppendTurnInput)`

- [ ] **Step 1: Write repository tests for create/list, ordered messages, voice/text input types, ownership denial, and transaction rollback.**

- [ ] **Step 2: Run the integration test against the test database and verify the repository is missing.**

- [ ] **Step 3: Implement the interface, Prisma repository, and application service with no provider types in persisted metadata.**

- [ ] **Step 4: Implement conversation routes using a temporary auth dependency that Task 3 replaces.**

- [ ] **Step 5: Run focused integration tests and type checking.**

- [ ] **Step 6: Commit with `git commit -m "feat: persist learner conversations"`.**

### Task 3: Auth.js Google OAuth and protected routes

**Files:**
- Create: `src/server/auth/auth.ts`, `src/server/auth/get-current-user.ts`, `src/server/auth/types.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/components/auth/SignInButton.tsx`, `src/components/auth/UserMenu.tsx`
- Create: `src/server/auth/auth.test.ts`
- Modify: `src/components/navigation/MarsVidyaHeader.tsx`, conversation routes, `src/config/env.ts`, `.env.example`

**Interfaces:**
- Consumes: Prisma User/Account/Session models
- Produces: `getCurrentUser(): Promise<AuthenticatedUser | null>` and `requireCurrentUser(): Promise<AuthenticatedUser>`

- [ ] **Step 1: Write auth-boundary tests for signed-out, valid Google session, missing database user, and ignored client `userId`.**

- [ ] **Step 2: Run the focused test and verify the auth boundary is missing.**

- [ ] **Step 3: Configure Auth.js with Google OAuth and the Prisma adapter, secure production cookies, and sign-in callbacks that update `lastLoginAt`.**

- [ ] **Step 4: Implement the small application auth boundary and replace temporary route identity with `requireCurrentUser`.**

- [ ] **Step 5: Implement accessible sign-in/sign-out controls in the shared header.**

- [ ] **Step 6: Run auth, conversation, lint, and type checks.**

- [ ] **Step 7: Commit with `git commit -m "feat: add Google authentication and ownership"`.**

### Task 4: Profile and learning foundations

**Files:**
- Create: `src/features/profile/profile-schema.ts`, `src/features/profile/profile-service.ts`
- Create: `src/features/learning/learning-service.ts`, `src/features/learning/learning.test.ts`
- Create: `src/app/api/profile/route.ts`
- Create: `src/app/api/learning/progress/route.ts`, `src/app/api/learning/session/route.ts`
- Create: `src/app/profile/page.tsx`, `src/app/learn/page.tsx`

**Interfaces:**
- Consumes: Prisma models and `requireCurrentUser`
- Produces: `getProfile(userId)`, `updateProfile(userId, input)`, `getLearningProgress(userId)`, and `completeLearningSession(userId, input)`

- [ ] **Step 1: Write tests for profile defaults, valid updates, invalid timezone/level, progress ownership, and completed-session aggregation.**

- [ ] **Step 2: Run focused tests and verify application services are missing.**

- [ ] **Step 3: Implement schemas, services, and authenticated routes.**

- [ ] **Step 4: Implement small server-rendered profile and learning-summary pages using existing UI primitives.**

- [ ] **Step 5: Run focused tests, lint, type checking, and build.**

- [ ] **Step 6: Commit with `git commit -m "feat: add learner profile and progress foundation"`.**

### Task 5: Usage accounting, plan limits, and rate limiting

**Files:**
- Create: `src/config/plans.ts`, `src/config/plans.test.ts`
- Create: `src/features/usage/UsageRepository.ts`, `src/server/repositories/PrismaUsageRepository.ts`
- Create: `src/features/usage/usage-service.ts`, `src/features/usage/usage-service.test.ts`
- Create: `src/server/security/RateLimiter.ts`, `src/server/security/InMemoryRateLimiter.ts`, `src/server/security/rate-limiter.test.ts`
- Modify: all three AI route handlers and `respond-to-learner.ts`

**Interfaces:**
- Consumes: provider usage results, authenticated user, Prisma client
- Produces: `reserveUsage(input: UsageReservation): Promise<UsagePermit>`, `recordUsage(input: UsageRecord): Promise<void>`, and `RateLimiter.consume(key: string, policy: RateLimitPolicy): Promise<RateLimitResult>`

- [ ] **Step 1: Write tests for centralized Free/Pro/Premium entitlements, boundary values, concurrent reservations, anonymous IP limits, per-user limits, endpoint separation, and window reset.**

- [ ] **Step 2: Run focused tests and verify usage/rate services are missing.**

- [ ] **Step 3: Implement typed plan configuration and transactional usage reservation/recording.**

- [ ] **Step 4: Implement the in-memory rate limiter behind its interface.**

- [ ] **Step 5: Apply endpoint-specific limits and server-observed usage to AI/STT/TTS routes.**

- [ ] **Step 6: Run focused tests, integration tests, lint, type checking, and build.**

- [ ] **Step 7: Commit with `git commit -m "feat: enforce AI usage and rate limits"`.**

## Phase Verification

- [ ] Run migrations on a clean test database, then run all tests.
- [ ] Run `npm run lint`, `npm run typecheck`, and `npm run build`.
- [ ] Verify signed-out users cannot read protected data and two test users cannot cross-read resources.

