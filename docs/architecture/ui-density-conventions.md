# UI density conventions — heading sections

The owner's report: on most pages the heading section takes **over 40% of a short window** before any
real content appears. Three layers caused it, and each was re-implemented per page:

1. a **title row** (`<h1>`),
2. a **description row** under it (the sentence explaining the page),
3. a **permanent intro box** inside the content — a coloured panel repeating the same sentence,
   often with a title the card header already states.

The fix is not to delete information. It is to put the sentence where it is read once and out of the
way, and to stop paying a row for it on every visit.

## The rules

### 1. A page heading uses `PageHeaderWithTabs`

```tsx
<PageHeaderWithTabs
  title={t('page.title', 'Student Directory')}
  info={t('page.subtitle', 'Manage students across all stages: directory, bio data, …')}
  tabs={tabs}
  activeTab={activeTab}
  onTabChange={handleTabChange}
/>
```

- **`info`, not `subtitle`.** The component renders both through `InfoHint` (so an un-migrated page
  still behaves), but new and edited code passes `info` — the name says what it is.
- A page that hand-rolls its own header (`<div className="flex justify-between"><h1>…</h1><Button/>`)
  **is converted to `PageHeaderWithTabs`** with `title`, `info` and `action`. That is what makes the
  system consistent, and it is why the Events Manager page now looks like its neighbours.

### 2. A card's explanation goes on the card header

```tsx
<Card title="Trial Balance" info="The Trial Balance summarizes all ledger account balances…">
```

### 3. Delete the permanent intro box

A coloured panel whose only content is a heading plus a sentence belongs on the card header:

```tsx
// DELETE this whole block…
<div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
  <div className="flex items-start gap-3">
    <ScaleIcon className="w-5 h-5 text-purple-600 mt-0.5" />
    <div>
      <h3 className="font-semibold text-purple-800">Debit/Credit Balance Summary by Account</h3>
      <p className="text-sm text-purple-700 mt-1">The Trial Balance summarizes…</p>
    </div>
  </div>
</div>
```

```tsx
// …and put its sentence on the card instead.
<Card title="Trial Balance" info="The Trial Balance summarizes…">
```

Signatures of the pattern to search for: `bg-purple-50`, `bg-emerald-50`, `bg-indigo-50`,
`bg-amber-50 border`, and generally `mb-6 p-4 bg-*` or `mb-6 rounded-lg border border-*-200 bg-*`
at the top of a card body. **~48 of these exist across ~40 files.**

A plain description paragraph directly under a card header (`<p className="text-sm …">Define academic
years…</p>`) is the same thing without the colour: move it to `info`.

### 4. A description that is genuinely an instruction stays

If a sentence tells the user what to do *now* ("Choose a period, then preview the run"), it is not a
heading explanation — leave it, or make it shorter. The rule targets sentences that describe **what
the page is**, not what to do next. Use judgement and say what you kept.

### 5. Reduce the dead space between the sections

- A page's outer wrapper: `space-y-6` → `space-y-3`.
- A `mb-6` immediately under a card header: → `mb-3` or `mb-4`.
- Do not touch padding inside data grids, forms or dialogs — this is about the heading region.

### 6. Never lose the information

Every sentence removed from a row must appear in an `info` tooltip. If a box contains something the
tooltip cannot hold (a diagram, a list, a live value), **keep the box** and say why in the report.

## Verification

- The task gate (`node scripts/prd/gate.mjs task --task <id> --base <sha>`) — G1 must not increase.
- **Run the existing tests.** Several assert a description's text is on screen; when the text moves
  into a tooltip it is still in the DOM only while the tooltip is open. Update those assertions to
  check the `InfoHint` (by its accessible name, e.g. `About this page`) rather than deleting them —
  a test that stops asserting anything is worse than the row it was guarding.
- Look at one page per module in a browser where you can. A cosmetic sweep that nobody looked at is a
  guess.
