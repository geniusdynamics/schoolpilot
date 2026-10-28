# Deployment: one device

One computer, one browser, no server. The school's whole database lives in that browser's
origin-private file system (OPFS) on that device, and nothing leaves it.

This is the simplest installation and the one to try first. It is also the least forgiving: the
database is tied to one browser profile on one machine, so a lost laptop is a lost school unless a
copy was taken.

## What you need

- A 64-bit Windows, macOS or Linux computer that will stay with the school.
- Google Chrome or Microsoft Edge **109 or newer**. Firefox and Safari do not provide the storage
  this build needs; the app will say so instead of running.
- [Node.js](https://nodejs.org/) and `pnpm`. The repository's quickstart uses `pnpm` and says a
  `package-lock.json` will never exist here. Check with `node --version` and `pnpm --version`.
- About 1 GB of free disk for the toolchain, plus room for the database.

## Option A: the development server (what is verified in this repository)

```bash
pnpm install
pnpm dev
```

`pnpm dev` starts Vite on the port in `.env` (`VITE_PORT`, default `5200`) and binds
`VITE_HOST` (default `0.0.0.0`, so other machines on the network can reach it too — set it to
`localhost` if you want this device only). Open `http://localhost:5200`.

On the first run the app asks whether to load demo data or go to production; see
[the administrator's guide](../administrator.md) section 2. A production school chooses **Go Direct
to Production** and finishes the setup wizard.

When the machine is only for one school, set the port and bind address before you start:

```bash
# .env, copied from .env.example
VITE_PORT=5200
VITE_HOST=localhost
VITE_DB_MODE=production
```

## Option B: build once, serve the static files

The production build is a static bundle plus a service worker (the app is a PWA):

```bash
pnpm install
pnpm build
pnpm preview
```

`pnpm build` writes `dist/`. `pnpm preview` serves it and prints the address it uses; note that
preview is a local server, not a production web server. To serve it another way, any static file
server works as long as it answers every path with `index.html` — the app routes on the URL
fragment, and `vercel.json` in this repository is exactly that rewrite rule for one host.

Service workers — and therefore the installed PWA and its offline cache — need a secure context:
`http://localhost` counts as secure, a plain `http://192.168.x.x` does not. If you want the app
installable from another machine, serve it over HTTPS.

**Untested on this machine:** `pnpm build` / `pnpm preview` and the PWA install were not run during
this review. What *was* verified is that the scripts exist in `package.json` with those names, and
that `playwright.config.ts` starts the dev server the same way (`pnpm exec vite`) on a fixed port.

## First run

1. Open the address.
2. **Welcome to SchoolPilot 3** → **Get Started**.
3. **Go Direct to Production** → **Setting up…**.
4. Finish the **Set up your school** wizard: school profile, curriculum packs, academic year,
   classes and streams, subjects, optional sample data, administrator.
5. Sign in with the administrator you created.

## Making it survive the term

| Do | Why |
| --- | --- |
| Take a snapshot before every big change (Settings → Data & System → **Backup & Restore** → **Backup Now**) | The snapshot is stored inside the database, so it saves you from a mistaken edit, not from a lost device. |
| Plan for the device dying | There is **no export button that writes a file** in this build: the in-app snapshot stays in the same database, and the **Download** button on a backup row only shows a notice. A single-device installation therefore has no supported way to move its data off the machine today. Treat the device as the only copy and say so to the school. |
| Leave demo mode off | Demo data in a live school is contamination, and clearing demo data permanently disables demo mode. |
| Do not clear the browser's site data | That deletes the school's database. There is no server copy. |

**A second browser or a second device starts an empty school.** The database is per origin per
profile. Copying the URL to a colleague's laptop gives them a blank installation, not your data. If
the school needs more than one device, a hub is the server side made for it —
[Windows](lan-hub-windows.md), [Ubuntu](lan-hub-ubuntu.md) or
[Raspberry Pi](lan-hub-raspberry-pi.md) — but read what a hub does and does not do for the app yet
before you plan around it.

## When the browser refuses to store data

A full-screen dialog titled **This browser cannot store data offline** means the database could not
be opened. Close other tabs of the app, use Chrome or Edge 109+, leave private browsing, and press
**Try again**. The administrator's guide has the full list
([section 8](../administrator.md#8-when-the-browser-refuses-persistent-storage)).

## What this deployment is not

It is not a shared database, not a server, and not a backup. For a school with an office and
classrooms, the hub is the deployment meant for the job — and even then, read
[what a hub gives you today](lan-hub-windows.md#what-a-hub-gives-you-today) before you promise
shared data.

---

Sources for this page: `package.json` (scripts), `vite.config.ts` (`VITE_PORT`, `VITE_HOST`,
`VITE_STRICT_PORT`), `.env.example` (`VITE_DB_MODE`, `VITE_HOST`, `VITE_PORT`), `README.md`
(quickstart and sign-in accounts), `playwright.config.ts` (how the dev server is started),
`vercel.json` (the SPA rewrite), `src/config/core.ts` and the storage code under
`src/services/database/`. The environment does not change what the app stores: the canonical
database is opened on wasm SQLite in OPFS (`src/data/canonicalRepository.tsx`).
