# SchoolPilot guides

The user and operator guides. Start with the role you are, or with the administrator's guide if you
are setting the system up.

| Guide | What it is for | Status |
| --- | --- | --- |
| [registrar.md](registrar.md) | Admitting learners, keeping their records, and the year-end promotion run — in the order a school year runs. | Verified in source |
| [bursar.md](bursar.md) | Fee schedules, billing a term, receipting at the counter, statements, and chasing arrears. | Verified in source |
| [class-teacher.md](class-teacher.md) | The daily register, marks for your group, competency observations, and the report-card comment. | Verified in source |
| [subject-teacher.md](subject-teacher.md) | Marks for your teaching groups, assignments, lesson plans, and reading the results your marks produce. | Verified in source |
| [exams-officer.md](exams-officer.md) | Exam setup, mark verification, results and moderation, publishing and distributing report cards. | Verified in source |
| [head.md](head.md) | Oversight: dashboards, reports, approving the promotion run, the money, and the school's operations. | Verified in source |
| [administrator.md](administrator.md) | First-run setup, accounts and roles, the Settings hubs, backups and restore, sync, health, the diagnostic bundle, and when the browser refuses storage. | Verified in source |
| [deployment/single-device.md](deployment/single-device.md) | One computer, one browser, no server: how it runs and what it cannot protect you from. | Untested |
| [deployment/lan-hub-windows.md](deployment/lan-hub-windows.md) | Installing and operating the hub on a Windows PC, including what a hub does and does not do for the app yet. | Untested here (installer measured in the repository) |
| [deployment/lan-hub-ubuntu.md](deployment/lan-hub-ubuntu.md) | The same on Ubuntu, with systemd. | Untested here (measured on WSL2 in the repository) |
| [deployment/lan-hub-raspberry-pi.md](deployment/lan-hub-raspberry-pi.md) | The same on a Raspberry Pi, including the SD-card rule. | **Untested** (no board available) |
| [deployment/hosted.md](deployment/hosted.md) | Hosting the browser app as a static site, and hosting the hub with a real certificate. | Untested |
| [pack-authoring.md](pack-authoring.md) | Writing a curriculum, country or payroll pack, with a worked example and the vector runner. | Verified in source, runner executed |
| [plugin-sdk.md](plugin-sdk.md) | Writing a plug-in against the SDK — and the honest statement that the host does not load one yet. | Verified in source |
| [data-protection.md](data-protection.md) | What personal data the app holds, where, who sees it, retention and deletion, and what to tell parents. Guidance, not legal advice. | Verified in source |
| [walkthroughs/README.md](walkthroughs/README.md) | The scripts for the short video walkthroughs of the golden paths. | Scripts written; **videos outstanding** |

## What the status column means

| Status | Means |
| --- | --- |
| **Verified in source** | Every screen, menu label and address in the guide was checked against this build's code (`src/modules/*/moduleDefinition.tsx`, the page components, the Settings hub table, the English locale files), and every command was copied from the repository or run. The *flow* was not clicked through end to end during this review, and the guide says so where it matters. |
| **Untested** | The steps were not run on this machine, and no earlier evidence exists in the repository. The guide says what *was* verified (that the script and its flags exist) and what was not. |
| **Measured in the repository** | Someone ran the install once and recorded the evidence under `packaging/verify/evidence/`. It was not re-run here. |

None of the guides was written from memory: a menu path or command that could not be found in the
repository is not in a guide.

## Two things to know before you read them

1. **Every step gives the page's address as well as its name.** The admissions and finance sidebar
   entries now carry English labels, but a school can rename a tab or a module, so the address
   (`/admissions/admit`) remains the reliable part.
2. **The role guides describe what the screens do, not what the system enforces.** The permission
   model exists and the hub applies it; the browser app's own writes do not consult it yet. Where
   that difference changes what an administrator should rely on, the
   [administrator's guide](administrator.md#3-accounts-roles-and-permissions) and the
   [data-protection guide](data-protection.md#two-known-leaks-to-plan-around) say so plainly.

## Other documents in this directory

`docs/guides/` also holds developer-facing and historical material — architecture, forms, grids, the
data layer, navigation components, plug-in development, the self-hosting reference and the hub
deployment reference ([deployment-hub.md](deployment-hub.md), which the LAN hub guides build on).
Those are written for people changing the code; the guides listed in the table above are written for
people running a school.

The broader documentation index is [docs/README.md](../README.md).

---

Written for PRD task P6-D01 (spec 08 §8) on 2026-10-28. The list of guides and their statuses is the
record of what this documentation set does and does not cover; the video walkthroughs are the one
deliverable that could not be produced here.
