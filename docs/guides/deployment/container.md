# Running SchoolPilot from the container image

The image serves the browser app as static files. **It does not hold the school's data.** Each browser
keeps its own database in its own storage, so the container is stateless and can be replaced or
replicated without losing anything — and, equally, a school that clears its browser data loses the
school unless a backup file was taken. Treat the backup feature, not the container, as the thing that
protects the data.

## What is in the image

| Tag | What it is | Status |
| --- | --- | --- |
| `ghcr.io/geniusdynamics/schoolpilot` | The app, served by nginx as an unprivileged user | The production deliverable |
| `ghcr.io/geniusdynamics/schoolpilot-hub` | The LAN hub (API, auth, backups) | **Experimental** — the browser app does not sync with it yet and it does not serve the app |

Both are published for `linux/amd64` and `linux/arm64` on every push to `consolidation`/`main` and on
`v*` tags; every pull request builds both without publishing.

## Start the app

```sh
docker run -d --name schoolpilot -p 127.0.0.1:8080:8080 \
  -e SCHOOLPILOT_DEPLOYMENT_MODE=both \
  ghcr.io/geniusdynamics/schoolpilot:latest
```

The app is then at `http://127.0.0.1:8080` — from the same machine only. **Reading it from another
device over plain HTTP will not work properly**: the browser's storage and the service worker need a
secure context (HTTPS or localhost). Put TLS in front — `docker-compose.example.yml` and
`docker/Caddyfile.example` show one with Caddy. On a LAN with no domain, Caddy's internal CA works, but
every device must trust that CA once.

## Settings that differ per install

The same image serves every customer. Anything that varies is written to `/config.js` at container
start from the environment; each value falls back to what the image was built with.

| Variable | Values | Meaning |
| --- | --- | --- |
| `SCHOOLPILOT_DEPLOYMENT_MODE` | `both` (default), `demo`, `production` | Which first-run path the image offers. `demo` hides the production path (a kiosk); `production` hides the demo path (a school's server). |
| `SCHOOLPILOT_ALLOW_TEMPORARY_DB` | `true` / `false` (default) | Allows an in-memory database where browser storage is unavailable. Only for a public demo: the data is erased when the tab closes. |
| `SCHOOLPILOT_BUGSINK_DSN` | a DSN, empty for none | Error reporting. |
| `SCHOOLPILOT_APP_VERSION` | any string | The version the deployment names in diagnostics. |

An invalid value is refused with a warning in the container log and the safe default is used; it never
stops the app from starting.

## Backups

`Settings → System → Backup` writes an archive of **both** databases (the school database and the
legacy modules' database) with a manifest, checksums, and passphrase encryption that is on by default
in production. Restore accepts that file on another device. Keep the archive somewhere other than the
device it came from.

The image itself is stateless, so backing up the container is pointless; back up the browsers.

## The hub image (experimental)

The hub does not serve the app and the browser does not sync with it. It is included for operators who
run it for its API, single sign-on and server-side backups, and it is **not** part of the default
deployment for that reason. If you use it:

- mount `/data` as a volume — it holds the SQLite file, `auth.key`, `keys/restricted-data.key`, backups
  and TLS material, and losing it loses the hub;
- **back up `keys/restricted-data.key` with the databases.** Sealed fields cannot be read without it,
  and the hub refuses to start when sealed values exist and the key is missing;
- set `SCHOOLPILOT_TLS=off` only behind a TLS-terminating proxy (plain HTTP is for loopback), or pass
  `SCHOOLPILOT_TLS_CERT` / `SCHOOLPILOT_TLS_KEY`;
- mDNS is off by default in the container (`SCHOOLPILOT_MDNS=true` opts in).

## Health and upgrades

- `GET /healthz` on the web image returns `ok`; the Docker healthcheck uses it.
- `GET /health` on the hub reports its state.
- The service worker asks before it applies an update (`registerType: 'prompt'`), so a running tab is
  not replaced under the user's hands. To force a fresh load, reload the page.

## Verifying a build

`scripts/prd/__tests__/ci-workflows.test.ts` and the `Container images` workflow build both targets and
smoke-test the web image: the shell loads, `/config.js` carries the environment it was given, the
security headers are present, the wasm is served as `application/wasm`, and the shell is not cached
while bundles are.
