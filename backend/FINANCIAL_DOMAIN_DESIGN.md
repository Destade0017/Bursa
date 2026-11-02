# BursarOS: Financial Domain & Double-Entry Accounting Specification

**Document Version:** 1.0.0  
**Status:** Financial Domain Specification / Blueprint  
**Domain Scope:** Accounting Mechanics, Ledger Invariants, Cash & Digital Payment Reconciliation, Exception Handling  
**Currency Unit:** Nigerian Kobo ($\text{NGN } 1.00 = 100 \text{ Kobo}$, stored strictly as positive 64-bit integers / `BigInt` / `Int`)

---

## Table of Contents
1. [Financial Domain Overview](#1-financial-domain-overview)
2. [Core Entities and Their Responsibilities](#2-core-entities-and-their-responsibilities)
3. [Standard Chart of Accounts (COA)](#3-standard-chart-of-accounts-coa)
4. [Double-Entry Accounting Principles & Invariants](#4-double-entry-accounting-principles--invariants)
5. [Journal Entry and Posting Rules](#5-journal-entry-and-posting-rules)
6. [Invoice Lifecycle](#6-invoice-lifecycle)
7. [Payment Lifecycle (Digital & Physical)](#7-payment-lifecycle-digital--physical)
8. [Payment Allocation Engine](#8-payment-allocation-engine)
9. [Partial Payments and Overpayment Mechanics](#9-partial-payments-and-overpayment-mechanics)
10. [Student Advance Credit Wallet System](#10-student-advance-credit-wallet-system)
11. [Failed Payments and Transaction Reversals](#11-failed-payments-and-transaction-reversals)
12. [Refund Processing Workflows](#12-refund-processing-workflows)
13. [Paystack Settlement & Fee Reconciliation](#13-paystack-settlement--fee-reconciliation)
14. [Suspense Account Management](#14-suspense-account-management)
15. [Physical Cash & Custody Handover Accounting](#15-physical-cash--custody-handover-accounting)
16. [Audit Trails, Verification & Period Closing](#16-audit-trails-verification--period-closing)
17. [Database Constraints, Locking & Isolation Boundaries](#17-database-constraints-locking--isolation-boundaries)
18. [Comprehensive Worked Examples (Realistic Nigerian Scenarios)](#18-comprehensive-worked-examples-realistic-nigerian-scenarios)
19. [Edge Cases, Race Conditions & Failure Modes](#19-edge-cases-race-conditions--failure-modes)
20. [Incremental Migration from Existing Financial Model](#20-incremental-migration-from-existing-financial-model)

---

## 1. Financial Domain Overview

Nigerian private schools operate in a volatile financial environment marked by multi-channel payment fragmentation, high unbanked transaction volumes, banking network timeouts, and delayed fee settlements. Parents pay school fees via:
1. **Dedicated Virtual Accounts (DVA)** powered by Paystack (Wema Bank / Titan Trust).
2. **Direct counter cash deposits** handed to the Bursar in physical Naira banknotes.
3. **Unannounced direct bank transfers** into the school's general corporate bank account, frequently lacking admission numbers or student identifiers in the transfer narration.

### The Problem in the Existing Codebase
In the current implementation:
- Financial tracking operates via **destructive in-place updates**: `amountPaidKobo` and `status` are mutated directly on the `Invoice` model inside `paymentController.js:133-156`.
- Overpayments overwrite the invoice paid amount without allocating remaining balances to future terms or recording the school's liability.
- Reversals, chargebacks, and partial refunds have no data representation.
- Paystack processing fees are completely ignored; the gross amount is credited to the invoice while the net payout arriving at the school's commercial bank account is lower, creating an unbridgeable reconciliation gap.

### The Target Financial Engine
The target engine separates **Billing Instruments** (Invoices) and **Payment Signals** (Webhooks, Cash Vouchers) from the **Financial Truth** (The Double-Entry General Ledger). Every monetary event generates an immutable, balanced set of journal postings.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 EXTERNAL REAL-WORLD EVENTS                                  │
│   Term Tuition Billed  │  Paystack DVA Transfer  │  Counter Cash Entry  │  Bank Reversal   │
└────────────────────────┬─────────────────────────┬──────────────────────┬───────────────────┘
                         │                         │                      │
                         ▼                         ▼                      ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                  BILLING & TRANSACTION TIER                                 │
│  - Invoice State Machine     - Payment Ingress Tracker      - Suspense Queue                │
│  - Line Item Categorization  - DVA Routing Engine           - Cash Closeout Batches         │
└──────────────────────────────────────────┬──────────────────────────────────────────────────┘
                                           │
                                           ▼ (Emits Atomic Financial Transaction)
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                             IMMUTABLE GENERAL LEDGER ENGINE                                 │
│                                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                                  JournalEntry Header                                  │  │
│  │   id, schoolId, reference, transactionType, narration, postedAt, createdById          │  │
│  └───────────────────────────────────────────┬───────────────────────────────────────────┘  │
│                                              │                                              │
│                        ┌─────────────────────┴─────────────────────┐                        │
│                        ▼                                           ▼                        │
│             ┌─────────────────────┐                     ┌─────────────────────┐             │
│             │   DEBIT Postings    │                     │   CREDIT Postings   │             │
│             │ Σ(Debit AmountKobo) │          =          │Σ(Credit AmountKobo) │             │
│             └─────────────────────┘                     └─────────────────────┘             │
│                                              │                                              │
│                                              ▼                                              │
│  ┌───────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                             Chart of Accounts (COA) Ledger                            │  │
│  │   Assets (1000s) │ Liabilities (2000s) │ Equity (3000s) │ Revenue (4000s) │ Exp (5000)│  │
│  └───────────────────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Entities and Their Responsibilities

```
┌─────────────────────────┐               ┌─────────────────────────┐
│         School          │               │         Student         │
├─────────────────────────┤               ├─────────────────────────┤
│ id: UUID (PK)           │               │ id: UUID (PK)           │
│ name: String            │               │ schoolId: UUID (FK)     │
│ currency: "NGN"         │               │ admissionNumber: Unique │
└────────────┬────────────┘               └────────────┬────────────┘
             │ 1:N                                     │ 1:N
             ├──────────────────────┐                  │
             ▼ 1:N                  ▼ 1:N              ▼ 1:N
┌─────────────────────────┐   ┌─────────────────────────┐
│      LedgerAccount      │   │         Invoice         │
├─────────────────────────┤   ├─────────────────────────┤
│ id: UUID (PK)           │   │ id: UUID (PK)           │
│ schoolId: UUID (FK)     │   │ schoolId: UUID (FK)     │
│ code: String (Unique)   │   │ studentId: UUID (FK)    │
│ type: AccountType       │   │ totalAmountKobo: Int    │
└────────────┬────────────┘   │ status: InvoiceStatus   │
             │ 1:N            └────────────┬────────────┘
             │                             │ 1:N
             │                             ▼
             │                ┌─────────────────────────┐
             │                │    InvoiceAllocation    │
             │                ├─────────────────────────┤
             │                │ id: UUID (PK)           │
             │                │ invoiceId: UUID (FK)    │
             │                │ paymentId: UUID (FK)    │
             │                │ amountKobo: Int         │
             │                └────────────┬────────────┘
             │                             │ N:1
             │                             ▼
             │                ┌─────────────────────────┐
             │                │         Payment         │
             │                ├─────────────────────────┤
             │                │ id: UUID (PK)           │
             │                │ reference: String (U)   │
             │                │ amountKobo: Int         │
             │                │ status: PaymentStatus   │
             │                └────────────┬────────────┘
             ▼ N:1                         │ 1:1
┌─────────────────────────┐                │
│      LedgerPosting      │◄───────────────┘ (Triggers Postings)
├─────────────────────────┤
│ id: UUID (PK)           │
│ journalEntryId: UUID(FK)│
│ accountId: UUID (FK)    │
│ amountKobo: Int         │
│ isDebit: Boolean        │
└─────────────────────────┘
```

### Entity Definition Table

| Entity | Purpose & Responsibility | Immutability Rule |
| :--- | :--- | :--- |
| **School** | Top-level tenant container. Defines operational currency (NGN) and accounting periods. | Mutable (settings, profile). |
| **LedgerAccount** | Specific account node in the Chart of Accounts (e.g., Cash, Accounts Receivable). | Account metadata mutable; code/type immutable once postings exist. |
| **JournalEntry** | Transaction header grouping matching debit/credit postings. Anchors audit reference. | **Strictly Immutable**. Never updated or deleted. |
| **LedgerPosting** | Individual line entry debiting or crediting a `LedgerAccount`. Always positive integer Kobo. | **Strictly Immutable**. |
| **Invoice** | Formal legal bill presented to student/parent for tuition and ancillary fees. | Lifecycle mutable via state machine transitions only. |
| **InvoiceItem** | Itemized breakdown of invoice charges (Tuition, Books, Uniform, ICT levy). | Immutable once Invoice transitions from `DRAFT` to `ISSUED`. |
| **Payment** | Ingress record of funds received via Cash Counter or Paystack DVA transfer. | State updates strictly follow payment settlement lifecycle. |
| **InvoiceAllocation** | Many-to-many junction joining a `Payment` to the specific `Invoice` it settles. | Immutable audit record of fund distribution. |
| **StudentCreditWallet**| Running tracking account of advance unallocated funds belonging to a student. | Derived balance from Ledger Account `2100` (Prepaid Fees). |
| **SuspenseTransaction**| Exception holding record for unidentified bank transfers or unrecognized DVAs. | Status transitions (`PENDING` $\rightarrow$ `ALLOCATED` or `REFUNDED`). |
| **CashHandover** | Dual-control custody batch transferring cash from Bursar to Proprietor. | State transitions (`PENDING_VERIFICATION` $\rightarrow$ `CONFIRMED`). |

---

## 3. Standard Chart of Accounts (COA)

Every registered school tenant is automatically initialized with this standardized Chart of Accounts upon registration. Account codes follow a hierarchical decimal structure:
- **`1000 - 1999`**: **ASSETS** (What the school owns or is owed)
- **`2000 - 2999`**: **LIABILITIES** (What the school owes to parents or third parties)
- **`3000 - 3999`**: **EQUITY** (School accumulated reserves & capital)
- **`4000 - 4999`**: **REVENUE** (Income generated from fees and services)
- **`5000 - 5999`**: **EXPENSES** (Operating expenses and gateway fees)

```
Chart of Accounts Hierarchy
├── 1000 ASSETS
│   ├── 1010 Cash on Hand (Bursar Counter Drawer)
│   ├── 1020 Bank Clearing Account (Paystack Ingress)
│   ├── 1030 Main Commercial Operating Account (School Bank Account)
│   └── 1200 Student Accounts Receivable (Gross Student Debt)
├── 2000 LIABILITIES
│   ├── 2050 Unallocated Suspense Funds (Unrecognized Ingress)
│   └── 2100 Prepaid Student Tuition (Advance Credits / Overpayments)
├── 3000 EQUITY
│   └── 3010 Retained Operating Surplus
├── 4000 REVENUE
│   ├── 4010 Tuition Fee Revenue
│   ├── 4020 Textbooks, Workbooks & Uniform Revenue
│   ├── 4030 Science, ICT & Technical Laboratory Fees
│   └── 4040 PTA & Co-Curricular Development Levies
└── 5000 EXPENSES
    └── 5010 Payment Gateway Processing Charges (Paystack MDD)
```

---

## 4. Double-Entry Accounting Principles & Invariants

The BursarOS financial engine enforces fundamental mathematical invariants at both application and database engine layers:

### Invariant 1: The Accounting Equation
For any school tenant at any point in time:
$$\text{Assets} = \text{Liabilities} + \text{Equity}$$

### Invariant 2: Transaction Balance (Zero-Sum Principle)
Every `JournalEntry` must contain at least two `LedgerPosting` rows. The sum of all debits must equal the sum of all credits exactly:
$$\sum_{i=1}^{n} \text{DebitAmountKobo}_i - \sum_{j=1}^{m} \text{CreditAmountKobo}_j = 0$$

### Invariant 3: Positive Magnitudes Only
Negative postings are strictly prohibited. In `LedgerPosting`:
$$\text{amountKobo} > 0$$
Reversals or corrections are handled exclusively by posting **compensating entries** (swapping debits and credits in a new Journal Entry), never by inserting negative amounts.

### Invariant 4: Normal Balance Behavior

| Account Category | Normal Balance | To Increase Balance | To Decrease Balance |
| :--- | :---: | :---: | :---: |
| **Asset (1xxx)** | DEBIT | DEBIT | CREDIT |
| **Liability (2xxx)** | CREDIT | CREDIT | DEBIT |
| **Revenue (4xxx)** | CREDIT | CREDIT | DEBIT |
| **Expense (5xxx)** | DEBIT | DEBIT | CREDIT |

---

## 5. Journal Entry and Posting Rules

### Posting Creation Rules
1. **Single Database Transaction**: A `JournalEntry` and its child `LedgerPosting` rows must always be created inside the same atomic database transaction (`tx`).
2. **Atomic Verification**: Before committing, the transaction must verify:
   ```javascript
   const totalDebits = postings.filter(p => p.isDebit).reduce((sum, p) => sum + p.amountKobo, 0);
   const totalCredits = postings.filter(p => !p.isDebit).reduce((sum, p) => sum + p.amountKobo, 0);
   if (totalDebits !== totalCredits) {
     throw new AccountingInvariantError(`Unbalanced journal: Debits=${totalDebits}, Credits=${totalCredits}`);
   }
   ```
3. **Reference Uniqueness**: `JournalEntry.reference` must be unique across the tenant to prevent double-posting financial events.

---

## 6. Invoice Lifecycle

Invoices represent claims for payment issued to students. In the existing codebase, an invoice is created with an immediate state of `UNPAID` and modified in place. In the target architecture, Invoices follow a deterministic state machine:

```
┌──────────────┐
│    DRAFT     │ ── (Admin reviews / adjusts fee schedule line items)
└──────┬───────┘
       │ [Issue Invoice Event]
       ▼
┌──────────────┐
│    ISSUED    │ ── (Post Journal: Debit 1200 Receivable, Credit 4xxx Revenue)
└──────┬───────┘
       │
       ├─────────────────────────────────┐
       ▼ [Partial Payment Allocated]     ▼ [Full Payment Allocated]
┌──────────────┐                  ┌──────────────┐
│  PART_PAID   │                  │     PAID     │
└──────┬───────┘                  └──────────────┘
       │ [Remaining Payment Allocated]   ▲
       └─────────────────────────────────┘
```

### Invoice State Transition Specifications

| State | Allowed Next States | Trigger Event | Financial Consequence |
| :--- | :--- | :--- | :--- |
| **`DRAFT`** | `ISSUED`, `VOID` | Bursar/Admin confirms fee schedule. | None. No ledger impact. |
| **`ISSUED`** | `PART_PAID`, `PAID`, `CANCELLED` | Mass Invoicing or Student Enrollment. | **Ledger Posted**: Debits Student A/R (`1200`), Credits Fee Revenue (`4010-4040`). |
| **`PART_PAID`** | `PAID`, `CANCELLED` | Ingress payment allocated ($0 < \text{Allocated} < \text{Total}$). | **Ledger Posted**: Allocates cash/clearing to reduce A/R (`1200`). |
| **`PAID`** | `REFUNDED` | Cumulative allocations $\ge$ `totalAmountKobo`. | Invoice fully cleared. No debt remains. |
| **`CANCELLED`**| None (Terminal) | Billing correction before payment. | **Compensating Journal**: Reverses original revenue and receivables. |
| **`VOID`** | None (Terminal) | Discarded draft. | None. |

---

## 7. Payment Lifecycle (Digital & Physical)

```
[ Ingress Signal: Paystack DVA Webhook or Counter Cash Entry ]
                         │
                         ▼
┌────────────────────────────────────────────────────────────────┐
│                    PAYMENT INGESTION PHASE                     │
│  - Validate HMAC Signature (Paystack) or Auth Session (Cash)   │
│  - Reserve Transaction Reference in ProcessedWebhook (Atomic)  │
│  - Create Payment Record (Status: 'RECEIVED')                  │
└────────────────────────┬───────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────────┐
│                   LEDGER RECOGNITION PHASE                     │
│  - Paystack: Debit 1020 (Bank Clearing)                        │
│  - Cash:     Debit 1010 (Cash on Hand)                         │
│  - Credit:   2050 (Suspense) OR 1200 (Accounts Receivable)     │
└────────────────────────┬───────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────────┐
│                   ALLOCATION & SETTLEMENT                      │
│  - Match Oldest Open Invoices Sequentially                     │
│  - If Surplus: Credit 2100 (Prepaid Student Fees)              │
│  - Mark Payment: 'SETTLED'                                     │
└────────────────────────────────────────────────────────────────┘
```

---

## 8. Payment Allocation Engine

When a payment of amount $P$ arrives for student $S$, the allocation engine evaluates all open invoices for $S$ ordered chronologically by `dueDate ASC, createdAt ASC`.

```
Incoming Payment Amount: P Kobo
Remaining Unallocated Amount: R = P

FOR EACH Invoice I in Student.openInvoices:
  IF R <= 0 THEN BREAK

  Outstanding Balance B_I = I.totalAmountKobo - I.allocatedAmountKobo
  
  IF R >= B_I THEN:
    Allocation Amount A = B_I
    R = R - B_I
    I.status = 'PAID'
  ELSE:
    Allocation Amount A = R
    R = 0
    I.status = 'PART_PAID'

  Create InvoiceAllocation(InvoiceId: I.id, PaymentId: Payment.id, Amount: A)
  Post Ledger: DEBIT 1020/1010, CREDIT 1200 (Receivables) for Amount A

IF R > 0 THEN:
  // OVERPAYMENT DETECTED
  Create StudentCreditBalance(StudentId: S.id, Amount: R)
  Post Ledger: DEBIT 1020/1010, CREDIT 2100 (Prepaid Student Fees) for Amount R
```

---

## 9. Partial Payments and Overpayment Mechanics

### Partial Payment Rules
- When allocated amount is less than the invoice total, the invoice is set to `PART_PAID`.
- Accounts Receivable (`1200`) is reduced **only** by the exact amount paid.
- The student's outstanding balance equals the remaining unallocated balance.

### Overpayment Rules
In the existing codebase, an overpayment corrupts invoice status by setting `amountPaidKobo > totalAmountKobo`.  
In the target system:
1. The invoice `amountPaidKobo` is capped at exactly `totalAmountKobo` and marked `PAID`.
2. The excess funds are explicitly credited to **`2100 - Prepaid Student Fees`** (a liability on the school's balance sheet representing unearned revenue).
3. The excess funds are tracked in the student's credit balance and auto-applied when the next term's invoice is issued.

---

## 10. Student Advance Credit Wallet System

When a parent overpays or makes an unbilled deposit:
1. The amount enters `2100 - Prepaid Student Fees`.
2. A record is added to `StudentCreditLedger`.
3. When the next term's mass billing runs:
   - Invoice $I_{new}$ is created in `ISSUED` state.
   - The Billing Service queries `StudentCreditLedger` for available advance credit.
   - If credit $C > 0$, an internal allocation occurs:
     - **DEBIT**: `2100 - Prepaid Student Fees`
     - **CREDIT**: `1200 - Student Accounts Receivable`
   - Invoice balance is reduced without requiring a new external payment from the parent.

---

## 11. Failed Payments and Transaction Reversals

### Failed Ingress Webhooks
If Paystack emits an event other than `charge.success` (e.g., `charge.failed`), the payment is marked `FAILED` in the database. **No ledger postings are created**, as no economic value changed hands.

### Chargebacks and Bank Reversals
If a settled transaction is reversed (e.g., Paystack clawback due to fraudulent card use or an erroneous NIBSS bank transfer recall):
1. **Trigger**: Paystack webhook `reversal.success` or manual bank debit adjustment.
2. **Accounting Action**: Post a compensating journal entry that reverses the original payment.
3. **Accounts Debited/Credited**:
   - **DEBIT**: `1200 - Student Accounts Receivable` (Student's debt is reinstated).
   - **CREDIT**: `1020 - Bank Clearing Account` (Bank balance reduced by reversal).
4. **Invoice State Reversion**:
   - The associated `InvoiceAllocation` rows are cancelled.
   - Invoice transitions from `PAID` $\rightarrow$ `PART_PAID` or `PART_PAID` $\rightarrow$ `ISSUED`.

---

## 12. Refund Processing Workflows

When a student transfers schools or an erroneous double-payment is refunded via commercial bank transfer:
1. **Trigger**: Proprietor approves a refund request in the BursarOS dashboard.
2. **Source of Funds**:
   - If refunded from advance credits:
     - **DEBIT**: `2100 - Prepaid Student Fees` (Liability discharged)
     - **CREDIT**: `1030 - School Commercial Bank Account` (Cash paid out)
   - If refunded from settled tuition fee revenue:
     - **DEBIT**: `4010 - Tuition Fee Revenue` (Revenue contra-reduction)
     - **CREDIT**: `1030 - School Commercial Bank Account` (Cash paid out)
3. **Constraint**: A refund can never be processed without an approved `CashHandover` or bank settlement debit reference.

---

## 13. Paystack Settlement & Fee Reconciliation

Paystack does not remit 100% of collected funds to the school's bank account; it deducts a Merchant Discount Debit (MDD) fee (typically 1.5% capped at ₦2,000 for local cards/transfers).

### The Reconciliation Gap in Existing System
If a parent pays ₦100,000 via DVA:
- Parent pays: ₦100,000
- Paystack fee (1.5%): ₦1,500
- Net settlement paid to school bank: ₦98,500

If the system records a simple ₦100,000 bank deposit, the school's physical bank statement (₦98,500) will never match the system ledger (₦100,000).

### Target Two-Step Settlement Accounting

#### Step 1: Webhook Ingress (Gross Payment Received)
Parent settles tuition in full; student receivables are cleared:
- **DEBIT**: `1020 - Bank Clearing Account (Paystack DVA)`: **₦100,000**
- **CREDIT**: `1200 - Student Accounts Receivable`: **₦100,000**

#### Step 2: Settlement Batch Transfer (Net Remittance to School Bank)
When Paystack executes payout to the school's Wema Bank account:
- **DEBIT**: `1030 - School Commercial Operating Account`: **₦98,500** (Net cash received)
- **DEBIT**: `5010 - Payment Gateway Processing Charges`: **₦1,500** (Operating expense)
- **CREDIT**: `1020 - Bank Clearing Account (Paystack DVA)`: **₦100,000** (Clearing account zeroed out)

---

## 14. Suspense Account Management

```
Bank Transfer Arrives via DVA
              │
              ▼
    Is Account Recognized?
    ├── YES ──► Normal Invoice Allocation Engine
    └── NO  ──► SUSPENSE QUEUE ROUTING
                     │
                     ▼
             Create SuspenseTransaction Record (Status: 'PENDING')
             Post General Ledger:
               DEBIT   1020 - Bank Clearing Account
               CREDIT  2050 - Unallocated Suspense Funds
                     │
                     ▼ (Bursar identifies student: "Chinedu Okafor")
             Execute Manual Suspense Allocation Transaction:
               DEBIT   2050 - Unallocated Suspense Funds
               CREDIT  1200 - Student Accounts Receivable
             Update SuspenseTransaction Status: 'ALLOCATED'
```

---

## 15. Physical Cash & Custody Handover Accounting

Physical cash payments introduce the highest risk of internal shrinkage and bookkeeping discrepancies in private schools. BursarOS models this using a **Dual-Control Maker-Checker Cash Custody Engine**.

### Step 1: Bursar Logs Counter Cash Receipt (Maker)
When a parent hands physical cash to the Bursar:
- `Payment` record created (`paymentMethod: 'CASH'`, `isCashRemitted: false`).
- Invoice balance allocated.
- **Ledger Posting**:
  - **DEBIT**: `1010 - Cash on Hand (Bursar Counter Drawer)`
  - **CREDIT**: `1200 - Student Accounts Receivable`
- *Custody Responsibility*: The physical Naira notes are legally the Bursar's personal liability.

### Step 2: End-of-Day Shift Closeout (Maker)
- Bursar batches all unremitted cash receipts into a `CashHandover` record.
- Status set to `PENDING_VERIFICATION`.

### Step 3: Proprietor Verifies & Confirms Handover (Checker)
The Proprietor physically counts the cash notes or inspects the commercial bank deposit slip:
- Status updated to `CONFIRMED_BY_PROPRIETOR`.
- Linked payments marked `isCashRemitted: true`.
- **Ledger Posting**:
  - **DEBIT**: `1030 - School Commercial Operating Account` (or Proprietor Vault)
  - **CREDIT**: `1010 - Cash on Hand (Bursar Counter Drawer)`
- *Result*: The Bursar's drawer balance (`1010`) returns to **₦0.00**.

---

## 16. Financial Audit Trails, Verification & Period Closing

To support independent audits, the financial domain provides three automated reconciliation checks:

### 1. General Ledger Balance Trial Balance
At any point, querying the trial balance checks mathematical integrity:
```sql
SELECT 
  schoolId,
  SUM(CASE WHEN isDebit THEN amountKobo ELSE 0 END) AS totalDebitsKobo,
  SUM(CASE WHEN NOT isDebit THEN amountKobo ELSE 0 END) AS totalCreditsKobo,
  SUM(CASE WHEN isDebit THEN amountKobo ELSE -amountKobo END) AS discrepancyKobo
FROM "LedgerPosting"
GROUP BY schoolId;
```
If `discrepancyKobo != 0`, an alert triggers and automated reconciliation halts.

### 2. Sub-Ledger to General Ledger Verification
The sum of all active student invoice balances must exactly equal the balance of `1200 - Student Accounts Receivable`:
$$\sum (\text{Invoice.totalAmountKobo} - \text{Invoice.amountPaidKobo}) \equiv \text{Balance of Account 1200}$$

### 3. Accounting Period Locks
At the conclusion of each academic term, the Proprietor can issue an **Accounting Period Close**. All journal entries dated within that period are locked against edits or reversals. Any retroactive adjustments must be posted in the active, open period.

---

## 17. Database Constraints, Locking & Isolation Boundaries

To guarantee that concurrent webhooks and cash entries do not cause double-counting or phantom updates, the database enforces the following constraints:

```sql
-- 1. Enforce strict positivity on all posting amounts
ALTER TABLE "LedgerPosting" ADD CONSTRAINT "chk_posting_amount_positive" 
CHECK ("amountKobo" > 0);

-- 2. Prevent identical transaction reference double-posting
ALTER TABLE "JournalEntry" ADD CONSTRAINT "chk_unique_tenant_reference" 
UNIQUE ("schoolId", "reference");

-- 3. Webhook idempotency reservation table
CREATE TABLE "ProcessedWebhook" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "eventReference" TEXT NOT NULL,
    "status" TEXT NOT NULL, -- 'PROCESSING', 'COMPLETED', 'FAILED'
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProcessedWebhook_provider_eventReference_key" UNIQUE ("provider", "eventReference")
);

-- 4. B-Tree Indexes on all Foreign Keys and Search Columns
CREATE INDEX "idx_posting_account" ON "LedgerPosting"("accountId");
CREATE INDEX "idx_posting_journal" ON "LedgerPosting"("journalEntryId");
CREATE INDEX "idx_journal_school_date" ON "JournalEntry"("schoolId", "postedAt");
```

### Concurrency Isolation Strategy
- When reconciling payments against invoices, queries use `SELECT ... FOR UPDATE` via raw SQL or an explicit database lock on the target `Student` and `Invoice` rows:
  ```javascript
  // Acquire row-level lock on student during reconciliation
  await tx.$executeRaw`SELECT id FROM "Student" WHERE id = ${studentId} FOR UPDATE`;
  ```
- This prevents parallel webhook deliveries from calculating simultaneous allocations against the same open invoice.

---

## 18. Comprehensive Worked Examples (Realistic Nigerian Scenarios)

### Scenario 1: Standard First Term Tuition Billing
- **Context**: Crown Heights College bills student **Chinedu Okafor (JSS 1)** for First Term 2026/2027.
- **Bill Components**:
  - Tuition Fee: ₦110,000 ($11,000,000\text{ Kobo}$)
  - ICT & Science Lab Fee: ₦25,000 ($2,500,000\text{ Kobo}$)
  - PTA Levy: ₦15,000 ($1,500,000\text{ Kobo}$)
  - **Total Billed**: **₦150,000** ($15,000,000\text{ Kobo}$)
- **Accounting Transaction**:
  - `JournalEntry.reference`: `JRN-BILL-JSS1-ADM101-T1`
  - Postings:
    | Account Code & Name | Debit (Kobo) | Credit (Kobo) | Naira Equivalent |
    | :--- | :---: | :---: | :---: |
    | **1200 - Student Accounts Receivable** | **15,000,000** | — | **₦150,000 (Debit)** |
    | **4010 - Tuition Fee Revenue** | — | 11,000,000 | ₦110,000 (Credit) |
    | **4030 - Science & ICT Laboratory Fees**| — | 2,500,000 | ₦25,000 (Credit) |
    | **4040 - PTA & Co-Curricular Levies** | — | 1,500,000 | ₦15,000 (Credit) |
  - **Balances After**: Debits ($15,000,000$) = Credits ($15,000,000$). Chinedu owes ₦150,000.

---

### Scenario 2: Parent Makes Exact Fee Payment via Paystack DVA
- **Context**: Chinedu's mother transfers **₦150,000** to Chinedu's Dedicated Virtual Account (`9910000101` - Wema Bank).
- **Trigger**: Paystack delivers `charge.success` webhook with reference `PSTK-REF-99201`.
- **Accounting Transaction**:
  - `JournalEntry.reference`: `JRN-PYMT-PSTK-REF-99201`
  - Postings:
    | Account Code & Name | Debit (Kobo) | Credit (Kobo) | Naira Equivalent |
    | :--- | :---: | :---: | :---: |
    | **1020 - Bank Clearing (Paystack DVA)** | **15,000,000** | — | **₦150,000 (Debit)** |
    | **1200 - Student Accounts Receivable** | — | **15,000,000** | **₦150,000 (Credit)** |
  - **State Changes**:
    - `Invoice.amountPaidKobo` updated to `15000000`.
    - `Invoice.status` transitions from `ISSUED` $\rightarrow$ `PAID`.
    - Student debt reduced to ₦0.00.

---

### Scenario 3: Partial Payment Followed by Overpayment (Split Allocation)
- **Step 1**: Parent pays **₦100,000** on an invoice of ₦150,000.
  - **DEBIT**: `1020 - Bank Clearing Account`: **₦100,000**
  - **CREDIT**: `1200 - Student Accounts Receivable`: **₦100,000**
  - Invoice Status: `PART_PAID` (Remaining balance: ₦50,000).
- **Step 2**: Two weeks later, parent mistakenly transfers **₦80,000** (₦30,000 more than the ₦50,000 remaining debt).
  - Allocation Breakdown:
    - ₦50,000 satisfies remaining invoice balance.
    - ₦30,000 allocated to Student Credit Wallet (Prepaid Tuition).
  - Postings:
    | Account Code & Name | Debit (Kobo) | Credit (Kobo) | Naira Equivalent |
    | :--- | :---: | :---: | :---: |
    | **1020 - Bank Clearing (Paystack DVA)** | **8,000,000** | — | **₦80,000 (Debit)** |
    | **1200 - Student Accounts Receivable** | — | **5,000,000** | **₦50,000 (Credit)** |
    | **2100 - Prepaid Student Fees** | — | **3,000,000** | **₦30,000 (Credit)** |
  - **State Changes**:
    - Invoice Status: `PAID`.
    - Student Credit Wallet: ₦30,000 balance available for Second Term.

---

### Scenario 4: Direct Unannounced Bank Transfer (Suspense Account Lifecycle)
- **Context**: A parent executes a ₦75,000 mobile app transfer directly to the school's general account with the narration `"SCHOOL FEES FOR MY SON"`, omitting the student's name or admission number.
- **Ingress**: Payment arrives without a matching DVA.
- **Step 1: Park in Suspense**:
  - `SuspenseTransaction` created with reference `BANK-TRF-0038192`.
  - Postings:
    | Account Code & Name | Debit (Kobo) | Credit (Kobo) | Naira Equivalent |
    | :--- | :---: | :---: | :---: |
    | **1020 - Bank Clearing Account** | **7,500,000** | — | **₦75,000 (Debit)** |
    | **2050 - Unallocated Suspense Funds** | — | **7,500,000** | **₦75,000 (Credit)** |
- **Step 2: Identification & Allocation**:
  - Three days later, parent brings transfer receipt to Bursar. The transfer belongs to **Usman Bello (JSS 1)**.
  - Bursar allocates `BANK-TRF-0038192` to Usman Bello's open invoice in the UI.
  - Postings:
    | Account Code & Name | Debit (Kobo) | Credit (Kobo) | Naira Equivalent |
    | :--- | :---: | :---: | :---: |
    | **2050 - Unallocated Suspense Funds** | **7,500,000** | — | **₦75,000 (Debit)** |
    | **1200 - Student Accounts Receivable** | — | **7,500,000** | **₦75,000 (Credit)** |
  - Suspense balance returns to ₦0.00; Usman's invoice balance decrements by ₦75,000.

---

## 19. Edge Cases, Race Conditions & Failure Modes

### 1. Duplicate Webhook Arrival (Simultaneous Threads)
- **Hazard**: Paystack sends two concurrent HTTP requests for `charge.success` with reference `REF-12345`.
- **Handling**:
  - Thread 1 attempts `INSERT INTO "ProcessedWebhook" ("eventReference") VALUES ('REF-12345')`.
  - Thread 2 attempts the identical insert simultaneously.
  - PostgreSQL's unique constraint causes Thread 2 to fail immediately with error `P2002` (or abort via `ON CONFLICT DO NOTHING`).
  - Thread 2 rolls back its transaction and responds with `HTTP 200 { received: true, duplicate: true }`.
  - Only Thread 1 posts to the ledger.

### 2. Network Crash During Webhook Ingestion
- **Hazard**: Server crashes while writing to `InvoiceAllocation`, after inserting `Payment`.
- **Handling**:
  - The entire operation runs inside a single `prisma.$transaction`.
  - PostgreSQL rolls back all mutations atomically.
  - When Paystack retries the webhook 5 minutes later, the server reprocesses from a clean slate.

### 3. Out-of-Order Webhook Delivery
- **Hazard**: A refund webhook arrives before the original payment webhook due to network routing delays.
- **Handling**:
  - The refund handler queries the original payment reference. If missing, it places the refund event on the BullMQ delayed retry queue (with exponential backoff) rather than failing.

---

## 20. Incremental Migration from Existing Financial Model

The migration from the existing direct-mutation codebase to the double-entry financial architecture must execute without taking down active school operations.

```
Migration Phase Plan
├── Phase A: Non-Breaking Schema Deployment
│   └── Deploy LedgerAccount, JournalEntry, LedgerPosting, ProcessedWebhook tables
├── Phase B: Historical Ledger Backfill
│   └── Run data script calculating historical totals and creating initialization journals
├── Phase C: Dual-Write Shadow Mode
│   └── New payments update invoice columns AND write double-entry journal entries
├── Phase D: Verification & Cutover
│   └── Verify zero-discrepancy balance match; flip invoice reads to ledger projections
```

### Phase A: Non-Breaking Schema Deployment
- Run a Prisma migration adding the ledger models.
- Existing routes and controllers continue running uninterrupted.

### Phase B: Historical Ledger Backfill Script
- Run an administrative migration script:
  1. For each registered school, seed the standard Chart of Accounts.
  2. For all existing `Student` records with issued invoices, calculate cumulative invoiced amounts and post an initial **Opening Balance Journal**:
     - **DEBIT**: `1200 - Student Accounts Receivable`
     - **CREDIT**: `4010 - Tuition Fee Revenue`
  3. For all existing `Payment` records with `status = 'success'`, post an initial **Settled Payment Journal**:
     - **DEBIT**: `1020` or `1010` (Cash/Bank)
     - **CREDIT**: `1200 - Student Accounts Receivable`
  4. Compare the calculated ledger balance with the current `Invoice.balance` column.

### Phase C: Dual-Write Shadow Mode
- Refactor `paymentController.js` and `paystackWebhookController.js` to execute both the legacy update and the double-entry posting inside the same transaction.
- If the ledger verification fails, log an error to Pino without aborting the HTTP response.

### Phase D: Cutover to Pure Ledger Architecture
- Cease manual mutations to `amountPaidKobo` on `Invoice`.
- Invoice paid status and student debt calculations derive strictly from `InvoiceAllocation` and `LedgerPosting` aggregations.
- Legacy balance columns are marked read-only or deprecated.

