# Pilot feedback log

One row per item, across every pilot school. The pilot lead owns this file and closes the weekly
summary. Never put a learner's name, guardian's name, phone number or other personal data here; use
the learner's internal id or an anonymised example.

## Triage rules

| Severity | Meaning | First response | Target |
| --- | --- | --- | --- |
| P1 | data loss, security, or the school cannot use the app | stop, preserve evidence, tell the owner within 1 hour | rollback or fix within 1 school day |
| P2 | a core workflow is blocked for a class or the school | same day | 1 school day |
| P3 | a workaround exists | 1 school day | 3 school days |
| P4 | cosmetic or suggestion | weekly triage | next release |

A P1 also gets an incident note: time, data affected, action taken, school confirmation.

## Log

| ID | Date | School | Pack | Area | Severity | Description (no personal data) | Owner | Status | Resolution / workaround |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P-001 | | | | | | | | open/closed | |

## Weekly summary

Copy this block each week; it is what the owner reads.

```
Week: <start – end>
Pilots running: <pack/school, ...>
Opened: P1 <n>, P2 <n>, P3 <n>, P4 <n>
Closed: P1 <n>, P2 <n>, P3 <n>, P4 <n>
Open P1/P2: <ids and one-line status>
Pack corrections proposed: <n> (see each sign-off)
Next week: <the one thing that matters>
```

## Exit

At the end of the term, every row is `closed` or has a signed workaround recorded in the school's
sign-off. The counts go into the sign-off and the pilot report.
