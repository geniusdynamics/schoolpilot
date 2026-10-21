# Pack registry

The registry turns a parsed Curriculum Pack into the state a school runs on: it validates the
pack, records the pack version a programme is pinned to, keeps the school's overrides, and
previews an upgrade before anyone applies it. It is the only writer of `curriculum_pack` and of
the pack fields of `programme` in the domain layer.

```ts
import { createPackRegistry } from '@/domain/curriculum/registry';

const registry = createPackRegistry({
  repository,
  actor: currentUserId,
  source: (ref) => packLibrary.get(`${ref.code}@${ref.version}`),
});

const preview = await registry.previewUpgrade(programmeId, candidateDocument);
if (preview.safe) await registry.upgrade(programmeId, candidateDocument);
```

## What the registry writes

| Row | Field | What it records |
| --- | --- | --- |
| `curriculum_pack` | `code`, `version` | the pack source, one row per institution and version |
| `curriculum_pack` | `checksum` | `sha256:<hex>` over the canonical JSON of the pack document |
| `curriculum_pack` | `country`, `issuer`, `effective_from` | the manifest, so a list of sources reads without the library |
| `programme` | `curriculum_pack_code`, `pack_version` | the pin; this is what the engine and the wizard read |
| `programme` | `overrides` | one record per overridden pack path (below) |

The pack **content** is not copied into the database. The registry records the checksum and
resolves the document through the `source` it was given; a source that returns a different
document for the same `code@version` is refused with `checksum_mismatch`. That keeps the row
small and makes the source the single copy of the pack, at the cost of needing the library to be
present when an upgrade is previewed.

## Install

`install(programmeId, document)` records the pack source and pins the programme, in one
transaction. A programme "has" a pack once a source row records it:

- no source row for the programme's pin → this is a first install; the pin moves to the
  candidate and the source row is created. A pin the setup wizard set but never installed
  therefore does not block the install.
- a source row exists for the pin, and the candidate is another `code@version` →
  `upgrade_required`. Changing the pack a programme runs on is an upgrade, and an upgrade needs
  a preview.
- a source row exists for the candidate with the same checksum → the installation is returned
  unchanged; no write, no audit event. Re-running the wizard is safe.
- a source row exists for the candidate with a different checksum → `checksum_conflict`. A
  `code@version` is immutable; publish a new version instead.

An invalid pack is refused before the transaction opens, so nothing is written at all.

## Upgrade

`previewUpgrade(programmeId, document)` reads only. It resolves the installed pack through the
source, verifies its checksum, and returns:

- `changes` — added, removed and changed entries per section, with the top-level fields that
  differ for a changed entry (`learning_areas`, `levels`, `stages`, `pathways`, `grading_scales`,
  `schemes`, `aggregations`, `reports`, `locales`, ...).
- `breaks` — state the candidate would strand:
  - `override_path_removed` — an override names a path the candidate no longer has.
  - `override_not_overridable` — the candidate no longer declares the path overridable.
  - `learning_area_row_removed` — a `learning_area` row of the programme carries a code the
    candidate does not declare.
  - `level_row_removed` — a level a `learning_area` row of the programme points at carries a code
    the candidate does not declare.
- `warnings` — `structural_change` (a stage, level, pathway or learning area is removed),
  `version_bump_too_small` (such a removal without a major version, spec 03 §2.3) and
  `language_removed`.
- `safe` — true when `breaks` is empty.

Overrides for which the registry recorded no provenance are listed but not guarded: the registry
cannot tell whether their key is a pack path, and a marker left by an earlier wizard must not
block every upgrade. See "Overrides".

`upgrade(programmeId, document)` previews first and refuses with `upgrade_unsafe` unless the
preview is safe; `force: true` applies it anyway. The write is one transaction: the source row is
created (or reused when the institution already holds that version with the same checksum) and
the programme pin moves.

## Overrides

A programme may override a pack path only inside the limits the pack declares (spec 03 §2.3).
Each override is its own record under `programme.overrides`, keyed by the path:

```json
{
  "assessment.grading_scales.cbe_8_level.bands": {
    "value": [{ "code": "EE1", "label": "EE1", "min": 80, "max": 100, "points": 8 }],
    "actor": "01930000-0000-7000-8000-00000000aa01",
    "at": "2026-10-21T09:00:00.000Z"
  }
}
```

The value, the actor and the instant travel together, so `listOverrides` can return them and
`revertOverride` removes exactly one. A record written before the registry existed (a bare value)
is still listed, with `actor` and `at` null.

`applyOverride` refuses:

- `override_unresolved` — the path does not exist in the installed pack;
- `override_not_allowed` — the pack does not declare the path overridable;
- `override_invalid_value` — the value is not JSON, or replacing the path with it would leave the
  pack an invalid document. The check runs on a copy, so the pack content is never modified.

### Path vocabulary

An override names a path **into the pack document**, addressing array entries by code:
`reports.js-term.page`, `assessment.grading_scales.cbe_8_level.bands`.

A pattern in `pack.overridable` is relative to the pack root; because spec 03 §2.3 writes the
assessment section's keys without the prefix (`grading_scales.kcse_subject.bands`), a pattern that
does not start with a top-level section is also accepted under `assessment`. A pattern declared on
a scheme (`slots.*.scale_to`) is relative to that scheme. `*` matches exactly one path segment.

## Audit trail

Every write goes through the repository, so it lands in the audit trail. The pack-specific facts
are readable from the recorded rows; the `reason` names the pack or the path so a trail can be
filtered by eye.

| Operation | Event | Pack fields in the event |
| --- | --- | --- |
| install, first time | `curriculum_pack` create | `after.code`, `after.version`, `after.checksum` |
| install, first time | `programme` update | `before`/`after` carry `curriculum_pack_code` and `pack_version`; `reason` = `install code@version` |
| upgrade | `curriculum_pack` create (new version) | `after.code`, `after.version`, `after.checksum` |
| upgrade | `programme` update | `before.pack_version` is the from-version, `after.pack_version` the to-version; `reason` = `upgrade from -> to` |
| override | `programme` update | `changedFields` includes `overrides`; `after.overrides[path]` holds value, actor and instant; `reason` = `override path of code@version` |
| revert | `programme` update | same, with the path absent from `after.overrides`; `reason` = `revert override path of code@version` |

A caller may append a note to the reason; the registry's own words come first, so the pack is
always named.

## Limits

- The engine version a pack requires (`pack.requires_engine`) is validated as a value but not
  enforced: the registry has no engine version of its own. The application shell that knows its
  version (P2-E05) decides.
- The upgrade guard reads the rows this task owns and the canonical curriculum rows
  (`learning_area`, `level`). Marks, results and report cards carry snapshots rather than pack
  codes, so they are not inspected.
- `overridable` patterns are matched segment by segment; there is no recursive wildcard.
