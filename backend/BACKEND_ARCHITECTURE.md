# BursarOS: Target Backend Architecture Specification

**Document Version:** 1.0.0  
**Status:** Architecture Blueprint / Target State  
**Technology Stack:** Node.js, Express.js (ES Modules), PostgreSQL, Prisma ORM, Paystack  

---

## Table of Contents
1. [System Overview](#1-system-overview)
2. [Architectural Principles](#2-architectural-principles)
3. [Proposed Modular Monolith Architecture](#3-proposed-modular-monolith-architecture)
4. [Proposed Directory Structure](#4-proposed-directory-structure)
5. [Module Responsibilities & Domain Boundaries](#5-module-responsibilities--domain-boundaries)
6. [Layering: Controller, Service, and Repository Responsibilities](#6-layering-controller-service-and-repository-responsibilities)
7. [Database Access Strategy & Transaction Management](#7-database-access-strategy--transaction-management)
8. [Authentication and Authorisation Architecture](#8-authentication-and-authorisation-architecture)
9. [Multi-Tenant Isolation Strategy](#9-multi-tenant-isolation-strategy)
10. [Payment Processing Architecture](#10-payment-processing-architecture)
11. [Financial Ledger Integration Architecture](#11-financial-ledger-integration-architecture)
12. [Background Job Processing Architecture](#12-background-job-processing-architecture)
13. [Error Handling Strategy](#13-error-handling-strategy)
14. [Validation Strategy](#14-validation-strategy)
15. [Logging and Observability](#15-logging-and-observability)
16. [Testing Architecture](#16-testing-architecture)
17. [Security Considerations](#17-security-considerations)
18. [Deployment Architecture](#18-deployment-architecture)
19. [Architectural Decisions & Trade-off Matrix](#19-architectural-decisions--trade-off-matrix)
20. [Incremental Migration Strategy](#20-incremental-migration-strategy)

---

## 1. System Overview

BursarOS is a multi-tenant financial management and payment reconciliation platform engineered specifically for Nigerian private schools. The core operational problem it solves is eliminating manual cash and bank transfer reconciliation bottlenecks, unrecorded cash theft, and opaque student debt records in educational institutions.

### Existing System State
- Single monolithic Express app where routes delegate immediately to fat controllers (`authController.js`, `paymentController.js`, `schoolController.js`, `cashDrawerController.js`, `feeScheduleController.js`, `invoiceController.js`, `parentPortalController.js`).
- Database queries, HTTP parsing, validation, and domain math are blended directly into controller handlers using `prisma.*` calls.
- Webhooks and counter-cash inputs mutate single integer balance columns directly on an `Invoice` model without a journal or ledger trail.
- Multi-tenancy relies on manual controller-level comparisons (`req.user.schoolId !== targetSchoolId`) and inconsistent route definitions.
- Background asynchronous queues and automated testing suites do not exist.

### Target System State
A **Modular Monolith** organized into strictly separated vertical domain slices (`Identity`, `Tenancy`, `Billing`, `Payments`, `Ledger`, `Custody`, `Portal`), backed by horizontal infrastructure layers (Prisma Data Access, Transaction Orchestrator, Event/Job Queue, Structured Observability). Financial transactions mutate balances exclusively through a double-entry, append-only ledger journal. Multi-tenant boundaries are enforced at the data layer through Prisma Client extensions.

---

## 2. Architectural Principles

1. **Financial Correctness Over Convenience**:
   No balance is ever overwritten by raw addition or subtraction (`balance += amount`). Balances must be mathematical derivatives of an append-only sequence of immutable ledger entries.
2. **Defensive Multi-Tenancy**:
   Tenant data isolation must be enforced systematically by the data access layer, not left to the vigilance of individual software engineers writing controller queries.
3. **Strict Layering and Unidirectional Dependencies**:
   Controllers depend on Services. Services depend on Repositories and other Services. Repositories depend on Prisma. Lower layers never depend on upper layers, and domain entities do not depend on HTTP transport constructs (`req`, `res`).
4. **Idempotent by Default**:
   Every monetary mutation, webhook intake, and background job must be idempotent. Repeating an identical network request must yield the identical state without secondary financial effects.
5. **Pragmatic Simplicity (No Microservices Prematurely)**:
   Retain a single deployable artifact and unified PostgreSQL database. Enforce modularity via code organization, module boundary boundaries, and internal interfaces, avoiding distributed network latency, two-phase commits, and operational fragmentation.

---

## 3. Proposed Modular Monolith Architecture

The target architecture transitions BursarOS from a script-style monolithic controller collection into a structured modular monolith.

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       HTTP TRANSPORT / INGRESS                                        │
│               [Express App] ──► Global Middleware (CORS, Request ID, Pino, Rate Limiter)             │
└───────────────────────────────────────────────────┬───────────────────────────────────────────────────┘
                                                    │
                                                    ▼
┌───────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       ROUTING & VALIDATION TIER                                       │
│          /api/v1/auth    /api/v1/schools    /api/v1/invoices    /api/v1/payments    /api/v1/portal     │
│                 │               │                  │                   │                  │           │
│                 ▼               ▼                  ▼                   ▼                  ▼           │
│           [Zod Schema]    [Zod Schema]       [Zod Schema]        [Zod Schema]       [Zod Schema]      │
│                 │               │                  │                   │                  │           │
│                 ▼               ▼                  ▼                   ▼                  ▼           │
│           [Controllers]   [Controllers]      [Controllers]       [Controllers]      [Controllers]     │
└───────────────────────────────────────────────────┬───────────────────────────────────────────────────┘
                                                    │
                                                    ▼
┌───────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                         DOMAIN SERVICES TIER                                          │
│  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────┐  ┌────────────────┐  ┌─────────────┐  │
│  │ IdentityService │  │  TenancyService  │  │ BillingService  │  │ PaymentService │  │ LedgerEngine│  │
│  └────────┬────────┘  └────────┬─────────┘  └────────┬────────┘  └───────┬────────┘  └──────┬──────┘  │
│           │                    │                     │                   │                  │         │
│           └────────────────────┼─────────────────────┼───────────────────┼──────────────────┘         │
│                                │                     ▼                   │                            │
│                                │             ┌───────────────┐           │                            │
│                                └────────────►│ Domain Events │◄──────────┘                            │
│                                              └───────┬───────┘                                        │
└──────────────────────────────────────────────────────┼────────────────────────────────────────────────┘
                                                       │
                     ┌─────────────────────────────────┴────────────────────────────────┐
                     ▼                                                                  ▼
┌──────────────────────────────────────────────┐              ┌─────────────────────────────────────────┐
│           REPOSITORIES / DATA ACCESS         │              │        BACKGROUND ASYNC WORKERS         │
│  - TenancyRepository   - BillingRepository   │              │  - Paystack DVA Worker (BullMQ)         │
│  - PaymentRepository   - LedgerRepository    │              │  - Mass Invoice Generator Job           │
│  ──────────────────────────────────────────  │              │  - Webhook Event Dispatcher             │
│  Prisma Client with Tenant-Scoping Extension │              │  - Settlement Reconciliation Worker     │
└──────────────────────┬───────────────────────┘              └────────────────────┬────────────────────┘
                       │                                                           │
                       ▼                                                           ▼
┌───────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                      PERSISTENCE & INFRASTRUCTURE                                     │
│               [PostgreSQL Database (Neon / Managed)]               [Redis (BullMQ & Cache)]           │
└───────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Proposed Directory Structure

```
backend/
├── src/
│   ├── app.js                          # Express application factory & middleware pipeline
│   ├── server.js                       # HTTP server bootstrapping, port binding & graceful shutdown
│   ├── config/                         # Typed, schema-validated environment configuration
│   │   ├── env.js                      # Environment parser (validates process.env via Zod)
│   │   ├── db.js                       # PrismaClient singleton with global connection configuration
│   │   └── redis.js                    # Redis connection client for queues and rate-limiting
│   │
│   ├── core/                           # Cross-cutting foundational infrastructure
│   │   ├── errors/                     # Structured domain exception hierarchy
│   │   │   ├── AppError.js             # Base application error
│   │   │   ├── NotFoundError.js        # 404 Entity missing
│   │   │   ├── UnauthorizedError.js    # 401 Authentication failure
│   │   │   ├── ForbiddenError.js       # 403 Multi-tenant / RBAC violation
│   │   │   ├── ConflictError.js        # 409 Concurrency / duplicate violation
│   │   │   └── ValidationError.js     # 422 Payload schema mismatch
│   │   ├── middleware/                 # Shared Express middlewares
│   │   │   ├── authenticate.js         # JWT extraction & signature verification
│   │   │   ├── requireRole.js          # Role-Based Access Control gate
│   │   │   ├── tenantContext.js        # School tenant resolution and context binding
│   │   │   ├── validateRequest.js      # Zod request validation wrapper
│   │   │   ├── rateLimiter.js          # Distributed Redis-backed rate limiter
│   │   │   └── errorHandler.js         # Centralized HTTP error handler & formatter
│   │   ├── logging/                    # Observability & structured logging
│   │   │   └── logger.js               # Pino logger instance configured with correlation IDs
│   │   ├── queue/                      # Asynchronous queue system
│   │   │   ├── queueFactory.js         # BullMQ queue instantiator
│   │   │   └── workerRunner.js         # Worker registration and supervisor process
│   │   └── database/                   # Database enhancements
│   │       ├── transactionManager.js   # Unit of Work / interactive transaction runner
│   │       └── tenantExtension.js      # Prisma extension enforcing row-level school isolation
│   │
│   ├── modules/                        # Vertical Domain Slices (Modular Monolith)
│   │   ├── identity/                   # User authentication, staff profiles, password management
│   │   │   ├── identity.routes.js
│   │   │   ├── identity.controller.js
│   │   │   ├── identity.service.js
│   │   │   ├── identity.repository.js
│   │   │   └── identity.schemas.js
│   │   │
│   │   ├── tenancy/                    # School accounts, logos, terms, sessions, payout settings
│   │   │   ├── tenancy.routes.js
│   │   │   ├── tenancy.controller.js
│   │   │   ├── tenancy.service.js
│   │   │   ├── tenancy.repository.js
│   │   │   └── tenancy.schemas.js
│   │   │
│   │   ├── billing/                    # Students, Fee Schedules, Invoices, Line Items
│   │   │   ├── billing.routes.js
│   │   │   ├── billing.controller.js
│   │   │   ├── billing.service.js
│   │   │   ├── billing.repository.js
│   │   │   ├── billing.schemas.js
│   │   │   └── jobs/                   # Background jobs for billing domain
│   │   │       └── massInvoiceWorker.js
│   │   │
│   │   ├── payments/                   # Counter Cash, Webhooks, Paystack API, Suspense Queue
│   │   │   ├── payments.routes.js
│   │   │   ├── payments.controller.js
│   │   │   ├── payments.service.js
│   │   │   ├── payments.repository.js
│   │   │   ├── payments.schemas.js
│   │   │   ├── providers/              # External payment gateway abstraction
│   │   │   │   ├── IPaymentGateway.js  # Provider contract interface
│   │   │   │   ├── paystackGateway.js  # Live Paystack API implementation
│   │   │   │   └── mockGateway.js      # Local/CI sandbox gateway
│   │   │   └── jobs/
│   │   │       ├── dvaProvisionWorker.js
│   │   │       └── webhookProcessWorker.js
│   │   │
│   │   ├── ledger/                     # Double-entry ledger, accounts, journals, balances
│   │   │   ├── ledger.service.js       # Journal posting engine (no direct external routes)
│   │   │   ├── ledger.repository.js    # Immutable append-only ledger queries
│   │   │   └── ledger.constants.js     # Standardized Chart of Accounts (Assets, Revenue, Liabilities)
│   │   │
│   │   ├── custody/                    # Cash drawer closeouts, maker-checker handover verification
│   │   │   ├── custody.routes.js
│   │   │   ├── custody.controller.js
│   │   │   ├── custody.service.js
│   │   │   ├── custody.repository.js
│   │   │   └── custody.schemas.js
│   │   │
│   │   └── portal/                     # Public, privacy-masked parent student/fee lookup
│   │       ├── portal.routes.js
│   │       ├── portal.controller.js
│   │       ├── portal.service.js
│   │       └── portal.schemas.js
│   │
│   └── routes.js                       # Root API router assembling all domain modules under /api/v1
│
├── prisma/
│   ├── schema.prisma                   # PostgreSQL database schema & relations
│   ├── migrations/                     # Sequential SQL migration versions
│   └── seed.js                         # Development and test seed script
│
├── tests/
│   ├── setup.js                        # Test environment initialization
│   ├── unit/                           # Isolated business logic unit tests
│   ├── integration/                    # HTTP route & database integration tests
│   └── fixtures/                       # Synthetic tenant, invoice, and webhook fixtures
│
├── .env.example                        # Template for environment configuration
├── package.json                        # Scripts and dependencies
└── README.md                           # Operational and architecture runbook
```

---

## 5. Module Responsibilities & Domain Boundaries

To prevent coupling where modules make uncontrolled mutations to each other's database records, modules must respect strict domain boundaries.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              MODULE DEPENDENCY GRAPH                                   │
│                                                                                        │
│                                 ┌──────────────┐                                       │
│                                 │   Tenancy    │◄────────────────────────┐             │
│                                 └──────┬───────┘                         │             │
│                                        │                                 │             │
│                         ┌──────────────┴──────────────┐                  │             │
│                         ▼                             ▼                  │             │
│                  ┌──────────────┐              ┌──────────────┐          │             │
│                  │   Identity   │              │   Billing    │          │             │
│                  └──────────────┘              └──────┬───────┘          │             │
│                                                       │                  │             │
│                                        ┌──────────────┴──────────────┐   │             │
│                                        ▼                             ▼   │             │
│                                 ┌──────────────┐              ┌──────────┴───┐         │
│                                 │   Custody    │              │   Payments   │         │
│                                 └──────────────┘              └──────┬───────┘         │
│                                                                      │                 │
│                                                                      ▼                 │
│                                                               ┌──────────────┐         │
│                                                               │    Ledger    │         │
│                                                               └──────────────┘         │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Module Boundary Specifications

| Module | Core Responsibility | Data Models Owned | Disallowed Behaviors |
| :--- | :--- | :--- | :--- |
| **Identity** | Authentication, password hashing, JWT creation/revocation, staff identity. | `Staff` | Must not query or mutate student invoices or payment records. |
| **Tenancy** | School organization profiles, academic term/session calendars, payout bank details. | `School` | Must not manage payment processing or ledger journals. |
| **Billing** | Student roster records, fee structures, invoice generation, line items. | `Student`, `FeeSchedule`, `FeeScheduleItem`, `Invoice`, `InvoiceItem` | Must not directly mark invoices as paid; must listen for or call `PaymentService`/`LedgerService`. |
| **Payments** | Payment ingest (Cash counter & Paystack DVA/Card), DVA provisioning, Suspense parking. | `Payment`, `VirtualAccount`, `SuspenseTransaction`, `ProcessedWebhook` | Must not directly update `Invoice.amountPaidKobo`; updates must proceed through ledger postings. |
| **Ledger** | Double-entry accounting engine, journal entries, debit/credit postings, financial auditing. | `LedgerAccount`, `JournalEntry`, `LedgerPosting` | Internal engine. No direct public HTTP routes. Only callable by trusted domain services. |
| **Custody** | Dual-control (Maker-Checker) physical cash handling, closeouts, and proprietor verification. | `CashHandover` | Must not process digital card or DVA bank transfers. |
| **Portal** | Public parent self-service lookup, privacy masking, read-only fee balance inquiry. | None (Read-only facade over Billing/Payments) | Must not execute write mutations or expose staff or parent contact info unmasked. |

---

## 6. Layering: Controller, Service, and Repository Responsibilities

```
[ HTTP Request: JSON ]
         │
         ▼
┌──────────────────┐
│    Controller    │  1. Unpacks HTTP request (params, query, body)
└────────┬─────────┘  2. Delegates parsing/validation to Zod schemas
         │            3. Passes clean DTOs into Domain Service
         │            4. Maps Service result or Error to HTTP status & JSON response
         ▼
┌──────────────────┐
│     Service      │  1. Contains pure business logic and financial calculations
└────────┬─────────┘  2. Enforces RBAC permissions and tenant ownership constraints
         │            3. Coordinates multi-model mutations via Unit-of-Work transactions
         │            4. Emits domain events and queues background tasks
         ▼
┌──────────────────┐
│    Repository    │  1. Exclusively executes Prisma ORM database queries
└────────┬─────────┘  2. Isolates raw SQL/Prisma syntax from business logic
         │            3. Enforces tenant scope parameters on every read and write
         ▼
[ PostgreSQL Engine ]
```

### 1. Controller Layer Contract
- **Allowed**:
  - Read `req.params`, `req.query`, `req.body`, `req.user`.
  - Execute schema validation.
  - Call domain service methods.
  - Return `res.status(code).json({ success: true, data })`.
- **Forbidden**:
  - No database queries (`prisma.*` is strictly forbidden in controllers).
  - No financial arithmetic (calculating totals, subtracting balances).
  - No third-party network calls (no `axios`, no Paystack API calls).

### 2. Service Layer Contract
- **Allowed**:
  - Accept and return plain JavaScript DTOs (Data Transfer Objects).
  - Enforce business invariants (e.g., "Cannot close an empty drawer", "Invoice cannot be refunded beyond amount collected").
  - Coordinate multiple repositories inside an interactive transaction.
  - Dispatch asynchronous background jobs via BullMQ.
- **Forbidden**:
  - No access to Express `req` or `res` objects.
  - No direct SQL queries (must delegate to Repositories).

### 3. Repository Layer Contract
- **Allowed**:
  - Run Prisma operations (`findMany`, `create`, `update`, `aggregate`).
  - Receive an optional transaction client (`tx`) to participate in parent transactions.
  - Accept strongly typed search criteria and projection options.
- **Forbidden**:
  - No business policy decisions.
  - No HTTP or transport concerns.

---

## 7. Database Access Strategy & Transaction Management

### Connection Pooling & Client Lifecycle
In accordance with `src/config/db.js`, the application connects to PostgreSQL (Neon serverless or managed container) via connection pooling.
- **Prisma Client Lifecycle**: Single cached instance throughout the process lifecycle.
- **Transaction Timeouts**:
  - Set `maxWait: 5000` (max time to wait for a database connection from pool: 5s).
  - Set `timeout: 10000` (max transaction execution duration: 10s).
- **Prohibition on Long-Running Transactions**:
  External HTTP calls (e.g., calling Paystack API) are **strictly forbidden** inside an interactive Prisma `$transaction`. Network latency will hold database locks, exhaust connection pools, and trigger transaction timeouts. External calls must occur *before* or *after* the transaction, or run in background workers.

### Interactive Transaction Orchestrator (Unit of Work)
Complex financial operations (e.g., Webhook Payment Reconciliation, Cash Closeout Confirmation, Suspense Allocation) require atomic execution across multiple repositories.

```javascript
// Target implementation pattern: src/core/database/transactionManager.js
export const runInTransaction = async (callback) => {
  return await prisma.$transaction(async (tx) => {
    return await callback(tx);
  }, {
    maxWait: 5000,
    timeout: 10000
  });
};
```
Every repository method accepts an optional `tx` argument. When passed, queries execute within the caller's transaction context; otherwise, they fall back to the default `prisma` instance:
```javascript
// Example Repository pattern
export class InvoiceRepository {
  async findById(invoiceId, schoolId, tx = prisma) {
    return await tx.invoice.findFirst({
      where: { id: invoiceId, schoolId }
    });
  }
}
```

---

## 8. Authentication and Authorisation Architecture

### Authentication Mechanism
1. **JWT Strategy**:
   - Access tokens signed using `HS256` with strict entropy verification.
   - Access token lifetime shortened from 7 days to **15 minutes**.
   - Issue cryptographically random **Refresh Tokens** stored in a PostgreSQL `RefreshToken` table with revocation tracking, IP origin, and expiration timestamps (7 days).
2. **Environment Secret Protection**:
   - The application bootstrap (`src/config/env.js`) halts immediately if `process.env.JWT_SECRET` is undefined, under 32 characters, or set to the default placeholder.
3. **Password Security**:
   - Hashing maintained via `bcryptjs` with a work factor of 12.

### Authorisation Strategy (Dual-Key RBAC & Tenant Verification)
Authorisation requires meeting two criteria simultaneously:
1. **Tenant Context Match**: The authenticated user's `schoolId` must match the target resource's `schoolId`.
2. **Role Capability Match**: The user's role must be authorized for the specific endpoint action.

```
Incoming Request ──► [ authenticate ] ──► Validates JWT Signature & Revocation
                            │
                            ▼
                     [ tenantContext ] ──► Resolves schoolId from URL/Resource
                            │             Guarantees req.user.schoolId === resource.schoolId
                            ▼
                     [ requireRole ]   ──► Evaluates Role Matrix (PROPRIETOR, BURSAR, etc.)
                            │
                            ▼
                     [ Controller Handler ]
```

### Role Capabilities Matrix

| Endpoint Capability | PROPRIETOR | BURSAR | ACCOUNTANT | VIEWER |
| :--- | :---: | :---: | :---: | :---: |
| Self-Service School Setup | **Yes** | No | No | No |
| Connect / Change Settlement Payout Bank | **Yes** | No | No | No |
| Create / Deactivate Staff Members | **Yes** | No | No | No |
| Verify Cash Custody Handover (Checker) | **Yes** | No | No | No |
| Close Cash Drawer Shift (Maker) | No | **Yes** | No | No |
| Counter Cash Payment Logging | No | **Yes** | **Yes** | No |
| Configure Fee Schedules & Mass Invoicing | **Yes** | **Yes** | No | No |
| View Financial Reports & Audit Stream | **Yes** | **Yes** | **Yes** | **Yes** |

---

## 9. Multi-Tenant Isolation Strategy

### Architectural Model: Row-Level Shared Database / Shared Schema
BursarOS retains a single shared PostgreSQL database for operational simplicity and cost-efficiency. Every tenant-scoped entity (`Student`, `Invoice`, `Payment`, `FeeSchedule`, `CashHandover`, `SuspenseTransaction`, `Staff`) possesses a mandatory `schoolId` foreign key.

### Eliminating the Controller-Bypass Vulnerability
The existing codebase contains a vulnerability in `src/middlewares/authMiddleware.js:125`:
```javascript
if (!targetSchoolId) return next(); // VULNERABILITY: skips tenant verification if parameter is missing
```

#### Remediation: Systematic Tenant Enforcement via Prisma Client Extension
Rather than relying on controllers to manually specify `where: { schoolId }`, tenant isolation is enforced at the database client level using Prisma Client Extensions (`$extends`):

```javascript
// Target implementation pattern: src/core/database/tenantExtension.js
export const getTenantPrisma = (schoolId) => {
  if (!schoolId) {
    throw new Error('Tenant Context Error: Operation attempted without schoolId.');
  }

  return prisma.$extends({
    query: {
      $allModels: {
        async findMany({ args, query }) {
          args.where = { ...args.where, schoolId };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = { ...args.where, schoolId };
          return query(args);
        },
        async create({ args, query }) {
          args.data = { ...args.data, schoolId };
          return query(args);
        }
      }
    }
  });
};
```
Through this extension, it is impossible for an engineer to query another school's records accidentally, even if a `where` clause is omitted in application code.

---

## 10. Payment Processing Architecture

### Digital Payment Integration (Paystack DVA)
1. **Dedicated Virtual Account (DVA) Topology**:
   - Each enrolled student is assigned a unique DVA (via Wema Bank / Paystack).
   - The virtual account number maps directly to the student record in PostgreSQL via `VirtualAccount.accountNumber`.
2. **Webhook Ingress & Cryptographic Verification**:
   - Paystack delivers signed HTTP POST webhooks to `/api/v1/payments/webhooks/paystack`.
   - The middleware `verifyPaystackSignature` computes an HMAC-SHA512 hash over the byte-exact raw request buffer (`req.rawBody`) using `process.env.PAYSTACK_SECRET_KEY`.
   - Comparison uses `crypto.timingSafeEqual` to prevent side-channel timing attacks.
   - Non-payment events (e.g., `transfer.success`) are acknowledged immediately with HTTP 200.

### Idempotency Enforcement & Concurrency Control
To resolve the TOCTOU (Time-of-Check to Time-of-Use) race condition identified in the assessment, webhook processing uses a dedicated `ProcessedWebhook` database table with a strict unique constraint on `(provider, eventReference)`.

```
Incoming Paystack Webhook
           │
           ▼
[ HMAC-SHA512 Signature Check ] ──(Invalid)──► Return HTTP 401 Unauthorized
           │ (Valid)
           ▼
[ Atomic Transaction: Start ]
           │
           ├─► 1. INSERT INTO "ProcessedWebhook" (reference, status = 'PROCESSING')
           │      └─── ON CONFLICT (reference) DO NOTHING
           │
           ├─► Did Insert Succeed?
           │      ├── NO (Duplicate Webhook / Concurrent Thread)
           │      │     └──► ROLLBACK & Return HTTP 200 { received: true, duplicate: true }
           │      │
           │      └── YES (Sole Owner of this Event)
           │            │
           │            ├─► 2. Resolve DVA ──► Student ──► Invoices
           │            ├─► 3. Post Balanced Double-Entry Journal to Ledger
           │            ├─► 4. Update Invoice Status & Balances
           │            ├─► 5. UPDATE "ProcessedWebhook" SET status = 'COMPLETED'
           │            └─► COMMIT
           ▼
Return HTTP 200 OK to Paystack Gateway
```

### Suspense Account Flow (Automated Exception Parking)
If an authentic payment arrives with an unrecognized account number or for a student without an active invoice:
1. The payment is **not dropped** and the webhook does **not error**.
2. An entry is created in `SuspenseTransaction` with `status: 'PENDING'`.
3. The Ledger records a credit to the `Suspense Liabilities` account.
4. When a Bursar manually matches the transaction in the BursarOS UI, an atomic re-allocation transaction debits `Suspense Liabilities` and credits `Fee Revenue`, updating the selected student's invoice.

---

## 11. Financial Ledger Integration Architecture

### Double-Entry Accounting Model
To guarantee auditability, BursarOS incorporates a standard double-entry ledger. Every financial transaction generates a balanced set of debit and credit postings where:
$$\sum \text{Debits} = \sum \text{Credits}$$

### Ledger Schema Additions (Prisma Specification)

```prisma
enum AccountType {
  ASSET
  LIABILITY
  EQUITY
  REVENUE
  EXPENSE
}

model LedgerAccount {
  id          String         @id @default(uuid())
  schoolId    String
  code        String         // e.g. "1010" (Cash), "1020" (Bank DVA), "1200" (Accounts Receivable)
  name        String         // e.g. "Main Cash Drawer", "Paystack Clearing", "Tuition Revenue"
  type        AccountType
  createdAt   DateTime       @default(now())

  school      School         @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  postings    LedgerPosting[]

  @@unique([schoolId, code])
  @@index([schoolId])
}

model JournalEntry {
  id               String          @id @default(uuid())
  schoolId         String
  reference        String          @unique // e.g. "JRN-PSTK-REF-10029"
  description      String
  postedAt         DateTime        @default(now())
  createdById      String?

  school           School          @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  postings         LedgerPosting[]

  @@index([schoolId, postedAt])
}

model LedgerPosting {
  id               String         @id @default(uuid())
  journalEntryId   String
  accountId        String
  amountKobo       Int            // Always positive integer in Kobo
  isDebit          Boolean        // true = DEBIT, false = CREDIT

  journalEntry     JournalEntry   @relation(fields: [journalEntryId], references: [id], onDelete: Cascade)
  account          LedgerAccount  @relation(fields: [accountId], references: [id], onDelete: Restrict)

  @@index([journalEntryId])
  @@index([accountId])
}
```

### Standardized Chart of Accounts Mapping

| Account Code | Account Name | Type | Normal Balance |
| :--- | :--- | :--- | :--- |
| **1010** | Cash on Hand (Bursar Drawer) | ASSET | Debit |
| **1020** | Bank Ingress Clearing (Paystack DVA) | ASSET | Debit |
| **1030** | School Settlement Bank Account | ASSET | Debit |
| **1200** | Student Accounts Receivable (Debt) | ASSET | Debit |
| **2050** | Unallocated Suspense Funds | LIABILITY | Credit |
| **2100** | Prepaid Student Fees (Overpayments) | LIABILITY | Credit |
| **4010** | Tuition Fee Revenue | REVENUE | Credit |
| **4020** | Ancillary Fees (Books, Uniforms, ICT)| REVENUE | Credit |

### Posting Scenarios

```
Scenario A: Invoice Issued to Student for First Term (₦150,000)
  DEBIT   1200 - Student Accounts Receivable            ₦150,000
  CREDIT  4010 - Tuition Fee Revenue                    ₦150,000

Scenario B: Paystack Webhook Receives Full Payment (₦150,000)
  DEBIT   1020 - Bank Ingress Clearing (Paystack DVA)   ₦150,000
  CREDIT  1200 - Student Accounts Receivable            ₦150,000

Scenario C: Overpayment (Invoice: ₦100,000, Parent Pays: ₦120,000)
  DEBIT   1020 - Bank Ingress Clearing (Paystack DVA)   ₦120,000
  CREDIT  1200 - Student Accounts Receivable            ₦100,000
  CREDIT  2100 - Prepaid Student Fees (Advance Credit)   ₦20,000

Scenario D: Cash Payment at Counter (₦50,000)
  DEBIT   1010 - Cash on Hand (Bursar Drawer)            ₦50,000
  CREDIT  1200 - Student Accounts Receivable             ₦50,000

Scenario E: Proprietor Confirms Cash Handover / Bank Deposit
  DEBIT   1030 - School Settlement Bank Account          ₦50,000
  CREDIT  1010 - Cash on Hand (Bursar Drawer)            ₦50,000
```

---

## 12. Background Job Processing Architecture

### Worker Infrastructure: Redis + BullMQ
To eliminate blocking HTTP cycles during batch rosters and external network communications, long-running operations are offloaded to an asynchronous job queue using **BullMQ** backed by **Redis**.

```
HTTP Thread (Express)                             Background Worker Thread (Node.js)
┌───────────────────────────────┐                 ┌───────────────────────────────┐
│ Client POST /students/bulk    │                 │ BullMQ Supervisor Daemon      │
│   │                           │                 │   │                           │
│   ▼                           │                 │   ▼                           │
│ Validate Roster (Zod)         │                 │ Pops Job: 'DVA_PROVISION'     │
│   │                           │                 │   │                           │
│   ▼                           │                 │   ├─► Calls Paystack API      │
│ Write Students (PENDING_DVA)  │                 │   ├─► Obtains Wema DVA        │
│   │                           │                 │   ├─► Saves VirtualAccount    │
│   ▼                           │                 │   └─► Auto-Generates Invoices │
│ Push Job to 'dva-queue'       │──(Redis Queue)─►│                               │
│   │                           │                 │ Retries on Network Failure    │
│   ▼                           │                 │ (Exponential backoff: 3 tries)│
│ Return HTTP 202 Accepted      │                 │                               │
│ { jobId, status: 'QUEUED' }   │                 └───────────────────────────────┘
└───────────────────────────────┘
```

### Managed Job Queues

1. **`dva-provision-queue`**:
   - **Job Payload**: `{ studentId, firstName, lastName, parentPhone, schoolId }`
   - **Execution**: Calls Paystack Customer & Dedicated Account endpoints. Implements exponential backoff retry (3 attempts) on network errors. Updates student status to `ACTIVE`.
2. **`mass-invoice-queue`**:
   - **Job Payload**: `{ schoolId, term, academicSession, dueDate }`
   - **Execution**: Batches student invoice creation into chunks of 100 per database transaction, preventing connection pool exhaustion and memory spikes on large student populations.
3. **`reconciliation-retry-queue`**:
   - Handles delayed settlement confirmations and third-party verification webhooks.

---

## 13. Error Handling Strategy

### Domain Exception Hierarchy
The application replaces generic `try/catch` and `res.status(500).json({ error: error.message })` patterns with an explicit domain exception hierarchy inheriting from a base `AppError`.

```javascript
// src/core/errors/AppError.js
export class AppError extends Error {
  constructor(message, statusCode, code, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource, identifier) {
    super(`${resource} with identifier '${identifier}' was not found.`, 404, 'RESOURCE_NOT_FOUND');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access Denied: You do not have permission to access this resource.') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class ConflictError extends AppError {
  constructor(message, code = 'RESOURCE_CONFLICT') {
    super(message, 409, code);
  }
}

export class ValidationError extends AppError {
  constructor(message, details) {
    super(message, 422, 'VALIDATION_ERROR', details);
  }
}
```

### Centralized Express Error Middleware
Located in `src/core/middleware/errorHandler.js`, this captures all unhandled exceptions:
- **Operational Errors (`AppError`)**: Formatted cleanly into standard JSON errors.
- **Prisma Errors**:
  - `P2002` (Unique constraint) $\rightarrow$ mapped to `ConflictError` (HTTP 409).
  - `P2025` (Record not found) $\rightarrow$ mapped to `NotFoundError` (HTTP 404).
- **Unknown Programmer Errors**: Logged with full stack traces in Pino, returning a generic `HTTP 500 Internal Server Error` to prevent leaking internal database schemas or credentials to callers.

```json
// Standardized JSON Error Response Format
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters provided.",
    "requestId": "req-9a4f-42e1",
    "details": [
      { "field": "amountNaira", "message": "Amount must be greater than zero." }
    ]
  }
}
```

---

## 14. Validation Strategy

### Declarative Schema Validation with Zod
All input parsing is decoupled from controller code and handled by **Zod** schema middleware. If a request body, URL parameter, or query string fails validation, the request is rejected before reaching the controller or service layer.

```javascript
// Example: src/modules/billing/billing.schemas.js
import { z } from 'zod';

export const CreateInvoiceSchema = z.object({
  body: z.object({
    studentId: z.string().uuid({ message: 'Valid Student UUID required' }),
    term: z.enum(['First Term', 'Second Term', 'Third Term']),
    academicSession: z.string().regex(/^\d{4}\/\d{4}$/, { message: 'Session format must be YYYY/YYYY' }),
    dueDate: z.string().datetime().optional(),
    items: z.array(
      z.object({
        description: z.string().min(2).max(100),
        amountNaira: z.number().positive({ message: 'Item amount must be positive' })
      })
    ).min(1, { message: 'At least one line item is required' })
  })
});
```

### Reusable Validation Middleware
```javascript
// src/core/middleware/validateRequest.js
export const validateRequest = (schema) => async (req, res, next) => {
  try {
    const parsed = await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params
    });
    req.body = parsed.body ?? req.body;
    req.query = parsed.query ?? req.query;
    req.params = parsed.params ?? req.params;
    next();
  } catch (err) {
    next(new ValidationError('Request validation failed', err.errors));
  }
};
```

---

## 15. Logging and Observability

### Structured JSON Logging (Pino)
Console statements (`console.log`, `console.error`) are replaced by **Pino**. In production, logs are emitted as single-line JSON streams consumed by log aggregators (e.g., Datadog, Papertrail, Grafana Loki).

### Correlation & Request Tracking
1. Incoming HTTP requests pass through correlation middleware that assigns or extracts an `x-request-id` header.
2. The `req.id` is automatically attached to every logger statement generated during that request's execution.
3. Errors include `requestId` in their response payloads, allowing customer-support tickets to be mapped immediately to database and application logs.

```json
{"level":30,"time":1762078800000,"pid":421,"reqId":"req-01H7X","schoolId":"sch-wema-1","msg":"Payment webhook reconciled successfully. Amount Kobo: 15000000"}
```

### Sensitive Data Masking
Pino logger redact configuration masks:
- `req.headers.authorization`
- `req.body.password`
- `req.body.currentPassword`
- `req.body.newPassword`
- Bank account numbers (masked except for last 4 digits)

---

## 16. Testing Architecture

### Pyramid Testing Strategy
BursarOS implements an automated test suite executed via **Jest** or **Vitest** paired with **Supertest**.

```
              ┌───────────────────────────┐
              │  End-to-End Tests (10%)   │ ── Complete Webhook & Payment flows
              ├───────────────────────────┤
              │  Integration Tests (30%)  │ ── HTTP Routes, DB Repositories, RBAC
              ├───────────────────────────┤
              │    Unit Tests (60%)       │ ── Ledger balance math, DTO parsing,
              └───────────────────────────┘    Zod schemas, Maker-Checker rules
```

### 1. Unit Tests
- Fast, isolated in-memory tests targeting domain logic without touching PostgreSQL or the network.
- **Targets**:
  - Double-entry balance calculation functions.
  - Cash closeout balance summation.
  - Surname and telephone privacy masking logic.
  - Zod validation schemas.

### 2. Integration Tests
- Run against an isolated PostgreSQL test database (local Docker or ephemeral database container).
- **Targets**:
  - Authentication flow (registration, login, invalid credentials).
  - Multi-tenant boundary verification: confirms User from School A receives `403 Forbidden` attempting to view Invoices from School B.
  - Cash handover workflow: Bursar closeout followed by Proprietor verification.
  - Webhook idempotency: ensures duplicate webhook POST returns HTTP 200 without creating duplicate payment rows.

### 3. Gateway Mock Fixtures
- All external Paystack API interactions are intercepted in testing environments using `mockGateway.js` or `msw` (Mock Service Worker), avoiding live test API rate-limiting and external network dependencies.

---

## 17. Security Considerations

### 1. Production CORS Hardening
The existing permissive fallback in `src/server.js:47` (`else { callback(null, true); }`) is eliminated. CORS strictly checks against an explicit array of origins loaded from `process.env.ALLOWED_ORIGINS`:
```javascript
const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new ForbiddenError('Blocked by CORS policy'));
    }
  },
  credentials: true
}));
```

### 2. Distributed Rate Limiting (Redis Token Bucket)
The in-memory JavaScript `Map` rate limiter in `parentPortalController.js` is replaced by an instance-agnostic Redis rate limiter (`rate-limiter-flexible`). This prevents distributed brute-force attacks across multi-instance cloud deployments.

### 3. Parent Portal Anti-Scraping Defenses
To prevent enumeration of student records via public mobile numbers:
- Require student date-of-birth or admission number alongside the parent phone number.
- Enforce strict per-IP rate limiting (maximum 10 searches per minute).
- Obfuscate all returned student records: mask surnames (`Okafor` $\rightarrow$ `O.`), hide home addresses, and omit phone numbers.

---

## 18. Deployment Architecture

BursarOS is designed to deploy as a unified modular service across containerized or PaaS cloud environments (e.g., Render, Railway, AWS ECS, Fly.io).

```
                             [ Internet Traffic ]
                                      │
                                      ▼
                        [ Cloud Load Balancer / CDN ]
                        (SSL/TLS Termination, DDoS)
                                      │
                                      ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                      CONTAINERIZED APPLICATION HOST                       │
│                                                                           │
│   ┌───────────────────────────────┐       ┌───────────────────────────┐   │
│   │   Web Service (Express API)   │       │ Background Worker Process │   │
│   │   - Command: npm start        │       │ - Command: npm run worker │   │
│   │   - Replicas: 2+ (Autoscaling)│       │ - Replicas: 1+            │   │
│   └───────────────┬───────────────┘       └─────────────┬─────────────┘   │
└───────────────────┼─────────────────────────────────────┼─────────────────┘
                    │                                     │
                    ▼                                     ▼
┌──────────────────────────────────────┐  ┌─────────────────────────────────┐
│         PostgreSQL Database          │  │       Managed Redis Cache       │
│  - Neon Serverless / AWS RDS         │  │  - Upstash / Managed Redis      │
│  - PgBouncer Connection Pooling      │  │  - BullMQ Queues                │
│  - Automated Point-in-Time Backups   │  │  - Distributed Rate Limiter     │
└──────────────────────────────────────┘  └─────────────────────────────────┘
```

### Graceful Shutdown Lifecycle
In `src/server.js`, POSIX signal handlers (`SIGTERM`, `SIGINT`) manage zero-downtime deployments:
1. Cease accepting new incoming HTTP connections (`server.close()`).
2. Allow active in-flight requests a 10-second grace period to complete.
3. Pause and drain active BullMQ worker queues.
4. Disconnect Prisma database pool connections cleanly (`await prisma.$disconnect()`).
5. Terminate the process with code 0.

---

## 19. Architectural Decisions & Trade-off Matrix

| Architecture Decision | Context / Rationale | Advantages | Potential Trade-offs & Mitigations |
| :--- | :--- | :--- | :--- |
| **Modular Monolith vs Microservices** | Financial SaaS stage requires agility, atomic transactions, and minimal operational overhead. | Direct module calls without network overhead; single database with atomic ACID transactions; simplified local dev and CI. | Requires strict discipline to avoid circular dependencies between modules. Mitigated via ESLint boundary rules. |
| **Double-Entry Ledger Engine** | Overwriting integer balance fields on invoices prevents reconciliation auditing and leads to data loss. | Verifiable, immutable financial journal; transparent support for overpayments, credits, and refunds. | Increases write amplification (every payment requires multiple ledger posting rows). Mitigated via B-Tree indexes. |
| **Prisma Extension Multi-Tenancy** | Existing manual controller tenant checks are error-prone and vulnerable to omission. | Systematic, query-level tenant isolation; impossible to accidentally query across school boundaries. | Queries must always supply `schoolId` context; bypass requires explicit unscoped client (restricted to system scripts). |
| **BullMQ + Redis for Async Tasks** | Sequential Paystack DVA creation in HTTP thread causes timeouts on bulk student imports. | Non-blocking HTTP responses; automatic retry with exponential backoff; workload decoupling. | Introduces Redis infrastructure dependency. Mitigated by using managed Redis (e.g. Upstash) with fallback health checks. |
| **Zod Schema Middleware Validation** | Blending manual type checking in controllers produces duplicated, inconsistent error messages. | Clean, declarative input validation; strongly typed payloads; automatic rejection of invalid types before controller code. | Slight compute overhead on request parsing. Insignificant relative to database I/O latency. |

---

## 20. Incremental Migration Strategy

The migration from the current codebase to the target modular monolith must be executed **incrementally** across 4 non-breaking phases. At each step, existing application behaviour remains operational.

```
Phase 1: Foundation & Security  ──► Phase 2: Service Decoupling  ──► Phase 3: Financial Ledger  ──► Phase 4: Async & Polish
(Weeks 1 - 2)                       (Weeks 3 - 4)                    (Weeks 5 - 6)                  (Weeks 7+)
- Zod & Error Hierarchy             - Extract Services & Repos       - Add Ledger Tables            - Introduce BullMQ & Redis
- Fix Insecure JWT Fallback         - Prisma Tenant Extension        - Transition Payment Flow      - Distributed Rate Limiting
- Patch CORS & verifySchoolAccess   - Standardize Route Structure    - Add Suspense Double-Entry    - CI Integration Test Suite
```

### Phase 1: Foundation, Security, and Configuration Hardening
1. Implement `src/config/env.js` with Zod to enforce mandatory environment variables (`JWT_SECRET`, `DATABASE_URL`, `PAYSTACK_SECRET_KEY`) on boot. Remove all insecure string fallbacks.
2. Introduce `src/core/errors/` with `AppError` and mount `errorHandler.js` in `server.js`.
3. Harden `verifySchoolAccess` to reject requests when `schoolId` is omitted, eliminating the tenant-check bypass.
4. Correct the permissive CORS configuration in `server.js`.
5. Establish the automated testing harness (Jest/Vitest + Supertest) with tests verifying auth and multi-tenant security gates.

### Phase 2: Service & Repository Layer Extraction
1. Implement the modular directory layout under `src/modules/`.
2. Extract business logic from `authController.js` into `IdentityService` and `IdentityRepository`.
3. Extract `schoolController.js` and `feeScheduleController.js` into `BillingService` and `TenancyService`.
4. Wrap request inputs with Zod validation schemas (`validateRequest`), cleaning up manual parameter-check assertions.
5. Deploy the Prisma Client tenant extension, centralizing `where: { schoolId }` scoping.

### Phase 3: Financial Ledger & Webhook Idempotency Integration
1. Run a non-breaking Prisma migration adding `LedgerAccount`, `JournalEntry`, `LedgerPosting`, and `ProcessedWebhook`.
2. Implement `LedgerService` to handle journal entries for fee invoicing and payment reconciliation.
3. Update `paymentController.js` to ingest webhooks via the atomic `ProcessedWebhook` lock, resolving the TOCTOU race hazard.
4. Connect counter cash payments and custody closeouts to the ledger journal.

### Phase 4: Background Processing & SaaS Polish
1. Deploy Redis instance and configure BullMQ connection factory (`src/core/queue/`).
2. Move Paystack DVA provisioning from `bulkCreateStudents` into `dvaProvisionWorker.js`.
3. Replace the in-memory sliding window rate limiter in `parentPortalController.js` with Redis-backed rate limiting.
4. Replace `console.log` statements throughout the codebase with structured Pino logger invocations.
5. Implement graceful shutdown handlers in `server.js` for process signal management.

