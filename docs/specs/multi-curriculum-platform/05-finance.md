# 05 — Finance: Fees, Billing, Payments and Accounting

## 1. Money rules

- `Money = { amount_minor: integer, currency: ISO-4217 }`; precision from a currency table (KES/NGN/GHS/ZAR/USD/GBP 2, UGX/RWF/XOF/XAF 0, TZS 2 with whole-shilling display by default).
- **No maximum amounts.** Today's `maximum: 999999.99` cannot hold a year of international-school fees in KES or *any* term in UGX/TZS; remove it.
- No floating point in storage or arithmetic; allocation splits use largest-remainder rounding so lines always sum exactly.
- Each institution has a **base currency**; fee schedules may be priced in another currency (e.g. USD at an international school in Nairobi). Invoices record the currency; payments in a different currency record the rate used and the base-currency equivalent.
- Formatting via `Intl.NumberFormat(locale, { style: 'currency', currency })` — `formatKES` becomes `formatMoney`.

## 2. Fee configuration

### 2.1 Fee items (vote heads)
`fee_item`: code, name, revenue account, category (tuition, boarding, meals, transport,
activity, exam, development/levy, uniform/books, deposit, fine, other), `refundable`,
`taxable`, `priority` (for allocation), `funding_source` (parent, government capitation,
sponsor). Kenyan public schools can map items to government vote heads and record
capitation received (e.g. Free Day Secondary / Free Primary Education grants) as a separate
funding source so parent-payable fees are shown net of capitation.

### 2.2 Fee schedule (the matrix)
A **fee schedule** is a versioned, approved set of lines that apply to a population:

| Dimension | Examples |
| --- | --- |
| Academic year & period(s) | 2027 Term 1; "annual, billed per term"; one-off |
| Programme / level(s) | Grade 7–9; Form 1; Year 10–11 |
| Residence status | day, boarder, weekly boarder |
| Fee category | citizen / non-citizen, staff child, sponsored, special needs |
| Campus | Main, Annex |
| New vs continuing | admission-only items (admission fee, caution money, uniform pack) |

Each **line**: fee item, amount, mandatory/optional, frequency (per term, per year, monthly,
one-off at admission), due date(s), installment plan, proration rule for mid-period
joiners/leavers (`full`, `none`, `pro_rata_weeks`, `pro_rata_days`, `from_half_term`).

Optional services are **subscriptions** (learner × service × period): transport (by
route/zone), lunch programme, clubs, trips, remedial classes; each subscription produces
invoice lines in billing runs.

Lifecycle: `draft → submitted → approved (maker-checker) → published → archived`. Tools:
copy from previous year with a % or fixed uplift; matrix editor (levels × residence);
side-by-side comparison; publish notice to guardians.

**Example (Kenyan mixed day/boarding secondary, 2027 Term 1, KES):**

| Fee item | Grade 10 day | Grade 10 boarder | Form 3/4 day | Form 3/4 boarder |
| --- | --- | --- | --- | --- |
| Tuition | 6,000 | 6,000 | 5,500 | 5,500 |
| Boarding & meals | — | 18,500 | — | 17,000 |
| Lunch (optional subscription) | 4,200 | — | 4,200 | — |
| Activity | 1,000 | 1,000 | 1,000 | 1,000 |
| Exam (KCSE registration, F4 only) | — | — | 0 / 5,000 | 0 / 5,000 |
| Admission (new learners only, one-off) | 2,000 | 2,000 | — | — |

(Illustrative amounts only.)

### 2.3 Discounts, waivers and sponsorships
- **Rules**: sibling (e.g. 2nd child 5 %, 3rd+ 10 % on tuition only), staff child, early settlement, pay-in-full, special approvals.
- **Bursaries/scholarships**: percent or fixed, per fee item, per period, with funding source (school, CDF/NG-CDF, county bursary, NGO, church, alumni) and budget tracking.
- **Sponsorship / split billing**: a sponsor covers some lines or a share; the system issues a learner invoice for the residual and a **sponsor invoice/statement** for the sponsored part; sponsor payments are allocated across many learners in one receipt.
- All discounts are explicit invoice lines (negative) or credit notes — balances are always explainable.

## 3. Installments and payment plans
Plans per schedule (e.g. 50 % by opening day, 30 % by mid-term, 20 % by week 10) or per
learner (promise-to-pay agreements). Plans drive due dates, reminders and arrears aging;
late-payment penalties are optional and policy-controlled.

## 4. Billing runs

`billing_run`: period, scope (all, programme, level, class group, learners), schedules,
dry-run flag, status (`draft → previewed → posted → reversed`).

1. **Preview**: per learner, the lines that will be billed with reasons (schedule line, subscription, discount rule, proration). Exceptions panel: learners without residence status, conflicting schedules, missing guardian/payer.
2. **Post**: creates `invoice` (one per learner per period by default, or per payer) with immutable lines; numbering from a sequence (`INV/2027/T1/000123`); journal entries posted.
3. **Idempotency**: re-running adds only missing lines (e.g. learners admitted after the first run).
4. **Changes after posting**: enrolment changes (day→boarding, level change, exit) generate **adjustment invoices or credit notes** per proration rule — never edits.
5. **Ad-hoc charges**: fines, lost books, trips, replacements — single or bulk.
6. **Opening balances**: migration lines (`kind = opening_balance`, debit or credit) with as-of date.

**Acceptance:** billing Term 1 for 1,000 learners previews in ≤ 30 s and posts in ≤ 2 min on a 4 GB laptop; every learner's balance equals invoices − credits − payments allocated; re-running posts nothing new.

