# The hub's runtime manifest

This is not the application's `package.json`. It is the manifest the installers copy into a hub's
`app/` directory before `npm ci`, and it lists only what the hub needs at run time:

| Dependency | Why the hub needs it |
| --- | --- |
| `better-sqlite3` | the canonical SQLite store, through `src/data/adapters/sqlite/node.ts` |
| `tsx` | runs the hub's TypeScript directly, so an install has no build step |
| `zod` | the schema validation the repository and the domain services already use |

Everything else in the application's dependency list belongs to the browser: React, the UI kit,
LiveStore, PouchDB, Dexie, puppeteer, the SQL drivers the server does not use. Installing that tree
on a school PC would cost minutes and hundreds of megabytes for nothing, so the installer replaces
the manifest with this one.

`package-lock.json` beside it is what `npm ci` consumes. It pins the same versions the application
uses (`better-sqlite3 ^12.2.0`, `tsx ^4.20.5`, `zod 3.25.76`) and carries the optional platform
builds for all three targets — x64 and arm64 Linux, and win32-x64 — so one lockfile serves Ubuntu,
Raspberry Pi and Windows.

When a version here changes, regenerate the lockfile:

```bash
cd packaging/hub && npm install --package-lock-only --no-audit --no-fund
```
