# Deployment: hosted

Two things can be hosted, and they are different products:

1. **The browser app** — a static bundle you can put on any web server or static host.
2. **The hub** — a Node process with a database, which can live on a server with a public name and
   a real certificate.

Hosting the app does **not** centralise the school's data: each browser keeps its own database
(see [what a hub gives you today](lan-hub-windows.md#what-a-hub-gives-you-today)). Hosting the hub
gives you the API and its backups, not yet the app's data path. Decide which of the two you are
actually doing before you buy anything.

## Hosting the browser app

### Build

```bash
pnpm install
pnpm build
```

The output is `dist/`: static files, a service worker and a web manifest (the app is a PWA). The
build also injects a Content-Security-Policy with a hash of every inline script it produced
(`src/security/csp.ts` and `scripts/security/cspVitePlugin.ts`), so a host must **not** rewrite the
HTML or add inline scripts of its own — it would invalidate the policy.

### Serve

- Serve over **HTTPS**. Service workers, and therefore the offline cache and the installable app,
  need a secure context; `http://localhost` is the only plain-HTTP exception.
- Answer every path with `index.html` (single-page app). `vercel.json` in this repository is exactly
  that rewrite:

  ```json
  {"rewrites":[{"source":"/(.*)","destination":"/index.html"}]}
  ```

- Static assets can be cached hard; `index.html` should not be. The hub's `Cache-Control: no-store`
  applies to its API responses, not to your static host.

### Configure at build time

Every `VITE_*` value is compiled into the bundle (`vite.config.ts` reads `.env` for the mode, and
`.env.example` says so in a warning). That means:

- There is **no secret** you can safely put in a `VITE_*` variable. An API key, a DSN or a
  passphrase in the bundle is public.
- Changing a `VITE_*` value requires rebuilding and redeploying.
- The values that matter for a hosted app are the ones in `.env.example` for storage and mode:
  `VITE_DB_MODE=production`, `VITE_DB_PROVIDER=sqlite-wasm`, `VITE_DB_ALLOW_MEMORY=false`. Leave
  `VITE_DB_ALLOW_MEMORY` off — turning it on gives every visitor a throwaway database and the
  **TEMPORARY DATA** badge.

### What hosting the app buys you

A single URL for staff, no install day, and updates on your schedule. What it does not buy you is a
shared database: two teachers on two laptops are still two databases. Say that plainly to a school
that expects a hosted product to behave like one.

**Untested in this review:** the build, the deploy and the PWA install were not run. The scripts and
the rewrite rule exist in the repository as quoted; nothing here was exercised end to end.

## Hosting the hub

### Run it

The simplest form is the CLI on the server, with the data directory on a disk you back up:

```bash
SCHOOLPILOT_BACKUP_PASSPHRASE='…' \
SCHOOLPILOT_RESTRICTED_KEY='…' \
npx tsx src/server/cli.ts --data-dir /srv/schoolpilot --port 8443 --name school
```

`--help` prints every flag. The ones that matter on a hosted machine:

| Flag | Why |
| --- | --- |
| `--data-dir` | Database, TLS material, keys and backups. |
| `--port`, `--host` | Listen address. `0.0.0.0` behind a proxy, `127.0.0.1` if the proxy is on the same machine. |
| `--tls-cert`, `--tls-key` | Serve the certificate the school brought instead of a self-signed one. Both are required together. |
| `--restricted-key-file` | Where the key that opens encrypted medical and conduct fields lives. |
| `--backup-dir`, `--backup-key-file`, `--daily-at` | Where archives go, the passphrase file, and the daily time in UTC (default `02:00`). |
| `--no-backups` | Turn the automatic backup and its endpoints off. Only for a test box. |
| `--no-mdns` | Do not advertise on a network where multicast is meaningless (a public host). |

On a server, run it under systemd or the platform's process manager and give the passphrase and the
restricted key through the environment or files with tight permissions — never on the command line,
which is visible in the process list.

### TLS

A host with a public DNS name can have a real certificate, which is better than the LAN's pinned
self-signed one:

```bash
npx tsx src/server/cli.ts --data-dir /srv/schoolpilot --port 8443 \
  --tls-cert /etc/letsencrypt/live/school.example.org/fullchain.pem \
  --tls-key /etc/letsencrypt/live/school.example.org/privkey.pem
```

When you pass a certificate, the hub writes no self-signed material. Renewals are the certificate
tool's job; restart the hub after a renewal so it reads the new files.

### Behind a reverse proxy

- Forward `/health`, `/.well-known/schoolpilot-hub` and `/api/**` untouched.
- Keep the `Authorization` header (bearer session); do not strip or rewrite it.
- Do not add a second authentication layer that answers before the hub: the hub's own refusals carry
  the error codes its clients read.
- The hub rate-limits sign-in (10 requests per 5 minutes per client address) and writes (120 per
  minute). A proxy in front should pass the client address through, or every caller will share one
  bucket.

### Single sign-on

Google Workspace and Microsoft 365 over OpenID Connect are configured by environment variable:
`SCHOOLPILOT_SSO_GOOGLE_CLIENT_ID`/`_CLIENT_SECRET`, `SCHOOLPILOT_SSO_MICROSOFT_CLIENT_ID`/
`_CLIENT_SECRET`, `SCHOOLPILOT_SSO_MICROSOFT_TENANT` (required for Microsoft),
`SCHOOLPILOT_SSO_REDIRECT_URI`, and `SCHOOLPILOT_SSO_<PROVIDER>_ALLOWED_DOMAINS`. SSO never creates
an account and cannot create the first administrator, so set the hub up with a password first.

**The browser app has no "Sign in with Google" button or callback page yet**, and the flow has only
been tested against a provider running in the test process (`server/__tests__/ssoHttp.test.ts`), not
against Google or Microsoft. Do not advertise SSO to a school as working.

### Backups on a hosted hub

Same contract as a LAN hub: one encrypted `.spbk` archive per run, 7 daily / 4 weekly / 12 monthly,
restore into a fresh directory, a drill reminder every 30 days. Copy the archive directory off the
host, and copy the restricted-data key with it.

```bash
npx tsx src/server/cli.ts --data-dir /srv/schoolpilot-recovered \
  --backup-passphrase '…' \
  --restore-from /srv/schoolpilot/backups/<archive>.spbk \
  --restore-to /srv/schoolpilot-recovered
```

### What to check before you call it live

- [ ] `GET /health` answers over the real certificate, and `tlsFingerprint` is the one you expect.
- [ ] `GET /.well-known/schoolpilot-hub` answers (it is the descriptor a client uses to confirm what
      answered).
- [ ] A sign-in over HTTPS issues a session; a wrong password is refused with
      `invalid_credentials`, not a stack trace.
- [ ] The first backup exists, the passphrase is in the secret store, and a restore into a scratch
      directory produces a database that opens.
- [ ] The restricted-data key is in the secret store, and a restart with it missing **refuses to
      start** (that refusal is correct behaviour; it means you have not lost the ability to read the
      data silently).
- [ ] Rate limits are reaching the hub with real client addresses.
- [ ] The app is served from its own host, over HTTPS, with the SPA rewrite.

## Cost and reality check

The hub is a small Node process over SQLite: a 1 vCPU / 1 GB instance is ample for one school. What
costs money and attention is the operations around it — backups off the machine, a certificate that
renews, a key that is not lost, and someone who answers when `/health` says the last backup failed.

---

Sources: `package.json`, `vite.config.ts`, `.env.example`, `vercel.json`, `src/security/csp.ts`,
`scripts/security/cspVitePlugin.ts`, `src/server/cliArgs.ts` (every flag quoted above),
`server/README.md` (API, security headers, rate limits, SSO), `server/backup/README.md`. The
hosting steps themselves were not run in this review.
