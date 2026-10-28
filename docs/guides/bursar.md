# Bursar's guide

The money side of SchoolPilot, in the order the work happens: set up what a term costs → bill the
term → take the money and hand over a receipt → give a statement → follow up the parents who have
not paid → close the books.

Written for a bursar or accounts clerk. It assumes you can use a browser and that someone has
already set the school up (see the [administrator's guide](administrator.md) if not).

> Each step gives the sidebar path and the address in brackets. Some finance sidebar entries have
> no English label yet and display as their translation key; the address is the reliable part. See
> [the guide index](README.md).

## 1. What a term costs: fee configuration

**Finance → Fee Configuration** (`/finance/fee-configuration`) has five tabs.

| Tab | What you use it for |
| --- | --- |
| **Fee items (vote heads)** | The things you charge for: tuition, transport, lunch, activity, exam. Each item is one line a fee schedule can price. |
| **Fee schedules** | The matrix of price per level, per residence (day/boarding) and per fee item, for one term. |
| **Structures** | The fee structure view, and where the billing run is launched from this hub. |
| **Templates** | Reusable fee templates. |
| **Receipt Template** | The wording and layout the receipt prints with. |

### 1.1 Fee items

Open **Fee items (vote heads)** and add each charge with **Add fee item**. Keep the list short and
stable: the name on the item is the name on the invoice and the statement, and a renamed item
splits a report in two.

### 1.2 A fee schedule, and the approval it needs

Open **Fee schedules** — the card is titled *Fee schedules (the matrix)*. This is the only place a
price becomes billable, and it is versioned:

1. Pick the **Version** in the version list, or create one. A version carries a status: `draft`,
   `submitted`, `approved`, `published`.
2. Price the matrix cells. Each cell is one level × residence × fee item for the term.
3. **Save the draft**.
4. **Submit for approval** — from here the version is somebody else's to approve.
5. An approver presses **Approve**, or **Send back** with a **Reason**. The approval permission is
   separate from the write permission on purpose: whoever sets the price should not also approve it.
6. **Publish** the approved version. Only a published version prices a billing run; an approved but
   unpublished one is refused.

**Version history** below the matrix lists every version and its status. Never edit a published
version to change a price mid-term — create the next version, so the invoices already posted keep
the price they were billed at.

> On a fresh installation the matrix starts empty and offers **Load the spec §2.2 example**, which
> fills a sample schedule. It is for trying the screen out, not for a real school: replace every
> cell with your own prices before you publish.

### 1.3 Rules: fines, instalments, adjustments

**Finance → Fee Rules** (`/finance/fee-rules`) has three tabs — **Fines**, **Installments**,
**Adjustments**. These are policy rows (a late-payment fine, a payment plan, a per-learner
adjustment) that the billing and receipting screens read. Read every row before the first billing
run of a term: a fine configured last year is still configured this year.

## 2. Billing the term

**Finance → Invoicing** (`/finance/invoicing`) → **Invoice Generation** tab. (The same run is at
`/finance/billing-runs`.) The card is *Billing runs*.

1. **Academic period** — choose the term. Nothing bills until a period is chosen.
2. **Fee schedule** — leave it on *Every version in force* unless you are deliberately billing one
   version; the run prices from the version in force on the period's dates.
3. **Level** — optional; use it to bill one cohort at a time.
4. **Preview** — read the result before touching anything. The panel shows:
   - how many invoices it *would* create, for how much, how many learners billed and how many
     skipped;
   - one line per learner with the reason each item is charged, and a prorated note where the
     learner joined mid-term;
   - **Exceptions**, grouped and counted: *No enrolment for the year*, *Not enrolled during the
     period*, *No schedule prices this learner*, *The fee matrix cannot resolve their cell*,
     *Already billed*, *Nothing is due*, *Outside this run's cohort*.
5. Fix what the exceptions tell you, preview again.
6. **Post the run**. The panel reports *Billing run posted*, the invoice numbers it issued
   (`INV/2027/1/1` and so on) and the journals it wrote.

Two properties worth knowing: the run is **idempotent** — re-running the same run bills nothing
twice and says so — and **one transaction** — either the whole run posts or none of it does.

Optional extras on the same panel, under *One-off charges and opening balances*: a single charge
(fine, adjustment, other) against one learner, and an opening balance per learner, marked **Owes**
or **In credit** as at a date. Use an opening balance when a learner joins with a history from
another system; do not fake it with a credit note.

## 3. Taking money

### 3.1 The cashier counter

**Finance → Payments** (`/finance/payments`) → **Cashier** tab. The counter is built for the
keyboard: search the learner, amount, channel, reference, Enter, print.

1. **Open session** with an **Opening float**. The drawer is now open for this cashier.
2. **Learner (admission number, name)** — type the admission number or part of the name; the
   matches appear as you type.
3. **Amount**.
4. **Channel** — digits 1–6 pick it: Cash, Bank deposit / transfer, Cheque, Mobile money, Card,
   In-kind.
5. **Reference** — required for every channel except cash: the slip number, cheque number or
   provider transaction id. The receipt prints it.
6. **Save (Enter)**. The receipt card appears: payer, learner, amount, amount in words, channel,
   reference, how the money was allocated by vote head (or *Unallocated (learner credit)* when it
   covers nothing yet), balance after and the cashier.
7. **Print receipt (Enter)**.
8. At the end of the shift, count the notes, type the **Counted cash** and **Close session**. The
   **Z-report** shows per-channel counts and amounts, the total, and the expected cash against what
   you counted. Only cash is counted in the drawer; every other channel is reported beside it.

### 3.2 Recording a payment against an invoice

**Finance → Payments → Student Payments** tab, **Record payment**. The dialog takes the learner, the
amount, a reference and — the part that matters — the invoice to allocate it to. Allocating to the
invoice is what makes the invoice show as collected; an unallocated payment sits as learner credit
until you use the **Payment Allocation** tab to place it.

### 3.3 Receipt numbers

Every receipt — from the cashier or from the **Student Payments** dialog — is numbered from the same
year-scoped sequence, in the form `RCT/2027/000001`, and a number is never reused. There is one
auditable series whether you take the payment at the counter or record it here.

## 4. Statements

**Finance → Statements** (`/finance/statements`).

1. **Statement for** — *A learner*, *A household* or *A sponsor*.
2. Pick the learner/household/sponsor, and the **From** and **To** dates.
3. **Refresh**, then read: an *Agrees with the ledger* / *Does not agree with the ledger* badge,
   the opening and closing balance, the running account, the **Aging** of what is outstanding and
   the clearance state.
4. **Print** for the parent, **CSV** for your own analysis.

A statement that does not agree with the ledger is a support call, not a parent call: note the
learner and the date range and hand it to the administrator.

## 5. Following up the parents who have not paid

| What you need | Where | Address |
| --- | --- | --- |
| Everyone still owing, with how much and how old | Reports → **Finance** → **Fees Due** tab | `/reports/finance?tab=fees-due` |
| Who has paid, by date and amount | Reports → **Finance** → **Students Paid** tab | `/reports/finance?tab=students-paid` |
| One vote head across the school | Reports → **Finance** → **Votehead Statement** tab | `/reports/finance?tab=votehead-statement` |
| Collection by day or by cashier | Finance → Payments → **Collection Summary** | `/finance/payments?tab=collection-summary` |
| One learner's balance and history | Finance → Payments → **Financial Summary**, search by name or admission number | `/finance/payments?tab=financial-summary` |
| A learner's fee history, opening balances and previous session | Finance → **Student Fee History** | `/finance/student-fee-history` |

Work the *Fees Due* list from the oldest balance down. For each household, print the statement
(section 4) rather than quoting a number from a grid: the statement is the document the parent can
check.

## 6. Expenses and the books

| Screen | Address | What it is |
| --- | --- | --- |
| **Expenses** | `/finance/expenses` | Supplier bills and payments out. The **Suppliers** tab holds the supplier list. |
| **Accounting Config** | `/finance/accounting-config` | Chart of accounts, banks. |
| **Financial Years** | `/finance/financial-years` | The accounting year a journal belongs to. |
| **Accounting Ops** | `/finance/accounting-ops` | **Account Ledger**, **Cash Book**, **Day Book**, **Journal Register**. |
| **Financial Statements** | `/finance/financial-statements` | **Trial Balance**, **Balance Sheet**, **Income Statement**. |
| **Accounting Reports** | `/finance/accounting-reports` | Report pack including **Period Close**. |
| **Transport** | `/finance/transport` | Routes and per-learner transport charges. |

Close a period only after the receipts for it are entered: a period close made before the last
receipt of the month leaves that receipt in the next period.

## What the app cannot do yet

- **One receipt series.** See section 3.3.
- **Automatic bank or M-Pesa reconciliation.** A mobile-money payment is recorded by hand with its
  provider reference; nothing imports a statement.
- **SMS or email reminders from the finance screens.** The Communication module exists under
  Administration, but no finance screen sends a reminder, and no message gateway is configured by
  default.
- **Refunds and write-offs with a second signature.** The permission model defines the maker and
  checker roles, but the finance services do not consult them for a billing run, a period close or a
  discount (the gap is written down in `src/data/auth/README.md`). Until that lands, a refund is a
  manual adjustment with a paper trail outside the app.
- **A printed trial balance to a fixed template.** The statements are on screen; use the browser's
  print.

---

Menu labels and addresses were checked against `src/modules/finance/moduleDefinition.tsx`, the
page components under `src/modules/finance/pages/`, the reports hub
(`src/modules/reports/pages/FinancialReportsHubPage.tsx`) and the English locale files on
2026-10-28. The receipt-number difference is documented in the GP-1 end-to-end spec
(`tests/e2e/gp1-lite.spec.ts`). The steps were not walked with a real payment during this review.
