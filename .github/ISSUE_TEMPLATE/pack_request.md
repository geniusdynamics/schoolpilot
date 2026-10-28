---
name: Pack request
about: Ask for a curriculum, country or payroll pack that does not exist yet
title: '[pack] '
assignees: ''
---

<!-- A pack is data validated by packs/schema/*.schema.json. This issue is the
     proposal; the pack itself arrives as a pull request reviewed by a steward. -->

## Pack identity

- **Pack id** (for example `tz-national`, `country-tz`, `ke-payroll`) — required:
- **Programme or system** it models, and the phases, levels or years it covers — required:
- **Country / jurisdiction**:
- **Language(s)** the labels must ship in:
- **Issuers** (the body that sets the rules):

## Official source documents

- Document title, issuer, URL and the date you retrieved it — required, one per line
  (a pack without a citable official source cannot be reviewed):

## What the pack must declare

- [ ] `structure` — stages, levels, pathways, calendar template
- [ ] `learning-areas` — subjects or learning areas, components, combination rules
- [ ] `assessment` — schemes, grading scales, aggregation, ranking policy
- [ ] `progression` — promotion, stage transitions, graduation
- [ ] `reports` — report cards for each stage that needs one
- [ ] `locales` — labels and descriptors
- [ ] `tests` — conformance vectors (`tests/*.vectors.json`, schema
      `packs/schema/tests.schema.json`)

## Conformance example

What official worked example can the vectors be traced to — a published grade
band, a sample result slip, a marking scheme with a total? Give the citation, or
say that none exists yet so the pack would have to start as `verification: draft`.

## Who can review it

A pack steward should be someone who knows the system, ideally an educator from
that country (see [docs/packs/STEWARDSHIP.md](../../docs/packs/STEWARDSHIP.md)).
Name anyone who has agreed to review, or write "unassigned".

## Licence of the contributed data

Where the source document is not public domain, state its licence or the
permission you hold to encode it, and say whether the labels are your own
translation.
