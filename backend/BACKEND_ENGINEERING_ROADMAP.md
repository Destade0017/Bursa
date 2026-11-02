# BursarOS: Backend Engineering & Implementation Roadmap

**Document Version:** 1.0.0  
**Status:** Implementation Blueprint / Execution Roadmap  
**Target Architecture Reference:** [`BACKEND_ARCHITECTURE.md`](./BACKEND_ARCHITECTURE.md)  
**Financial Domain Reference:** [`FINANCIAL_DOMAIN_DESIGN.md`](./FINANCIAL_DOMAIN_DESIGN.md)  
**Core Technologies:** Node.js (ESM), Express.js, PostgreSQL, Prisma ORM, Paystack, Redis (Planned), BullMQ (Planned)

---

## Table of Contents
1. [Executive Summary & Roadmap Structure](#1-executive-summary--roadmap-structure)
2. [Phase 0 — Foundation and Baseline](#2-phase-0--foundation-and-baseline)
3. [Phase 1 — Security and Tenant Isolation](#3-phase-1--security-and-tenant-isolation)
4. [Phase 2 — Testing and Code Structure](#4-phase-2--testing-and-code-structure)
5. [Phase 3 — Financial Ledger Implementation](#5-phase-3--financial-ledger-implementation)
6. [Phase 4 — Payment Reliability & Concurrency Control](#6-phase-4--payment-reliability--concurrency-control)
7. [Phase 5 — Background Processing & Asynchronous Jobs](#7-phase-5--background-processing--asynchronous-jobs)
8. [Phase 6 — Production Readiness, Performance & Observability](#8-phase-6--production-readiness-performance--observability)
9. [Dependency Graph & Task Classification Matrix](#9-dependency-graph--task-classification-matrix)
10. [Critical Path & Recommended Execution Sequence](#10-critical-path--recommended-execution-sequence)
11. [Definition of Done (DoD)](#11-definition-of-done-dod)
12. [Suggested Delivery Milestones](#12-suggested-delivery-milestones)
13. [Explicit Non-Goals (Features NOT to Build Yet)](#13-explicit-non-goals-features-not-to-build-yet)

---

## 1. Executive Summary & Roadmap Structure

This document translates the architectural standards of `BACKEND_ARCHITECTURE.md` and the accounting rules of `FINANCIAL_DOMAIN_DESIGN.md` into an actionable engineering roadmap.

### Core Implementation Principles
- **Zero Downtime / Non-Breaking Iteration**: Every change preserves backward compatibility with the existing React frontend and Paystack webhooks.
- **Security & Financial Integrity First**: Remediate security holes and balance calculation bugs before refactoring code or introducing background workers.
- **Incremental Refactoring over Rewrite**: Evolve controllers into services within the existing repository structure without breaking operational workflows.

---

## 2. Phase 0 — Foundation and Baseline

```
Phase 0 Milestone: Complete Architectural Baseline & Regression Safety Guard
Goal: Document existing runtime behavior and establish test scaffolding before modifying code.
```

### TASK-001: Architecture & Financial Domain Design Alignment
- **Priority**: P0 (Foundational)
- **Problem**: Engineering lacks a single source of truth for domain invariants, causing inconsistent controller implementations.
- **Current Implementation**: Logic is dispersed across 9 controllers without written specifications.
- **Proposed Change**: Formal review and team alignment on `BACKEND_ARCHITECTURE.md` and `FINANCIAL_DOMAIN_DESIGN.md`. Validate all accounting assumptions against Nigerian banking and school business models.
- **Files Affected**: None (Documentation only).
- **Dependencies**: None.
- **Implementation Steps**:
  1. Review document specifications with domain stakeholders.
  2. Cross-reference Prisma schema with Paystack DVA and counter cash workflows.
- **Tests Required**: None.
- **Acceptance Criteria**: Both design documents approved as the technical specification for all subsequent tasks.
- **Risks & Rollback**: None.

---

### TASK-002: Existing HTTP API Contract Documentation & Snapshotting
- **Priority**: P1
- **Problem**: Changing controller structures risks unintentionally altering JSON response shapes consumed by the frontend.
- **Current Implementation**: No OpenAPI/Swagger specifications exist; endpoints return varying payload wrapper shapes (e.g., `{ success, user }` vs `{ message, invoice }`).
- **Proposed Change**: Document and snapshot all 28 existing route contracts (inputs, query parameters, outputs, status codes) to create an end-to-end regression contract suite.
- **Files Affected**:
  - `src/routes/*.js`
  - `tests/fixtures/contractSnapshots.json` (New)
- **Dependencies**: TASK-001.
- **Implementation Steps**:
  1. Audit every Express route across the 10 route files.
  2. Document parameter names, query strings, and response payloads.
  3. Create JSON schema fixtures representing existing response contracts.
- **Tests Required**: Contract verification tests comparing live route responses against snapshotted fixtures.
- **Acceptance Criteria**: All 28 endpoints documented with sample requests and response payloads.
- **Risks & Rollback**: Purely analytical; no runtime impact.

---

### TASK-003: Core Business Logic & State Machine Mapping
- **Priority**: P1
- **Problem**: Implicit business logic (such as cash remittal status transitions and mass billing logic) is undocumented, risking regression during refactoring.
- **Current Implementation**:
  - Fee schedule fallback logic embedded in `schoolController.js:121-132`.
  - Cash handover transition embedded in `cashDrawerController.js:128-136`.
  - Webhook fallback matching in `paymentController.js:100-120`.
- **Proposed Change**: Create explicit decision tables for:
  - Fee schedule class grade matching and invoice item cloning.
  - Cash handover Maker-Checker states (`PENDING_VERIFICATION` $\rightarrow$ `CONFIRMED_BY_PROPRIETOR`).
  - Webhook invoice matching hierarchy (Oldest open invoice $\rightarrow$ Suspense).
- **Files Affected**: None (Documented in test suite specifications).
- **Dependencies**: TASK-002.
- **Implementation Steps**:
  1. Map existing branching logic from controllers into explicit unit test cases.
  2. Document all boundary edge cases (e.g., class grade string casing/trimming).
- **Tests Required**: Specification tests matching documented state machine matrices.
- **Acceptance Criteria**: State machine decision matrices documented and covered by baseline test scenarios.
- **Risks & Rollback**: No runtime impact.

---

### TASK-004: Automated Test Harness Setup (Vitest + Supertest)
- **Priority**: P0
- **Problem**: `package.json` contains `"test": "echo \"Error: no test specified\" && exit 1"`. Zero automated tests exist.
- **Current Implementation**: No test framework or test configuration present.
- **Proposed Change**: Install and configure Vitest (or Jest with ESM support) and Supertest with an ephemeral test database configuration.
- **Files Affected**:
  - `package.json`
  - `vitest.config.js` (New)
  - `tests/setup.js` (New)
- **Dependencies**: None.
- **Implementation Steps**:
  1. Configure Vitest runner to support native Node.js ES Modules.
  2. Configure `tests/setup.js` to manage test database migrations and cleanups.
  3. Write a baseline test verifying `GET /api/health` returns `200 OK`.
- **Tests Required**: `tests/integration/health.test.js`.
- **Acceptance Criteria**: Running `npm test` executes the test suite and passes in CI/CD environment.
- **Risks & Rollback**: Low risk. Isolated to development dependencies.

---

## 3. Phase 1 — Security and Tenant Isolation

```
Phase 1 Milestone: Hardened Security Boundary & Multi-Tenant Isolation
Goal: Eliminate critical authentication fallbacks, patch tenant leakage vectors, and secure public endpoints.
```

### TASK-101: Insecure JWT Secret Fallback Remediation
- **Priority**: P0 (Critical Security)
- **Problem**: `authController.js:11` and `authMiddleware.js:8` fall back to a hardcoded string (`'bursaros_super_secret_jwt_key_2026'`) if `process.env.JWT_SECRET` is unset.
- **Current Implementation**:
  ```javascript
  const JWT_SECRET = process.env.JWT_SECRET || 'bursaros_super_secret_jwt_key_2026';
  ```
- **Proposed Change**: Remove all fallback strings. Create a validated configuration loader (`src/config/env.js`) that terminates server startup with an error if `JWT_SECRET` is undefined, under 32 characters, or set to a placeholder.
- **Files Affected**:
  - `src/config/env.js` (New)
  - `src/controllers/authController.js`
  - `src/middlewares/authMiddleware.js`
  - `src/server.js`
- **Dependencies**: TASK-004.
- **Implementation Steps**:
  1. Create `src/config/env.js` using Zod or pure assertion logic to validate `process.env`.
  2. Import validated `env.JWT_SECRET` across auth modules.
  3. Remove all `|| 'fallback'` statements.
- **Tests Required**:
  - Unit test: Server boot throws fatal error if `JWT_SECRET` is missing.
  - Integration test: Authentication succeeds when a valid 32+ character key is supplied.
- **Acceptance Criteria**: Application refuses to boot without a secure, explicit `JWT_SECRET`.
- **Risks & Rollback**: Missing environment variables in deployment environments will prevent server boot. Ensure deployment configurations are updated before release.

---

### TASK-102: Multi-Tenant Authorization Bypass Remediation
- **Priority**: P0 (Critical Security)
- **Problem**: `authMiddleware.js:125` contains a vulnerability where omitting `schoolId` causes the middleware to invoke `next()`, bypassing tenant isolation.
- **Current Implementation**:
  ```javascript
  let targetSchoolId = req.params.schoolId || req.body?.schoolId || req.query?.schoolId;
  ...
  if (!targetSchoolId) return next(); // VULNERABILITY: Bypasses check if parameter omitted
  if (req.user.schoolId !== targetSchoolId) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  ```
- **Proposed Change**:
  1. Make `schoolId` mandatory for all school-scoped routes. If `targetSchoolId` is missing, reject immediately with `400 Bad Request`.
  2. Enforce `req.user.schoolId === targetSchoolId`.
  3. Bind verified `req.schoolId = req.user.schoolId` to downstream request context.
- **Files Affected**:
  - `src/middlewares/authMiddleware.js`
  - `src/routes/feeScheduleRoutes.js`
  - `src/routes/invoiceRoutes.js`
  - `src/routes/paymentRoutes.js`
- **Dependencies**: TASK-004, TASK-101.
- **Implementation Steps**:
  1. Rewrite `verifySchoolAccess` in `authMiddleware.js` to reject requests where `targetSchoolId` cannot be determined.
  2. Standardize route definitions to ensure `:schoolId` is always present in paths for school-scoped resources.
- **Tests Required**:
  - Integration test: Request with omitted `schoolId` returns `400 Bad Request`.
  - Integration test: User from School A attempting to access School B data returns `403 Forbidden`.
  - Integration test: User from School A accessing School A data succeeds with `200 OK`.
- **Acceptance Criteria**: No route can execute a tenant-scoped action without verifying the authenticated token's `schoolId` matches the target resource.
- **Risks & Rollback**: Frontend requests with missing parameters will be rejected. Verify frontend API client sends `schoolId` across all requests.

---

### TASK-103: Short-Lived Access Tokens & Revocation Architecture
- **Priority**: P1
- **Problem**: JWT access tokens are valid for 7 days (`JWT_EXPIRES_IN = '7d'`). Revoked or demoted staff retain access until expiration.
- **Current Implementation**: Stateless JWT signed for 7 days without database or revocation checks.
- **Proposed Change**:
  1. Reduce JWT access token expiration to **15 minutes**.
  2. Implement a `RefreshToken` model in Prisma with revocation status, user-agent tracking, and 7-day expiration.
  3. Add `POST /api/auth/refresh` and `POST /api/auth/logout` endpoints.
- **Files Affected**:
  - `prisma/schema.prisma`
  - `src/controllers/authController.js`
  - `src/routes/authRoutes.js`
  - `src/middlewares/authMiddleware.js`
- **Dependencies**: TASK-101.
- **Implementation Steps**:
  1. Add `RefreshToken` model to `schema.prisma`.
  2. Update `login` to issue an access token (15m) and a cryptographically secure refresh token (7d).
  3. Implement refresh token rotation in `authController.js`.
- **Tests Required**:
  - Integration test: Access token expires after 15 minutes.
  - Integration test: Refresh token rotation issues a new access token and invalidates the previous refresh token.
  - Integration test: Revoked refresh token cannot be reused.
- **Acceptance Criteria**: Stolen or expired access tokens cease functioning after 15 minutes; logouts immediately invalidate refresh sessions.
- **Risks & Rollback**: Requires frontend integration of the token refresh loop.

---

### TASK-104: Production CORS Configuration Hardening
- **Priority**: P1
- **Problem**: `server.js:47` allows any origin in the `else` branch (`callback(null, true)`), rendering CORS protections ineffective.
- **Current Implementation**:
  ```javascript
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive for production deployments
      }
    }
  })
  ```
- **Proposed Change**: Parse an explicit comma-separated allowlist from `process.env.ALLOWED_ORIGINS`. Reject any unlisted origin with an authorization error.
- **Files Affected**:
  - `src/server.js`
  - `.env.example`
- **Dependencies**: TASK-101.
- **Implementation Steps**:
  1. Define `ALLOWED_ORIGINS` in `src/config/env.js`.
  2. Replace the permissive `else` branch in `server.js` with `callback(new Error('CORS Not Allowed'))`.
- **Tests Required**:
  - Integration test: Approved origin header receives CORS response headers.
  - Integration test: Unlisted origin header is rejected.
- **Acceptance Criteria**: Cross-origin requests from unapproved domains are rejected by Express.
- **Risks & Rollback**: Misconfigured `ALLOWED_ORIGINS` will block valid frontend clients. Ensure all preview and production frontend domains are configured.

---

### TASK-105: Parent Portal Protection & Rate Limiting
- **Priority**: P1
- **Problem**: `parentPortalController.js` rate limiting uses an in-memory `Map` that resets on restart, does not scale across instances, and allows scraping of student names via phone numbers.
- **Current Implementation**: In-memory `Map` with 30 requests/minute limit; queries students using phone numbers without secondary verification.
- **Proposed Change**:
  1. Require both `parentPhone` AND `studentAdmissionNumber` for public fee lookups.
  2. Obfuscate all sensitive parent and student data in responses (surnames masked to initial).
  3. Move rate limiting into reusable middleware.
- **Files Affected**:
  - `src/controllers/parentPortalController.js`
  - `src/routes/publicRoutes.js`
  - `src/middlewares/rateLimiter.js` (New)
- **Dependencies**: TASK-004.
- **Implementation Steps**:
  1. Update `lookupStudent` validation to require both admission number and phone number.
  2. Enforce strict masking on returned records.
- **Tests Required**:
  - Integration test: Lookup with phone number alone returns `400 Bad Request`.
  - Integration test: Matching lookup returns masked surname and active invoice balance.
  - Integration test: Rate limiter blocks requests exceeding 10 attempts/minute per IP.
- **Acceptance Criteria**: Automated student scraping via sequential phone number enumeration is prevented.
- **Risks & Rollback**: Parents without admission numbers will need to obtain them from the school administration.

---

## 4. Phase 2 — Testing and Code Structure

```
Phase 2 Milestone: Clean Layering, Centralized Validation, and Error Handling
Goal: Decouple business logic from Express routing, enforce Zod validation, and eliminate console.log.
```

### TASK-201: Centralized Domain Exception Hierarchy & Global Error Handler
- **Priority**: P1
- **Problem**: Controllers mix inline `res.status(500).json({ error: error.message })` calls with varied JSON error formats.
- **Current Implementation**: Inconsistent ad-hoc error responses across all controllers.
- **Proposed Change**: Introduce `AppError` base class with subclasses (`NotFoundError`, `UnauthorizedError`, `ForbiddenError`, `ConflictError`, `ValidationError`). Install a single Express error middleware formatting all errors into a standardized response shape.
- **Files Affected**:
  - `src/core/errors/AppError.js` (New)
  - `src/core/middleware/errorHandler.js` (New)
  - `src/server.js`
- **Dependencies**: TASK-004.
- **Implementation Steps**:
  1. Create error class hierarchy under `src/core/errors/`.
  2. Implement global error handler in `src/core/middleware/errorHandler.js` capturing `AppError`, Prisma errors (`P2002`, `P2025`), and unexpected exceptions.
  3. Register error handler as the final middleware in `src/server.js`.
- **Tests Required**:
  - Unit test: `AppError` subclasses set correct HTTP status codes.
  - Integration test: Throwing `NotFoundError` returns formatted JSON with request correlation ID.
- **Acceptance Criteria**: All API errors return a uniform `{ success: false, error: { code, message, requestId, details } }` payload.
- **Risks & Rollback**: Frontend must parse the standardized error format.

---

### TASK-202: Request Schema Validation Pipeline (Zod)
- **Priority**: P1
- **Problem**: Controllers manually assert parameters (e.g., `if (!firstName || !lastName)`), leading to inconsistent validation and silent type coercion bugs.
- **Current Implementation**: Manual validation logic repeated across controller methods.
- **Proposed Change**: Implement Zod request validation middleware (`validateRequest(schema)`). Define schemas for authentication, invoicing, fee schedules, and student management.
- **Files Affected**:
  - `src/core/middleware/validateRequest.js` (New)
  - `src/modules/*/schemas/*.js` (New)
  - All route definitions under `src/routes/`
- **Dependencies**: TASK-201.
- **Implementation Steps**:
  1. Create `validateRequest` middleware wrapper for Zod schemas.
  2. Implement validation schemas for all POST, PUT, and PATCH routes.
  3. Mount schema validation on routes before controller execution.
- **Tests Required**:
  - Unit test: Invalid payloads return `422 Unprocessable Entity` with field-level error details.
  - Integration test: Valid payloads pass through to controller.
- **Acceptance Criteria**: No controller handler executes manual parameter-existence checks.
- **Risks & Rollback**: Low risk. Handled via standard Zod schema rules.

---

### TASK-203: Structured JSON Logging (Pino) & Request Correlation IDs
- **Priority**: P2
- **Problem**: Codebase relies on unformatted `console.log` and `console.error` statements without timestamps, correlation IDs, or log levels.
- **Current Implementation**: Over 40 raw `console.log` calls across controllers and services.
- **Proposed Change**: Install and configure `pino` and `pino-http`. Assign a unique `x-request-id` to every incoming request. Redact sensitive credentials (passwords, auth headers).
- **Files Affected**:
  - `src/core/logging/logger.js` (New)
  - `src/core/middleware/correlationId.js` (New)
  - `src/server.js`
  - All controllers and services
- **Dependencies**: TASK-004.
- **Implementation Steps**:
  1. Configure Pino logger with sensitive data redaction.
  2. Mount correlation ID middleware generating or forwarding `x-request-id`.
  3. Replace `console.log` statements across controllers with logger invocations (`logger.info`, `logger.error`).
- **Tests Required**:
  - Integration test: HTTP responses return `x-request-id` header matching internal log output.
- **Acceptance Criteria**: All logs are emitted as structured JSON containing `reqId`, `schoolId`, `level`, and `timestamp`.
- **Risks & Rollback**: Minimal runtime risk.

---

### TASK-204: Controller-to-Service Decoupling (Billing & Payments)
- **Priority**: P1
- **Problem**: Controllers directly coordinate database operations, external API calls, and business logic.
- **Current Implementation**:
  - `invoiceController.js` combines DB queries and Kobo conversion.
  - `paymentController.js` combines DVA resolution, suspense parking, and DB updates.
- **Proposed Change**: Extract business logic into dedicated service classes:
  - `InvoiceService`: Invoice generation, line item calculations, status evaluations.
  - `PaymentService`: Ingress parsing, matching, allocation, and suspense handling.
- **Files Affected**:
  - `src/services/invoiceService.js` (New)
  - `src/services/paymentService.js` (New)
  - `src/controllers/invoiceController.js`
  - `src/controllers/paymentController.js`
- **Dependencies**: TASK-201, TASK-202.
- **Implementation Steps**:
  1. Create service classes accepting plain JavaScript DTOs.
  2. Move business logic from controllers into service methods.
  3. Update controllers to simply unpack requests, invoke services, and return results.
- **Tests Required**:
  - Unit tests for all methods in `InvoiceService` and `PaymentService`.
  - Integration tests verifying existing endpoint behavior remains identical.
- **Acceptance Criteria**: Controllers contain no database queries or financial calculations.
- **Risks & Rollback**: Logic regressions during extraction. Mitigate by running test suite from TASK-004.

---

### TASK-205: Standardized Cursored Pagination on Large Data Collections
- **Priority**: P2
- **Problem**: Endpoints like `getSchoolInvoices`, `getStudentsBySchool`, and `getAllTransactions` load unbounded record sets into memory.
- **Current Implementation**: `findMany({ where: { schoolId } })` without `take` or `skip` limits.
- **Proposed Change**: Implement standardized cursor-based pagination middleware accepting `limit` (default 50, max 100) and `cursor` parameters.
- **Files Affected**:
  - `src/controllers/schoolController.js`
  - `src/controllers/invoiceController.js`
  - `src/controllers/paymentController.js`
- **Dependencies**: TASK-204.
- **Implementation Steps**:
  1. Add pagination parameters to Zod query schemas.
  2. Update repository/controller queries to apply `take` and `cursor`.
  3. Return pagination metadata (`hasMore`, `nextCursor`, `totalCount`).
- **Tests Required**:
  - Integration test: Requests respect `limit` and navigate via `nextCursor`.
- **Acceptance Criteria**: No collection query can retrieve more than 100 rows in a single database request.
- **Risks & Rollback**: Frontend lists must adapt to paginated payload responses.

---

## 5. Phase 3 — Financial Ledger Implementation

```
Phase 3 Milestone: Immutable Double-Entry Accounting Engine
Goal: Transition from direct column mutation to an append-only, balanced general ledger journal.
```

### TASK-301: Double-Entry Ledger Schema Migration
- **Priority**: P0 (Financial Integrity)
- **Problem**: Balances are mutated directly on invoice rows without an audit trail, precluding financial reconciliation.
- **Current Implementation**: `Invoice.amountPaidKobo` updated in place via arithmetic addition.
- **Proposed Change**: Deploy Prisma schema migration adding:
  - `LedgerAccount` (Chart of accounts node)
  - `JournalEntry` (Immutable transaction header)
  - `LedgerPosting` (Debit/Credit line items with positive integer check constraint)
  - `InvoiceAllocation` (Junction linking payments to specific invoices)
- **Files Affected**:
  - `prisma/schema.prisma`
  - `prisma/migrations/*_add_double_entry_ledger/migration.sql` (New)
- **Dependencies**: TASK-001, TASK-004.
- **Implementation Steps**:
  1. Add ledger models from Section 11 of `FINANCIAL_DOMAIN_DESIGN.md` to `schema.prisma`.
  2. Create and run Prisma migration.
  3. Verify table constraints and foreign keys in PostgreSQL.
- **Tests Required**:
  - Database schema test: Verify unique constraints on `(schoolId, code)` and foreign key cascades.
- **Acceptance Criteria**: Ledger tables deployed to database without disrupting existing application tables.
- **Risks & Rollback**: Non-breaking additive migration. Rollback involves dropping the new tables.

---

### TASK-302: Chart of Accounts Provisioning Service
- **Priority**: P0 (Financial Integrity)
- **Problem**: Schools lack chart of accounts definitions, preventing financial journal categorization.
- **Current Implementation**: No account codes or categories exist.
- **Proposed Change**: Create `LedgerAccountService` that automatically seeds the standardized Chart of Accounts (`1010`, `1020`, `1030`, `1200`, `2050`, `2100`, `4010-4040`, `5010`) whenever a new school registers.
- **Files Affected**:
  - `src/services/ledgerAccountService.js` (New)
  - `src/controllers/authController.js` (`registerSchool`)
- **Dependencies**: TASK-301.
- **Implementation Steps**:
  1. Define standard Chart of Accounts seed template.
  2. Hook account provisioning into the `registerSchool` transaction.
- **Tests Required**:
  - Integration test: Creating a school provisions all default ledger accounts with correct account types.
- **Acceptance Criteria**: Every new school has a populated Chart of Accounts immediately upon registration.
- **Risks & Rollback**: Low risk. Handled inside existing registration transaction.

---

### TASK-303: Core Journal Posting Engine & Invariant Verification
- **Priority**: P0 (Financial Integrity)
- **Problem**: No central service enforces the double-entry accounting equation or verifies debit/credit balance.
- **Current Implementation**: Direct updates without ledger balance validation.
- **Proposed Change**: Implement `LedgerService.postJournalEntry({ schoolId, reference, postings, narration }, tx)`.
  - Enforce: $\sum \text{Debits} \equiv \sum \text{Credits}$.
  - Enforce: `amountKobo > 0`.
  - Create `JournalEntry` and child `LedgerPosting` rows atomically.
- **Files Affected**:
  - `src/services/ledgerService.js` (New)
- **Dependencies**: TASK-301, TASK-302.
- **Implementation Steps**:
  1. Create `LedgerService` with debit/credit balance assertion.
  2. Wrap posting operations in atomic database transactions.
  3. Reject unbalanced entries with `AccountingInvariantError`.
- **Tests Required**:
  - Unit test: Unbalanced entry ($\text{Debits} \ne \text{Credits}$) throws exception and rolls back.
  - Unit test: Negative or zero amount throws validation error.
  - Integration test: Balanced journal entry writes correctly to database.
- **Acceptance Criteria**: It is mathematically impossible to write an unbalanced transaction to the database.
- **Risks & Rollback**: Critical financial component. Must be covered by comprehensive unit tests.

---

### TASK-304: Invoice Issuance Journal Integration
- **Priority**: P0 (Financial Integrity)
- **Problem**: Issuing an invoice does not record accounts receivable or recognize fee revenue on the balance sheet.
- **Current Implementation**: `Invoice.create` writes an invoice record with no ledger entries.
- **Proposed Change**: When an invoice transitions to `ISSUED` (single creation or mass generation), automatically post a journal entry:
  - **DEBIT**: `1200 - Student Accounts Receivable`
  - **CREDIT**: `4010/4020/4030/4040 - Relevant Fee Revenue Accounts`
- **Files Affected**:
  - `src/services/invoiceService.js`
  - `src/controllers/invoiceController.js`
  - `src/controllers/feeScheduleController.js`
- **Dependencies**: TASK-303.
- **Implementation Steps**:
  1. Update `createInvoice` and `generateMassTermInvoices` to invoke `LedgerService.postJournalEntry` inside their creation transaction.
  2. Map fee line item descriptions to appropriate revenue account codes.
- **Tests Required**:
  - Integration test: Generating an invoice creates matching debit in `1200` and credit in revenue accounts.
- **Acceptance Criteria**: Invoicing immediately reflects as an asset (debt) and revenue in school ledger balances.
- **Risks & Rollback**: Transaction failure will abort invoice creation. Ensure revenue accounts are provisioned before issuing.

---

### TASK-305: Payment Allocation Engine & Dual-Write Ledger Recording
- **Priority**: P0 (Financial Integrity)
- **Problem**: Payments overwrite invoice balance directly; overpayments corrupt invoice records.
- **Current Implementation**: `newAmountPaidKobo = invoice.amountPaidKobo + paymentAmount` in `paymentController.js:134`.
- **Proposed Change**: Implement the Payment Allocation Engine from Section 8 of `FINANCIAL_DOMAIN_DESIGN.md`:
  - Allocate payment against oldest open invoices sequentially.
  - Cap allocations at exact outstanding balances.
  - Sweep any surplus into `2100 - Prepaid Student Fees` (Student Credit Wallet).
  - Post balanced ledger entries:
    - **DEBIT**: `1010` (Cash) or `1020` (Paystack Clearing)
    - **CREDIT**: `1200` (Receivables) for allocated amounts
    - **CREDIT**: `2100` (Prepaid Fees) for surplus amounts
- **Files Affected**:
  - `src/services/paymentAllocationService.js` (New)
  - `src/controllers/paymentController.js`
  - `src/controllers/paystackWebhookController.js`
- **Dependencies**: TASK-303, TASK-304.
- **Implementation Steps**:
  1. Implement allocation algorithm in `paymentAllocationService.js`.
  2. Integrate with `recordCashPayment` and `handlePaymentWebhook`.
  3. Maintain dual-write: update legacy `Invoice.amountPaidKobo` and post new ledger entries.
- **Tests Required**:
  - Unit test: Partial payment updates invoice status to `PART_PAID` and reduces receivables.
  - Unit test: Overpayment marks invoice `PAID` and allocates excess to prepaid credit liability.
  - Integration test: Multi-invoice payment distributes funds across oldest invoices in order.
- **Acceptance Criteria**: Overpayments no longer cause `amountPaidKobo > totalAmountKobo`; surplus funds are captured in prepaid fees liability.
- **Risks & Rollback**: High criticality. Dual-write mode ensures legacy queries continue functioning while ledger history builds.

---

### TASK-306: Advance Credit Auto-Application on New Invoices
- **Priority**: P1
- **Problem**: Student advance credit balances sit in liability accounts without being applied to subsequent term fees.
- **Current Implementation**: No mechanism exists to track or apply advance credits.
- **Proposed Change**: When a new invoice is issued to a student:
  1. Check student's balance in `2100 - Prepaid Student Fees`.
  2. If credit exists, execute an automated internal allocation transaction:
     - **DEBIT**: `2100 - Prepaid Student Fees`
     - **CREDIT**: `1200 - Student Accounts Receivable`
  3. Decrement invoice balance accordingly.
- **Files Affected**:
  - `src/services/invoiceService.js`
  - `src/services/paymentAllocationService.js`
- **Dependencies**: TASK-305.
- **Implementation Steps**:
  1. Add credit check hook to invoice issuance workflow.
  2. Post internal transfer journal entry when applying credit.
- **Tests Required**:
  - Integration test: Student with ₦30,000 credit has next term's ₦100,000 invoice auto-reduced to ₦70,000 balance.
- **Acceptance Criteria**: Advance credits automatically clear new invoices without manual bursar intervention.
- **Risks & Rollback**: Low risk. Isolated to students with positive credit balances.

---

### TASK-307: Historical Ledger Backfill Migration Script
- **Priority**: P1
- **Problem**: Existing database contains past invoices and payments that are absent from the new ledger tables, creating historical reconciliation gaps.
- **Current Implementation**: Historical data exists only in legacy `Invoice` and `Payment` tables.
- **Proposed Change**: Develop an idempotent CLI migration script (`scripts/backfill_ledger.js`):
  1. Provision Chart of Accounts for all pre-existing schools.
  2. Post opening receivable and revenue journals for all historical invoices.
  3. Post payment settlement journals for all historical successful payments.
  4. Verify derived ledger balances match legacy invoice balances.
- **Files Affected**:
  - `scripts/backfill_ledger.js` (New)
- **Dependencies**: TASK-303, TASK-304, TASK-305.
- **Implementation Steps**:
  1. Write backfill script processing schools in isolated batches.
  2. Execute trial run on development and staging environments.
  3. Validate trial balance and discrepancy queries across all backfilled schools.
- **Tests Required**:
  - End-to-end script test: Backfilling seed database yields zero reconciliation discrepancy.
- **Acceptance Criteria**: $\text{Total Ledger Receivables} \equiv \sum \text{Legacy Invoice Unpaid Balances}$ across all schools.
- **Risks & Rollback**: Script must be idempotent and non-destructive. Run on database backup before production execution.

---

### TASK-308: Automated Trial Balance & Sub-Ledger Verification Engine
- **Priority**: P1
- **Problem**: Accounting discrepancies between invoices and the ledger can occur without automated integrity verification.
- **Current Implementation**: No verification or reconciliation queries exist.
- **Proposed Change**: Implement automated daily integrity check:
  - Query 1: Verify $\sum \text{Debits} - \sum \text{Credits} = 0$ across all accounts.
  - Query 2: Verify account `1200` balance equals sum of all open invoice balances.
  - Expose `GET /api/schools/:schoolId/ledger/health` endpoint for admin audit.
- **Files Affected**:
  - `src/services/ledgerHealthService.js` (New)
  - `src/routes/schoolRoutes.js`
- **Dependencies**: TASK-303, TASK-307.
- **Implementation Steps**:
  1. Implement trial balance and sub-ledger SQL aggregation queries.
  2. Expose endpoint restricted to `PROPRIETOR` role.
- **Tests Required**:
  - Unit test: Introducing an artificial discrepancy triggers an integrity violation alert.
- **Acceptance Criteria**: Proprietor can verify zero-discrepancy financial health of their school in real time.
- **Risks & Rollback**: Read-only diagnostic tool; no risk to transactional data.

---

## 6. Phase 4 — Payment Reliability & Concurrency Control

```
Phase 4 Milestone: Resilient Payment Ingress & Webhook Idempotency
Goal: Eliminate TOCTOU race conditions, support Paystack fee accounting, and harden suspense management.
```

### TASK-401: Atomic Webhook Idempotency & Concurrency Lock
- **Priority**: P0 (Financial Integrity)
- **Problem**: Concurrent Paystack webhook deliveries for the same payment reference can pass application-level read checks and double-allocate funds.
- **Current Implementation**:
  ```javascript
  const existingPayment = await prisma.payment.findUnique({ where: { transactionReference } });
  if (existingPayment) return res.status(409)...; // VULNERABILITY: Non-atomic read outside write transaction
  ```
- **Proposed Change**: Introduce `ProcessedWebhook` model with unique constraint on `(provider, eventReference)`. Acquire an atomic database insertion lock **before** executing allocation logic.
- **Files Affected**:
  - `prisma/schema.prisma`
  - `src/controllers/paystackWebhookController.js`
  - `src/services/paymentService.js`
- **Dependencies**: TASK-301.
- **Implementation Steps**:
  1. Add `ProcessedWebhook` model to `schema.prisma` and run migration.
  2. Update webhook handler to insert reservation row at start of transaction.
  3. If unique constraint violation occurs, abort immediately and return `HTTP 200 { received: true, duplicate: true }`.
- **Tests Required**:
  - Integration test: Dispatching 5 concurrent HTTP webhook requests with identical references results in exactly 1 ledger entry and 5 successful HTTP 200 responses.
- **Acceptance Criteria**: Webhook processing is completely race-condition-proof; duplicate deliveries never cause duplicate ledger entries.
- **Risks & Rollback**: None. Resolves critical concurrency vulnerability.

---

### TASK-402: Paystack Gateway Fee & Net Settlement Split Accounting
- **Priority**: P1
- **Problem**: Paystack deducts a processing fee (e.g., 1.5% capped at ₦2,000), meaning net bank deposits do not match gross invoice credits.
- **Current Implementation**: Gross amount is credited directly to invoice; fee is unrecorded.
- **Proposed Change**: Capture Paystack fee from webhook payload (`data.fees`). Post the split in the general ledger:
  - **DEBIT**: `1020 - Bank Clearing Account` (Net amount arriving in bank)
  - **DEBIT**: `5010 - Gateway Processing Charges` (Expense deducted by Paystack)
  - **CREDIT**: `1200 - Student Accounts Receivable` (Gross invoice credit)
- **Files Affected**:
  - `src/controllers/paystackWebhookController.js`
  - `src/services/paymentService.js`
- **Dependencies**: TASK-303, TASK-401.
- **Implementation Steps**:
  1. Extract `data.fees` from Paystack `charge.success` payload.
  2. Update ledger posting call to record gateway fee expense.
- **Tests Required**:
  - Integration test: ₦100,000 payment with ₦1,500 fee posts ₦98,500 to clearing, ₦1,500 to expenses, and ₦100,000 to receivables.
- **Acceptance Criteria**: School bank balance reconciliation accounts for gateway transaction fees accurately.
- **Risks & Rollback**: Low risk. Handled within existing webhook transaction.

---

### TASK-403: Hardened Suspense Queue Allocation Engine
- **Priority**: P1
- **Problem**: `allocateSuspenseTransaction` in `paymentController.js:254-326` manually creates an invoice if none is open, hardcoding arbitrary amounts (`12000000` Kobo) and descriptions.
- **Current Implementation**:
  ```javascript
  if (!openInvoice) {
    openInvoice = await tx.invoice.create({
      data: { totalAmountKobo: 12000000, items: { create: [{ description: 'Tuition Fee', amountKobo: 12000000 }] } }
    }); // VULNERABILITY: Arbitrary unconfigured invoice creation
  }
  ```
- **Proposed Change**: Remove arbitrary invoice creation. Require the Bursar to allocate suspense funds to an existing open invoice or directly to the student's Advance Credit Wallet (`2100 - Prepaid Student Fees`).
- **Files Affected**:
  - `src/controllers/paymentController.js`
  - `src/services/paymentService.js`
- **Dependencies**: TASK-305.
- **Implementation Steps**:
  1. Refactor `allocateSuspenseTransaction` to use `PaymentAllocationService`.
  2. Post double-entry transfer: **DEBIT** `2050 - Suspense`, **CREDIT** `1200` (Receivable) or `2100` (Advance Credit).
- **Tests Required**:
  - Integration test: Allocating suspense payment to student without open invoice credits their Advance Credit Wallet cleanly without creating arbitrary invoices.
- **Acceptance Criteria**: Suspense funds can be transferred to open invoices or held as advance credit without synthetic invoice generation.
- **Risks & Rollback**: Bursars must issue valid invoices or use advance credit allocations.

---

## 7. Phase 5 — Background Processing & Asynchronous Jobs

```
Phase 5 Milestone: Non-Blocking External Operations & Managed Queues
Goal: Offload external API calls and large batch operations from the HTTP thread to BullMQ workers.
```

### TASK-501: Redis & BullMQ Infrastructure Setup
- **Priority**: P2
- **Problem**: Long-running operations execute synchronously on the Express HTTP event loop, risking connection timeouts during bulk student imports or mass invoicing.
- **Current Implementation**: Zero queue infrastructure; all processing is synchronous.
- **Proposed Change**: Set up BullMQ with Redis connection management (`src/config/redis.js`), worker supervisors, and queue factory modules.
- **Files Affected**:
  - `src/config/redis.js` (New)
  - `src/core/queue/queueFactory.js` (New)
  - `src/core/queue/workerRunner.js` (New)
  - `package.json`
- **Dependencies**: TASK-101.
- **Implementation Steps**:
  1. Add `ioredis` and `bullmq` dependencies.
  2. Implement Redis configuration with connection retry and health checks.
  3. Create worker runner script executable as an independent background process (`npm run worker`).
- **Tests Required**:
  - Unit test: Queue connects to Redis and processes a mock test job.
- **Acceptance Criteria**: Background workers run and process jobs independently of the Express web process.
- **Risks & Rollback**: Introduces Redis dependency. Ensure managed Redis (e.g., Upstash or containerized Redis) is configured before enabling workers.

---

### TASK-502: Asynchronous Paystack DVA Provisioning Worker
- **Priority**: P1
- **Problem**: `bulkCreateStudents` in `schoolController.js:278-294` executes sequential HTTP calls to Paystack during request execution. Importing 100 students takes over 90 seconds and causes HTTP timeouts.
- **Current Implementation**: Synchronous loop of `await createDedicatedVirtualAccount(...)` blocking the HTTP response.
- **Proposed Change**:
  1. `POST /api/schools/:schoolId/students/bulk` creates students in `PENDING_DVA` status immediately and returns `HTTP 202 Accepted { batchId }`.
  2. Enqueue individual DVA provisioning jobs to `dva-provision-queue`.
  3. BullMQ worker calls Paystack with exponential backoff (3 retries). Upon receiving DVA, worker updates student to `ACTIVE` and creates `VirtualAccount` record.
- **Files Affected**:
  - `src/modules/billing/jobs/dvaProvisionWorker.js` (New)
  - `src/controllers/schoolController.js`
  - `src/services/paystackService.js`
- **Dependencies**: TASK-501, TASK-204.
- **Implementation Steps**:
  1. Create `dvaProvisionWorker.js`.
  2. Refactor `bulkCreateStudents` to push jobs to queue and return immediate response.
- **Tests Required**:
  - Integration test: Bulk import of 50 students returns HTTP 202 within 500ms; background worker successfully provisions DVAs.
- **Acceptance Criteria**: Bulk student registration never blocks the HTTP server or exceeds standard 5-second request timeouts.
- **Risks & Rollback**: Frontend must support polling or status display for pending DVAs.

---

### TASK-503: Chunked Asynchronous Mass Invoicing Worker
- **Priority**: P2
- **Problem**: `generateMassTermInvoices` creates invoices for an entire school in a single database transaction. In large schools (1,000+ students), this risks transaction timeout (`timeout: 30000`).
- **Current Implementation**: Monolithic `for (const student of toBill)` loop inside one Prisma transaction.
- **Proposed Change**: Move mass invoicing to a background job:
  1. Divide eligible student list into chunks of 100.
  2. Process each chunk in an independent database transaction.
  3. Post progress updates to job state.
- **Files Affected**:
  - `src/modules/billing/jobs/massInvoiceWorker.js` (New)
  - `src/controllers/feeScheduleController.js`
- **Dependencies**: TASK-501, TASK-304.
- **Implementation Steps**:
  1. Implement chunked worker logic.
  2. Update `generateMassTermInvoices` to dispatch job and return job tracking ID.
- **Tests Required**:
  - Integration test: Mass billing 500 students processes in 5 independent chunks without transaction timeouts.
- **Acceptance Criteria**: Mass invoicing completes reliably without holding database locks for more than 2 seconds per batch.
- **Risks & Rollback**: Low risk. Handled by BullMQ failure/retry mechanisms.

---

## 8. Phase 6 — Production Readiness, Performance & Observability

```
Phase 6 Milestone: High-Throughput Scaling, Operational Visibility & Graceful Lifecycle
Goal: Add database indexes, graceful shutdown handling, and automated health checks.
```

### TASK-601: Missing Database B-Tree Index Deployment
- **Priority**: P0 (Performance)
- **Problem**: PostgreSQL foreign keys lack automatic B-Tree indexes, causing sequential table scans on `schoolId` and `studentId` lookups as tables grow.
- **Current Implementation**: No explicit indexes on foreign keys in `prisma/schema.prisma`.
- **Proposed Change**: Deploy migration adding compound and single-column indexes:
  - `Student`: `@@index([schoolId])`
  - `Invoice`: `@@index([schoolId, status])`, `@@index([studentId])`
  - `Payment`: `@@index([invoiceId])`, `@@index([cashHandoverId])`
  - `CashHandover`: `@@index([schoolId, status])`
  - `SuspenseTransaction`: `@@index([schoolId, status])`
- **Files Affected**:
  - `prisma/schema.prisma`
  - `prisma/migrations/*_add_performance_indexes/migration.sql` (New)
- **Dependencies**: TASK-301.
- **Implementation Steps**:
  1. Add index annotations to `schema.prisma`.
  2. Deploy migration to PostgreSQL.
- **Tests Required**:
  - Query analysis test: Verify `EXPLAIN ANALYZE` on invoice queries uses Index Scans instead of Seq Scans.
- **Acceptance Criteria**: All tenant-scoped list queries use backing B-Tree indexes.
- **Risks & Rollback**: Safe, non-breaking additive migration.

---

### TASK-602: Process Signal Handling & Graceful Shutdown
- **Priority**: P1
- **Problem**: Deployments and server restarts terminate in-flight requests abruptly, risking database transaction corruption.
- **Current Implementation**: `app.listen` runs without `SIGTERM` or `SIGINT` lifecycle handling.
- **Proposed Change**: Implement graceful shutdown in `server.js`:
  1. Intercept `SIGTERM` and `SIGINT`.
  2. Stop accepting new HTTP requests.
  3. Allow active requests a 10-second grace period.
  4. Disconnect Prisma pool and Redis clients cleanly.
  5. Exit process with code 0.
- **Files Affected**:
  - `src/server.js`
- **Dependencies**: TASK-004.
- **Implementation Steps**:
  1. Attach POSIX signal listeners to HTTP server instance.
  2. Coordinate cleanup across database and queue connections.
- **Tests Required**:
  - Integration test: Sending `SIGTERM` allows in-flight request to finish before process termination.
- **Acceptance Criteria**: Zero dropped requests during production container restarts or deployments.
- **Risks & Rollback**: Low risk. Standard Node.js operational pattern.

---

### TASK-603: Automated Backup, Point-in-Time Recovery & Security Review
- **Priority**: P1
- **Problem**: No documented disaster recovery runbook or automated snapshot verification exists for the PostgreSQL ledger.
- **Current Implementation**: Dependent on host provider defaults without verification scripts.
- **Proposed Change**: Document backup procedures (WAL archiving, daily pg_dump, Point-in-Time Recovery verification) and execute a production security audit checklist.
- **Files Affected**:
  - `docs/DISASTER_RECOVERY.md` (New)
  - `docs/SECURITY_CHECKLIST.md` (New)
- **Dependencies**: TASK-308, TASK-601.
- **Implementation Steps**:
  1. Document automated daily database backup procedures.
  2. Execute restore rehearsal on a staging database.
  3. Verify security configurations across headers (Helmet), CORS, and environment secrets.
- **Tests Required**:
  - Disaster recovery dry run: Restore database snapshot and verify trial balance integrity via `TASK-308`.
- **Acceptance Criteria**: Database recovery verified with documented RPO (< 1 hour) and RTO (< 30 minutes).
- **Risks & Rollback**: Procedural; no runtime impact.

---

## 9. Dependency Graph & Task Classification Matrix

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   TASK DEPENDENCY GRAPH                                │
│                                                                                        │
│     [TASK-001: Arch Alignment] ──► [TASK-002: API Contracts] ──► [TASK-003: States]    │
│                 │                                                                      │
│                 ▼                                                                      │
│     [TASK-004: Vitest Setup]                                                           │
│                 │                                                                      │
│                 ├───────────────────────────────┬───────────────────────────────┐      │
│                 ▼                               ▼                               ▼      │
│     [TASK-101: JWT Fallback]        [TASK-201: Error Handling]      [TASK-601: Indexes] │
│                 │                               │                                      │
│        ┌────────┴────────┐                      ▼                                      │
│        ▼                 ▼          [TASK-202: Zod Validation]                         │
│  [TASK-102: Tenant] [TASK-103: Auth]            │                                      │
│        │                                        ▼                                      │
│        ▼                            [TASK-204: Service Decoupling]                     │
│  [TASK-301: Ledger Schema]                      │                                      │
│        │                                        ▼                                      │
│        ▼                            [TASK-501: Redis / BullMQ]                         │
│  [TASK-302: Chart of Accounts]                  │                                      │
│        │                                        ├───────────────────────┐              │
│        ▼                                        ▼                       ▼              │
│  [TASK-303: Journal Engine]         [TASK-502: DVA Worker]  [TASK-503: Mass Inv Worker]│
│        │                                                                               │
│        ├────────────────────────────────┬───────────────────────────────┐              │
│        ▼                                ▼                               ▼              │
│  [TASK-304: Invoicing Journal]  [TASK-305: Payment Alloc]      [TASK-401: Idempotency] │
│        │                                │                               │              │
│        ▼                                ├───────────────────────────────┤              │
│  [TASK-306: Advance Credit]             ▼                               ▼              │
│        │                          [TASK-402: Paystack Fees]    [TASK-403: Suspense]    │
│        ▼                                                                               │
│  [TASK-307: Ledger Backfill] ──► [TASK-308: Trial Balance] ──► [TASK-603: DR Audit]   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Complete Task Classification Matrix

| Task ID | Title | Priority | Phase | Estimated Complexity | Dependencies |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **TASK-001** | Architecture & Financial Alignment | **P0** | Phase 0 | Low | None |
| **TASK-002** | API Contract Documentation | **P1** | Phase 0 | Medium | TASK-001 |
| **TASK-003** | Business Logic & State Mapping | **P1** | Phase 0 | Low | TASK-002 |
| **TASK-004** | Automated Test Harness Setup | **P0** | Phase 0 | Medium | None |
| **TASK-101** | Insecure JWT Secret Remediation | **P0** | Phase 1 | Low | TASK-004 |
| **TASK-102** | Multi-Tenant Bypass Remediation | **P0** | Phase 1 | Medium | TASK-004, TASK-101 |
| **TASK-103** | Short-Lived Tokens & Revocation | **P1** | Phase 1 | Medium | TASK-101 |
| **TASK-104** | Production CORS Hardening | **P1** | Phase 1 | Low | TASK-101 |
| **TASK-105** | Parent Portal Anti-Scraping | **P1** | Phase 1 | Medium | TASK-004 |
| **TASK-201** | Centralized Error Hierarchy | **P1** | Phase 2 | Medium | TASK-004 |
| **TASK-202** | Zod Request Validation Pipeline | **P1** | Phase 2 | Medium | TASK-201 |
| **TASK-203** | Structured Logging (Pino) | **P2** | Phase 2 | Low | TASK-004 |
| **TASK-204** | Controller-to-Service Decoupling | **P1** | Phase 2 | High | TASK-201, TASK-202 |
| **TASK-205** | Standardized Cursored Pagination| **P2** | Phase 2 | Medium | TASK-204 |
| **TASK-301** | Double-Entry Schema Migration | **P0** | Phase 3 | Medium | TASK-001, TASK-004 |
| **TASK-302** | Chart of Accounts Provisioning | **P0** | Phase 3 | Low | TASK-301 |
| **TASK-303** | Core Journal Posting Engine | **P0** | Phase 3 | High | TASK-301, TASK-302 |
| **TASK-304** | Invoice Issuance Journal | **P0** | Phase 3 | Medium | TASK-303 |
| **TASK-305** | Payment Allocation Engine | **P0** | Phase 3 | High | TASK-303, TASK-304 |
| **TASK-306** | Advance Credit Auto-Application | **P1** | Phase 3 | Medium | TASK-305 |
| **TASK-307** | Historical Ledger Backfill | **P1** | Phase 3 | High | TASK-303, TASK-305 |
| **TASK-308** | Automated Trial Balance Verification | **P1** | Phase 3 | Medium | TASK-303, TASK-307 |
| **TASK-401** | Atomic Webhook Idempotency Lock | **P0** | Phase 4 | Medium | TASK-301 |
| **TASK-402** | Paystack Gateway Fee Accounting | **P1** | Phase 4 | Medium | TASK-303, TASK-401 |
| **TASK-403** | Hardened Suspense Allocation | **P1** | Phase 4 | Medium | TASK-305 |
| **TASK-501** | Redis & BullMQ Infrastructure | **P2** | Phase 5 | Medium | TASK-101 |
| **TASK-502** | Async Paystack DVA Worker | **P1** | Phase 5 | High | TASK-501, TASK-204 |
| **TASK-503** | Chunked Mass Invoicing Worker | **P2** | Phase 5 | Medium | TASK-501, TASK-304 |
| **TASK-601** | B-Tree Performance Indexes | **P0** | Phase 6 | Low | TASK-301 |
| **TASK-602** | Process Lifecycle Graceful Shutdown| **P1** | Phase 6 | Low | TASK-004 |
| **TASK-603** | Disaster Recovery & Security Review| **P1** | Phase 6 | Medium | TASK-308, TASK-601 |

---

## 10. Critical Path & Recommended Execution Sequence

The critical path represents the mandatory, sequential chain of dependent tasks required to secure the platform and establish financial ledger integrity:

```
[TASK-004: Vitest Harness]
         │
         ▼
[TASK-101: JWT Fallback Remediation]
         │
         ▼
[TASK-102: Multi-Tenant Authorization Bypass Remediation]
         │
         ▼
[TASK-301: Double-Entry Schema Migration]
         │
         ▼
[TASK-302: Chart of Accounts Provisioning]
         │
         ▼
[TASK-303: Core Journal Posting Engine]
         │
         ▼
[TASK-304: Invoice Issuance Journal]
         │
         ▼
[TASK-305: Payment Allocation Engine & Dual-Write]
         │
         ▼
[TASK-401: Atomic Webhook Idempotency Lock]
         │
         ▼
[TASK-307: Historical Ledger Backfill]
         │
         ▼
[TASK-308: Trial Balance Verification Engine]
```

### Execution Directives
1. **Never implement Phase 3 (Ledger) before Phase 1 (Tenant Security)**: Building ledger logic on an insecure tenant model risks cross-school financial leakage.
2. **Never backfill historical records (TASK-307) before allocation logic (TASK-305) is finalized and tested**.
3. **Queue infrastructure (Phase 5) should run in parallel or after ledger stabilization**, preventing asynchronous concurrency from masking financial calculation bugs.

---

## 11. Definition of Done (DoD)

A task is considered complete and ready for production deployment **only** when all the following criteria are met:

1. **Code Completeness**:
   - Implementation matches the specifications in `BACKEND_ARCHITECTURE.md` and `FINANCIAL_DOMAIN_DESIGN.md`.
   - Adheres to standard Express/Node.js ESM patterns without introducing circular dependencies.
2. **Testing Standards**:
   - Automated unit tests cover all new service logic, calculation branches, and boundary conditions.
   - Integration tests cover all modified HTTP routes, verifying both success (2xx) and failure (4xx/5xx) statuses.
   - All tests pass locally and in CI/CD pipeline with zero flakes.
3. **Financial Invariants (for Phase 3 & 4 tasks)**:
   - All monetary values are strictly positive integers in Kobo (`Int` or `BigInt`).
   - Every journal entry balances: $\sum \text{Debits} - \sum \text{Credits} \equiv 0$.
   - No negative postings exist in `LedgerPosting`.
4. **Security & Multi-Tenancy**:
   - Explicit tenant verification (`schoolId`) enforced on every database query.
   - Inputs validated via declarative Zod schemas.
   - Sensitive credentials masked in all log outputs.
5. **Documentation & Operational Runbooks**:
   - API contract changes documented and communicated.
   - Environment variable changes updated in `.env.example`.

---

## 12. Suggested Delivery Milestones

```
Milestone 1: The Hardened Core (Weeks 1 - 2)
  Deliverables: TASK-001 through TASK-105.
  Outcome: Automated test harness active; JWT and tenant bypass vulnerabilities eliminated; CORS hardened.

Milestone 2: Structured Architecture (Weeks 3 - 4)
  Deliverables: TASK-201 through TASK-205.
  Outcome: Clean Controller-Service separation; Zod validation on all inputs; structured Pino logging active.

Milestone 3: The Immutable Ledger (Weeks 5 - 7)
  Deliverables: TASK-301 through TASK-308.
  Outcome: Double-entry general ledger active; payment allocations verified; historical data backfilled; trial balance checks passing.

Milestone 4: Payment Concurrency & Gateway Accounting (Weeks 8 - 9)
  Deliverables: TASK-401 through TASK-403.
  Outcome: Atomic webhook idempotency eliminates TOCTOU races; Paystack fees accounted for; suspense queue hardened.

Milestone 5: Asynchronous Workers & Scaling (Weeks 10 - 11)
  Deliverables: TASK-501 through TASK-503.
  Outcome: BullMQ queues offload Paystack DVA calls and mass billing; non-blocking HTTP endpoints.

Milestone 6: Production Launch Readiness (Week 12)
  Deliverables: TASK-601 through TASK-603.
  Outcome: Database indexed; graceful shutdown enabled; disaster recovery rehearsal completed.
```

---

## 13. Explicit Non-Goals (Features NOT to Build Yet)

To prevent scope creep, maintain focus on financial correctness, and avoid premature optimization, the following capabilities are **explicitly deferred**:

1. **Microservices Architecture**:
   - *Rationale*: Microservices introduce distributed transaction coordination (Sagas/Two-Phase Commits) that needlessly complicate double-entry ledger consistency at this stage. BursarOS remains a modular monolith.
2. **Multi-Currency Support**:
   - *Rationale*: BursarOS is designed specifically for Nigerian private schools operating in Naira ($\text{NGN}$). Foreign exchange revaluation and multi-currency ledgers add significant complexity with minimal immediate value.
3. **Payroll & Staff Salary Disbursement**:
   - *Rationale*: School payroll involves tax withholding (PAYE), pension deductions, and automated bank disbursement APIs. The immediate priority is student tuition revenue collection, fee reconciliation, and cash custody.
4. **Custom Dynamic Chart of Accounts Builder**:
   - *Rationale*: Allowing schools to design custom accounting trees creates non-standardized financial data and increases support overhead. All tenants use the standardized BursarOS Chart of Accounts.
5. **GraphQL API Layer**:
   - *Rationale*: Standard REST with Zod schema validation satisfies all frontend and mobile client requirements without introducing GraphQL query complexity or N+1 execution risks.
6. **Complex In-App Notification Hub**:
   - *Rationale*: WebSocket-based in-app notification centers add stateful infrastructure overhead. Simple HTTP polling or basic email/SMS triggers are sufficient for current operational alerts.

