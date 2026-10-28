# NNNN. Title

- **Status:** draft
- **Date:** YYYY-MM-DD
- **Author(s):**
- **Review window:** YYYY-MM-DD to YYYY-MM-DD
- **Affects:** domain model | pack schema | plug-in SDK | release policy | other
- **Supersedes / Superseded by:** none

## Summary

One paragraph. What is proposed, in language a school administrator could follow,
and what changes for them. If this paragraph needs the reference section to make
sense, it is not a summary.

## Motivation

Why now. What breaks, gets mis-keyed or cannot be expressed today. Cite the
evidence: a spec section, an audit finding, a support case, a pack correction,
a benchmark. An RFC with no demonstrated problem is a preference.

## Guide-level explanation

Explain the change as if teaching it to someone who will use it: a school
administrator configuring a programme, a teacher reading a report card, a pack
author writing vectors, a plug-in author calling the SDK. Show the new
configuration, screen or API call, and what the old one becomes. State what a
school that does nothing will experience.

## Reference-level explanation

The precise design. Types, schemas, tables, migrations, endpoints, file paths,
defaults, validation rules, error cases, and the exact behaviour at the edges
(empty, one, many, concurrent, offline). Include the JSON or TypeScript that a
reviewer would otherwise have to invent. Mark anything deliberately left open as
an unresolved question rather than leaving it silent.

## Drawbacks

What gets worse: cost, migration risk, a slower path, a concept a school must
now learn, a pack a steward must now re-verify. Say who pays.

## Alternatives

The designs considered and why each was not chosen. Include "keep the current
model and document the limit", which is the correct answer more often than it
looks.

## Unresolved questions

Numbered, each answerable. Say who can answer it and by when — the review-window
end at the latest. An accepted RFC with open questions must say how they will be
settled.

## Rollout

How it ships without breaking a school mid-term (spec 08 §6): the migration and
its rollback, the feature flag or release channel, which packs or plug-ins have
to change in the same release, what the deprecation window is, and the tests and
conformance vectors that prove it works. Say what a school on the previous
version keeps doing.
