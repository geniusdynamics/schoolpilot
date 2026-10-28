---
name: Pack correction
about: Report a pack figure that disagrees with an official source document
title: '[pack correction] '
assignees: ''
---

<!-- A correction without a cited official source cannot be reviewed: the pack
     steward has no way to tell a bug from a preference. See
     docs/packs/STEWARDSHIP.md for what a steward checks. -->

## The pack

- **Pack id** (from `pack.json` or `country.json`) — required:
- **Pack version** (`version` in the same file) — required:
- **File and key** the wrong figure sits in (for example
  `ke-cbe/assessment.json` → `grading_scales.cbe_8_level.bands`) — required:

## Official source document

- Title, issuer, URL and the date you retrieved it — required:
- The page, table or clause that states the correct value — required:
- If the document is not in English, quote the relevant line and translate it:

## Current behaviour

<!-- What the pack says today, quoted, with the value. — required -->

## Expected behaviour

<!-- What the official source says, quoted, with the value. — required -->

## Conformance vector or example

<!-- Required: either a vector for tests/*.vectors.json that would fail against
     the current pack and pass against the corrected one, or a worked example from
     the source (a sample result slip, a marked paper, a printed table) with the
     arithmetic. "verified" status depends on vectors traced to an official
     example, so a correction with no example leaves the pack draft. -->

```json
{
  "vectors": [
    { "name": "<what this pins>", "programme": "<pack id>", "input": { }, "expect": { } }
  ]
}
```

## Version bump

- [ ] Patch — a label, comment or typo fix, no result changes
- [ ] Minor — a new option or template, existing results unchanged
- [ ] Major — a structural change: levels, learning areas or a result that schools
      have already reported against

## Does this change a result a school has already reported?

<!-- Yes / no. If yes, say which academic year and whether the correction is
     retroactive; a published report is frozen (spec 03 C-8). -->
