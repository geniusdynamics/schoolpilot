# Security policy

## Supported versions

The project has not cut a release yet: `CHANGELOG.md`'s newest section is
`[Unreleased]`, so the default branch is the only thing that receives security
fixes.

| Version | Supported |
| --- | --- |
| default branch (`main`, integrated through `consolidation`) | Yes |
| `1.0.x` and later minor releases | Once 1.0 ships, and the current LTS line thereafter (spec 08 §6) |
| Anything older | No |

TODO: owner to confirm this support window and the LTS length before publication.

## Reporting a vulnerability

**Do not open a public issue for a vulnerability.** A public issue tells every
school running the software where the hole is.

Use one of these, in order of preference:

1. **GitHub private security advisory** — the *Report a vulnerability* button on
   the repository's Security tab
   (<https://github.com/geniusdynamics/schoolpilot/security/advisories/new>).
   This keeps the report, the discussion and the fix private until an advisory
   is published.
2. **Email** — `TODO: owner to confirm address`. Until one is published here,
   the advisory form is the only private channel.

TODO: owner to confirm the security contact address and whether a PGP key is
published for it.

### What to include

The faster we can reproduce it, the faster it can be fixed:

- The version or commit you tested, and the deployment topology (single device,
  LAN hub, hosted).
- What an attacker gains — data read, data changed, session taken over, service
  denied — and who can reach it (an unauthenticated visitor, a signed-in teacher,
  the server's network neighbour).
- Reproduction steps, with the smallest data set that shows it. A learner record
  you created yourself is ideal; **never send a real school's data**.
- Any proof-of-concept code, request or screenshot, with secrets and personal
  data removed.
- Whether you have told anyone else, and any deadline you are working to.

### What we aim to do

| Step | Target |
| --- | --- |
| Acknowledge the report | within 5 working days |
| Initial assessment (severity, affected versions, whether it is in scope) | within 10 working days |
| Fix or documented mitigation for a confirmed high or critical issue | as fast as the release channel allows; a security fix may ship outside a school's holiday window (spec 08 §6) |
| Credit in the advisory | offered to every reporter, unless you ask us not to name you |

TODO: owner to confirm these response targets — they are a commitment made to
reporters and cannot be invented by a contributor.

## Scope

**In scope**

- The core application (`src/`), its data layer and migrations, the local and
  hosted server (`server/`), and the release artefacts in `packaging/`.
- The curriculum, country and payroll packs in `packs/`, where a wrong figure is
  a correctness and safety problem: an incorrect statutory rate, holiday, grade
  boundary or identifier check.
- The authentication, authorisation and audit paths, backups, and anything that
  moves learner or staff data off the device.

**Out of scope**

- Third-party plug-ins and integrations, including their own hosted services.
  Report those to their authors; we will help route a report.
- Vulnerabilities in a dependency that has no exploitable path through this
  code — report those upstream, and tell us if you think the path exists.
- Findings that need physical access to an unlocked device, or that depend on a
  browser already being compromised.
- Missing hardening headers with no demonstrated impact, and reports produced by
  a scanner with no working proof.

## Handling secrets

Never paste a secret, token, DSN, private key or a school's personal data into a
public issue, a pull request, a discussion or a chat transcript. If a secret
reaches a public place, treat it as compromised: rotate it, then tell us through
the private channel above so the history can be cleaned.

Run `pnpm secret:scan` before you push; CI runs the same scan on every pull
request.

## Disclosure

We publish a GitHub security advisory for a confirmed issue once a fix is
available, naming the affected versions and the reporter's credit as agreed. We
will not publish before a fix exists unless the issue is already being exploited.

TODO: owner to confirm the disclosure policy — a fixed embargo period, or the
"fix first" wording above.
