# Accounting connectors

Journal exports for the four systems spec 06 §9 names — QuickBooks, Xero, Odoo and ERPNext (the existing
ERPNext plug-in keeps the entity sync; this plug-in owns the journal export). Nothing here posts to a
ledger: an export validates a batch of posted entries and writes a file or a payload, and the bursar
sends it to the accounting system.

The plug-in SDK is not wired into the host yet: this is plug-in-shaped code (`plugin.json` validates
against `src/plugins/sdk`) with its own tests.

## The contract

`exportJournal(batch, mapping)` is the whole surface.

1. `validateBatch` turns the caller's batch into `AccountingDocument`, the intermediate representation
   every connector renders. It refuses, with `{ path, message }` issues collected in one pass:
   - an empty batch (`entries`);
   - an entry dated by anything but an ISO day, with no reference or no narration (`entries[n].date`, …);
   - an entry with fewer than two lines, or debits that do not equal credits (`entries[n]`);
   - a line with both sides, neither side, a non-positive amount, or an account code the mapping does not
     hold (`entries[n].lines[m]`, `mapping["4000"]`, with the account's name when the caller states it);
   - an amount the batch currency cannot hold — `1250.005` in KES is refused rather than rounded, and a
     UGX amount may not carry decimals at all;
   - a target identifier the mapping lacks (Odoo needs a journal, ERPNext a company);
   - a target that has no connector.
2. The connector renders the document. A batch that is refused in any part is refused in full, so a
   partly mapped batch never reaches a ledger.

Amounts are decimal strings of major units (`'1250.00'`), never floats, and every total is summed in
minor units with the platform's money module.

## The mapping file

```json
{
  "accounts": {
    "1100": { "targetCode": "1100", "targetName": "Fee receivables" },
    "4000": { "targetCode": "4100", "targetName": "Tuition revenue" }
  },
  "journal": "3",
  "company": "Nova Schools"
}
```

`targetCode` and `targetName` mean what the target needs:

| Target | `targetCode` | `targetName` | also needed |
| --- | --- | --- | --- |
| QuickBooks Online | unused | the account name QuickBooks holds | — |
| Xero (CSV and API) | the Xero account code | unused | — |
| Odoo | the `account.account` database id | unused | `journal`: the `account.journal` id |
| ERPNext | unused | the Account docname | `company`: the Company docname |

`unmappedAccounts(batch, mapping)` lists every school account still missing, once per account with the
number of lines that post to it, so the bursar fixes one mapping row per account.

## What each target writes

### QuickBooks Online — CSV import

`quickbooks-journal-<from>_<to>.csv`, one row per line, headed
`Journal No.,Journal Date,Account Name,Journal/Description,Debits,Credits,Class`.

Written against Intuit's help article
<https://quickbooks.intuit.com/learn-support/en-us/help-article/import-export-data-files/import-journal-entries-quickbooks-online/L4tQBwbs7_US_en_US>,
which names `Journal No.`, `Journal Date`, `Account Name`, `Journal/Description`, `Debits` and `Credits`
and says class and location tracking can be turned on to import journals that carry them.

Draft fields: `Journal Date` (the article fixes no date format; ISO `YYYY-MM-DD` is written and the
import screen maps the column) and `Class` (the article confirms class tracking, not the header it
writes). The article also notes account numbers must be off, which is why the account name is written.

### Xero — manual journal CSV import

`xero-journal-<from>_<to>.csv`, headed `Narration,Date,Description,AccountCode,Debit,Credit`, the
narration and date repeated on every line of an entry.

Draft fields: `header row` and `column order`. Xero Central's import article
(`central.xero.com/s/article/Add-import-and-post-manual-journals`) answers automated requests with a
CAPTCHA and could not be read, so the header is written from the field names the Accounting API uses and
a bursar compares it with the template Xero's Import screen downloads before importing.

### Xero — Accounting API ManualJournals payload

`xero-manual-journals-<from>_<to>.json`, `POST /api.xro/2.0/ManualJournals`. Written against the
`ManualJournal` and `ManualJournalLine` schemas in Xero's OpenAPI specification
(<https://raw.githubusercontent.com/XeroAPI/Xero-OpenAPI/master/xero_accounting.yaml>) and the API page
<https://developer.xero.com/documentation/api/accounting/manualjournals>: `Narration` (the one required
field), `Date`, `Status`, `LineAmountTypes`, and `JournalLines` of `Description`, `LineAmount` and
`AccountCode`. A line amount is positive for a debit and negative for a credit, as the schema says.

Every journal is written `Status: "DRAFT"`, so even this path posts nothing until a person posts it. No
field is draft.

### Odoo — account.move payload

`odoo-account-moves-<from>_<to>.json`, the documents a sender creates with
`models.execute_kw(db, uid, password, 'account.move', 'create', [...])` from the documented external API
(<https://www.odoo.com/documentation/18.0/developer/reference/external_api.html>). Field names are from
Odoo 18's own models (`account_move.py`, `account_move_line.py`): `move_type: 'entry'`, `journal_id`,
`date`, `ref`, and `line_ids` of `name`, `account_id`, `debit` and `credit`.

Draft field: `account_id and journal_id as Odoo database ids`. A many2one takes an id; Odoo documents no
lookup by account code over RPC, so the mapping carries the ids Odoo assigned and a non-numeric one is
refused rather than posted to whatever record happens to carry that id.

A cost centre is **not** carried: Odoo expresses it as an analytic distribution, and the payload ships no
analytic, so a school that reports by cost centre adds it in Odoo after import.

### ERPNext — Journal Entry payload

`erpnext-journal-entries-<from>_<to>.json`, one document per entry for
`POST /api/resource/Journal Entry` (<https://docs.frappe.io/framework/user/en/api/rest>), as the user
manual describes (<https://docs.frappe.io/erpnext/user/manual/en/journal-entry>). Field names are the
doctype's: `company`, `posting_date`, `cheque_no` (Reference Number), `user_remark`, `voucher_type`, and
the `accounts` child table of `account`, `debit_in_account_currency`, `credit_in_account_currency`,
`cost_center` and `user_remark`. No field is draft.

The cost centre is written exactly as the batch states it, so it must be the Cost Center docname in
ERPNext.

## Limits, deliberately

- **Sage is not implemented.** Spec 06 §9 lists it, but the task's build list names QuickBooks, Xero, Odoo
  and ERPNext, and no Sage import format could be confirmed from documentation, so a connector would have
  been invented format by format.
- **Xero tracking categories are dropped.** A tracking option needs its category name, which the batch
  does not carry; adding it in Xero is the honest alternative to guessing.
- **Odoo analytics are dropped**, as above.
- **Amounts in JSON payloads are JSON numbers.** The text written is already at the currency's scale; the
  receiving system stores it at its own.