## 5. Payments

### 5.1 Channels
| Channel | Capture | Notes |
| --- | --- | --- |
| Cash | Cashier screen | Cashier sessions with opening float, closing count, variance; Z-report |
| Bank deposit / transfer | Manual entry or bank statement import (CSV/OFX/MT940) | Slip number; value date |
| Cheque | Manual | Status pending → cleared/bounced; bounced reverses allocation and may add a fee |
| **M-Pesa** (Kenya) | Daraja C2B (Paybill, account = admission no.) callbacks; STK Push from portal/SMS link; statement import fallback | Auto-match by account reference → learner; suspense queue for unmatched with fuzzy suggestions (name, phone, amount); B2C for refunds |
| Airtel Money, MTN MoMo (UG, GH, RW, ZM, CM, CI …), Orange Money | Provider APIs or aggregators | Same matching model |
| Card / aggregators | Flutterwave, Paystack, Pesapal, DPO, Stripe | Webhook-verified |
| In-kind | Goods received (e.g. maize, beans) valued at an approved rate | Common in rural schools; requires approval and stock link |

Payment integrations are **plug-ins** implementing a `PaymentProvider` interface:
`createCollectionRequest`, `verifyWebhook`, `parseStatement`, `refund`. Credentials stored
encrypted per institution; webhooks idempotent by provider transaction id.

### 5.2 Receipting
- Receipt number from a sequence per year/campus/cashier (`RCT/2027/000123`), assigned at post time, never reused; voids keep the number with status `void`.
- Formats: 80 mm thermal, A5, A4; e-receipt by SMS/WhatsApp/email with verification link.
- Receipt shows: payer, learner(s), amount in figures and words, channel and reference, allocation by vote head (where policy requires), balance after payment, cashier.
- **Keyboard flow**: search learner (admission no./name/phone) → amount → channel → reference → Enter → print. Target ≤ 20 s.

### 5.3 Allocation
- Policies: `oldest_invoice_first`, `vote_head_priority` (e.g. Kenyan public schools allocating to prescribed vote heads in order), `proportional`, `manual`.
- Unallocated amount becomes **learner credit**, auto-applied to the next invoice (configurable).
- Household payments can be split across siblings by rule or manually.
- Re-allocation is a reversal + new allocation with audit.

### 5.4 Refunds and reversals
Maker-checker approval; payout channel (cash, bank, mobile money B2C); partial refunds of
deposits on exit after clearance; reversal of mistaken receipts keeps the original record.

## 6. Statements, arrears and collections

- **Learner statement**: opening balance, invoices, discounts, payments, refunds, running balance, for any date range; **household statement** across siblings; **sponsor statement**.
- **Aging**: current, 1–30, 31–60, 61–90, 90+ days past due by learner, class group, level.
- **Reminders**: scheduled SMS/WhatsApp/email with pay links, tone templates (gentle → firm), quiet hours, opt-out, per-guardian channel; promise-to-pay capture.
- **Clearance status** per learner (cleared, on plan, in arrears) for exams/report release policies — policy off by default with a legal warning (03 §8.2).
- **Write-offs** with approval and reason.

## 7. Exit and clearance
On transfer/withdrawal: final pro-rata adjustments, deposit refund or offset, final statement, clearance certificate; outstanding balances move to an "alumni/former learner" receivables list.

## 8. Accounting

- **Chart of accounts templates**: Kenya public school (vote-head based), private school (IFRS-for-SMEs style), NGO-funded school; editable.
- **Automatic double entry** from invoices (Dr receivables / Cr revenue by fee item), payments (Dr bank/cash/mobile-money clearing / Cr receivables), refunds, credit notes, write-offs, capitation receipts.
- Books: cash book, bank book, mobile-money clearing account, general journal, ledger, trial balance, income & expenditure, balance sheet, budget vs actual.
- **Bank and mobile-money reconciliation**: import statements, auto-match, manual match, unreconciled report.
- **Period locking** and financial-year close with carry-forward.
- **Exports**: CSV/XLSX journals; connectors (plug-ins) for QuickBooks, Xero, Sage, Odoo, ERPNext (existing plug-in).

## 9. Payroll (interface only)

Country Payroll Packs provide statutory rules as **effective-dated data**: tax bands,
reliefs, social security, health insurance and levies (e.g. in Kenya PAYE, NSSF, SHIF and
the Affordable Housing Levy; rates change — never hard-code). The core provides staff pay
profiles, earnings/deductions, payroll periods, payslips, bank/mobile-money disbursement
files and statutory return exports through the pack.

## 10. Reports

Daily collections (by cashier, channel, vote head), collection vs expected by class/level,
defaulters list, fee balances by class, discount/bursary utilisation, sponsor statements,
revenue by fee item, M-Pesa unmatched queue, cashier variance, cash-flow forecast for the
term (expected installments), audit trail of financial changes.

## 11. Controls and permissions

| Action | Accounts clerk | Bursar | Head / Director | Auditor |
| --- | --- | --- | --- | --- |
| Receipt payment | ✓ | ✓ | — | view |
| Void receipt (same day) | request | ✓ | ✓ | view |
| Refund / write-off | request | prepare | approve | view |
| Edit fee schedule | — | prepare | approve | view |
| Post billing run | — | ✓ | approve if > threshold | view |
| Close period | — | prepare | approve | view |

Segregation of duties is enforced by permission scopes (06 §5); all financial actions are
immutable events with actor, time, device and reason.
