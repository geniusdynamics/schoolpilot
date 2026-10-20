# Configuration

SchoolPilot reads configuration at build time from Vite environment files and from the
environment variables supplied by CI or the deployment host. This guide lists the variables
the application and its tooling read, their safe defaults, and how to supply them without
committing secrets.

## 1. How configuration is loaded

- **Browser code** reads `import.meta.env.*`. Vite loads these files from the repository
  root, in increasing precedence:

  1. `.env`
  2. `.env.local`
  3. `.env.[mode]` (for example `.env.production`)
  4. `.env.[mode].local`

  Only variables prefixed with `VITE_` are exposed to browser code. Everything exposed this
  way is **public**: it is inlined into the JavaScript bundle in `dist/`.

- **Node tooling** reads `process.env.*`. Migration scripts, the self-hosting setup script
  and the PRD gate use the process environment directly; they are not part of the browser
  bundle.

- **`vite.config.ts`** reads `VITE_PORT`, `VITE_HOST`, `VITE_STRICT_PORT` and
  `GEMINI_API_KEY` while the config is evaluated, then inlines `GEMINI_API_KEY` into the
  bundle as `process.env.API_KEY` and `process.env.GEMINI_API_KEY`.

`.env.example` is the committed template. `.env` and its local variants are never tracked.

## 2. The `.env` workflow

```bash
# One-time setup
cp .env.example .env

# Fill in local values, then start the app
pnpm dev
```

Rules:

1. `.env` and every `.env.*` variant are git-ignored, including `.env.local`,
   `.env.production` and `.env.development`. Only `.env.example` belongs in Git.
2. Never commit a DSN, password, token, API key or private key. Put real values in `.env`
   locally, or in CI/deployment secrets.
3. Before committing, run `pnpm secret:scan`. It scans every tracked file and fails on the
   patterns listed in section 8.
4. To confirm the ignore rules are active:

   ```bash
   git check-ignore -v .env
   git status --porcelain
   ```

   `git check-ignore` must print an ignore rule for `.env`, and `git status` must not list
   it.

## 3. Security model

- **`VITE_*` values are not secret.** They end up in the browser bundle and in `dist/`.
  Treat them as public configuration.
- The Bugsink DSN is a write key. It is not a password, but it lets anyone who finds it send
  events to your Bugsink project. Treat it as sensitive and rotate it if it leaks.
- ERPNext, Gemini and backend API secrets must be supplied by a server-side proxy. Do not
  put a real secret in `VITE_ERPNEXT_API_SECRET`, `VITE_BACKEND_API_KEY`, `GEMINI_API_KEY`
  or any other variable that Vite inlines.
- Real secrets belong in `.env` locally, or in GitHub Actions secrets / the deployment
  host's environment. They are read at build time and never written to the repository.

## 4. Variables by area

### 4.1 Server and network

Read by `vite.config.ts` when the dev server or build starts.

| Variable | Required | Safe default | Purpose |
| --- | --- | --- | --- |
| `VITE_PORT` | No | `5200` | Dev/preview server port. |
| `VITE_HOST` | No | `0.0.0.0` | Bind address. `0.0.0.0` exposes the server to the LAN; use `localhost` for local-only. |
| `VITE_STRICT_PORT` | No | `false` | When `true`, fail instead of picking another port if the configured port is busy. |

### 4.2 Database and storage

Read by the database selection code in `src/services/database/` and the SQLite provider.

| Variable | Required | Safe default | Purpose |
| --- | --- | --- | --- |
| `VITE_DB_PROVIDER` | No | falls back to saved config (`sqlite-wasm` in the self-hosting profile) | Provider: `sqlite-wasm`, `sqlite`, `sqlite-file`, `livestore`, `pouchdb`, `backend-api`, `memory`, `hybrid`. |
| `VITE_DB_MODE` | No | falls back to saved config (`production`) | `production` uses real data; `demo` uses generated sample data. |
| `VITE_DB_ALLOW_MEMORY` | No | `false` | Permit a temporary in-memory database when OPFS is unavailable. Data is erased on reload; use only for demos or troubleshooting. |
| `VITE_SQLITE_WAL_MODE` | No | `true` | WAL mode for concurrent reads. Any value other than `false` enables it. |
| `VITE_SQLITE_FOREIGN_KEYS` | No | `true` | Enforce foreign-key constraints. |
| `VITE_SQLITE_SYNCHRONOUS` | No | `1` | `0` = OFF, `1` = NORMAL, `2` = FULL. |
| `VITE_SQLITE_CACHE_SIZE` | No | `20000` | SQLite cache size in KB (20 MB). |
| `VITE_LIVESTORE_ENABLED` | No | `false` | Recorded by `scripts/setup-self-hosted.cjs`; enable LiveStore in the runtime configuration before relying on it. |
| `VITE_LIVESTORE_ADAPTER` | No | `opfs` | LiveStore adapter: `opfs`, `memory`, `indexeddb`. Recorded by the setup script. |
| `VITE_DB_PATH` | No | `./data/school.db` | Reserved; appears in the unified-configuration guide but is not read by the current runtime. |
| `VITE_DB_WAL` | No | `true` | Reserved; not read by the current runtime. |
| `RXDB_DB_NAME` | No | `schoolpilot` | Legacy; ignored. The runtime constants live in `src/config/core.ts`. |
| `RXDB_LEADER_ELECTION_DISABLED` | No | `true` | Legacy; ignored. |

**Dev vs production:** local development can use `sqlite-wasm` with OPFS in the browser.
Production self-hosting should use `sqlite-wasm` and a persistent OPFS-capable browser
(Chrome/Edge 113+, Firefox 115+). Do not enable `VITE_DB_ALLOW_MEMORY` in production: a
reload destroys the data.

### 4.3 Sync

The current self-hosted runtime does not read these variables. They are documented in
`docs/guides/backend-integration-guide.md` for the optional backend sync layer and are
reserved until that layer is wired in.

| Variable | Required | Safe default | Purpose |
| --- | --- | --- | --- |
| `VITE_ENABLE_SYNC` | No | `false` | Enable backend synchronization. |
| `VITE_SYNC_QUEUE_INTERVAL` | No | `5000` | Queue flush interval in milliseconds. |
| `VITE_NETWORK_CHECK_INTERVAL` | No | `30000` | Network reachability check interval in milliseconds. |
| `VITE_DEBUG_SYNC` | No | `false` | Verbose sync logging. Keep `false` in production. |

### 4.4 Error reporting

| Variable | Required | Safe default | Purpose |
| --- | --- | --- | --- |
| `VITE_BUGSINK_DSN` | No | empty (error tracking disabled) | Bugsink/Sentry-compatible DSN. Read once at module load in `src/config/errorTracking.ts`. Empty disables reporting and logs a warning. Supply it at build time from a CI secret or the deployment host. |
| `VITE_APP_VERSION` | No | `1.0.0` | Release identifier sent to Bugsink and used by the database manager. Set it to the release tag or commit SHA in CI. |

**Dev vs production:** leave the DSN empty in development unless you are testing reporting.
In production, set it from a secret; never commit it.

### 4.5 Backend and ERP integration

All of these are optional. `VITE_*` values are public; the `ERPNEXT_*` names are Node-side
and are not available to browser code. `src/config/dataLayerConfig.ts` also reads
`COUCHDB_URL`, `COUCHDB_USERNAME`, `COUCHDB_PASSWORD`, `API_URL`, `API_KEY` and
`POSTGRESQL_URL` through `process.env`, and `DATABASE_URL` is read by
`src/config/configManager.ts` and `src/config/databaseConfigRuntime.ts`. Vite does not inject
these into the browser bundle; treat them as Node-side/legacy names and prefer the `VITE_*`
presets above.

| Variable | Required | Safe default | Purpose |
| --- | --- | --- | --- |
| `VITE_BACKEND_API_URL` | No | empty | Cloud backend base URL. Documented preset; not read by the current runtime. |
| `VITE_BACKEND_API_KEY` | No | empty | Cloud backend key. Never put a real secret here. |
| `VITE_API_URL` | No | `http://localhost:3000/api` | REST backend preset read by `src/config/backendArchitecture.ts`. |
| `VITE_AUTH_URL` | No | `http://localhost:3000/auth` | REST auth preset. |
| `VITE_COUCHDB_URL` | No | `http://localhost:5984` | CouchDB URL used by the PouchDB preset. |
| `VITE_BACKEND_TYPE` | No | auto-detect | Backend preset: `frontend-only`, `frappe-education`, `custom-api`, `hybrid`. |
| `VITE_FRAPPE_API_URL` | No | `http://localhost:8000/api` | Frappe/ERPNext API base. |
| `VITE_FRAPPE_AUTH_URL` | No | `http://localhost:8000/api/method/login` | Frappe login endpoint. |
| `VITE_CUSTOM_API_URL` | No | `http://localhost:3000/api` | Custom API base. |
| `VITE_CUSTOM_AUTH_URL` | No | `http://localhost:3000/auth` | Custom auth endpoint. |
| `VITE_ERPNEXT_URL` | No | empty | ERPNext instance URL. Documented preset; not read by the current runtime. |
| `VITE_ERPNEXT_API_KEY` | No | empty | ERPNext API key. Not read by the current runtime. |
| `VITE_ERPNEXT_API_SECRET` | No | empty | ERPNext API secret. Do not put a real secret in a `VITE_*` variable. |
| `ERPNEXT_URL` | No | unset | Node-side ERPNext URL read by `src/config/dataLayerConfig.ts`. |
| `ERPNEXT_API_KEY` | No | unset | Node-side ERPNext key. |
| `ERPNEXT_API_SECRET` | No | unset | Node-side ERPNext secret. |
| `COUCHDB_URL` | No | `http://localhost:5984` | Node-side CouchDB URL read by `src/config/dataLayerConfig.ts`; not injected by Vite. |
| `COUCHDB_USERNAME` | No | unset | Node-side CouchDB username. Not available to browser code. |
| `COUCHDB_PASSWORD` | No | unset | Node-side CouchDB password. Supply it through the environment; never commit it. |
| `API_URL` | No | `/api` | Node-side custom API base read by `src/config/dataLayerConfig.ts`. |
| `API_KEY` | No | unset | Node-side custom API key. Never commit a real value. |
| `POSTGRESQL_URL` | No | `/api/postgresql` | Node-side PostgreSQL API base read by `src/config/dataLayerConfig.ts`. |
| `DATABASE_URL` | No | unset | Node-side connection string read by `src/config/configManager.ts` and `src/config/databaseConfigRuntime.ts`; legacy fallback. |
| `GEMINI_API_KEY` | No | empty | Build-time AI key. `vite.config.ts` inlines it into the bundle; use a restricted key, never a production secret. |
| `VITE_VAPID_PUBLIC_KEY` | No | empty | Public Web Push key. Public by design. |

**Dev vs production:** use local URLs in development. In production, terminate TLS at a
reverse proxy and set backend URLs to the internal service names. Keep every API secret on
the server.

### 4.6 Security, session and performance profile

These keys are recorded by `scripts/setup-self-hosted.cjs` for the self-hosting profile.
Except for `VITE_PORT`, `VITE_HOST` and `VITE_STRICT_PORT`, the current runtime does not read
them; treat them as deployment documentation until the corresponding features consume them.

| Variable | Required | Safe default | Purpose |
| --- | --- | --- | --- |
| `VITE_DEPLOYMENT_ENV` | No | `production` | Deployment label (`development`, `staging`, `production`). |
| `VITE_ENABLE_HTTPS` | No | `false` | Record whether HTTPS is expected at the proxy. |
| `VITE_SESSION_TIMEOUT` | No | `60` | Session timeout in minutes. |
| `VITE_ENABLE_AUDIT_LOG` | No | `true` | Audit logging preference. Keep enabled in production. |
| `VITE_ENABLE_QUERY_CACHE` | No | `true` | Query caching preference. |
| `VITE_QUERY_CACHE_TTL` | No | `300` | Cache TTL in seconds. |
| `VITE_MAX_CONCURRENT_CONNECTIONS` | No | `10` | SQLite connection limit. |

**Dev vs production:** production should use `VITE_DEPLOYMENT_ENV=production`, audit logging
enabled, and HTTPS at the reverse proxy (`VITE_ENABLE_HTTPS=true` documents that expectation).

### 4.7 Module feature flags

Read by `src/config/features.ts`. All default to `false` except deprecation warnings.

| Variable | Required | Safe default | Purpose |
| --- | --- | --- | --- |
| `VITE_USE_SHARED_DATA_HOOK` | No | `false` | Use `useSharedData()` for cross-module data access. |
| `VITE_USE_MODULE_METADATA` | No | `false` | Load module metadata from `module.json`. |
| `VITE_USE_SCHEMA_AUTO_REGISTRATION` | No | `false` | Auto-discover module schemas. |
| `VITE_USE_MODULE_MIGRATIONS` | No | `false` | Run module migrations on startup. |
| `VITE_STRICT_MODULE_ISOLATION` | No | `false` | Make cross-module imports throw. |
| `VITE_ENABLE_DEPRECATION_WARNINGS` | No | `true` | Console warnings for legacy patterns. |

Keep the module flags off unless you are rolling out a specific modularity feature. Leave
deprecation warnings on in development.

### 4.8 Migration tooling

Used by the Akademico to SchoolPilot migration tooling referenced from `package.json`. The
tooling itself is not part of the current tree, so these values are required only when you
run that tooling. They are Node-side and never exposed to the browser.

| Variable | Required | Safe default | Purpose |
| --- | --- | --- | --- |
| `AKADEMICO_HOST` | Migration only | `localhost` | Source PostgreSQL host. |
| `AKADEMICO_PORT` | Migration only | `5432` | Source PostgreSQL port. |
| `AKADEMICO_USER` | Migration only | `postgres` | Source database user. |
| `AKADEMICO_PASSWORD` | Migration only | `your_password_here` | Source password. Supply the real value locally or through the runner's environment. |
| `AKADEMICO_DB` | Migration only | `akademico` | Source database name. |
| `SCHOOLPILOT_HOST` | Migration only | `localhost` | Target MySQL host. |
| `SCHOOLPILOT_PORT` | Migration only | `3306` | Target MySQL port. |
| `SCHOOLPILOT_USER` | Migration only | `root` | Target database user. |
| `SCHOOLPILOT_PASSWORD` | Migration only | `your_password_here` | Target password. Supply the real value locally or through the runner's environment. |
| `SCHOOLPILOT_DB` | Migration only | `schoolpilot` | Target database name. |
| `MIGRATION_CHUNK_SIZE` | No | `1000` | Rows per batch. |
| `MIGRATION_MAX_RETRIES` | No | `3` | Retries for transient database failures. |
| `MIGRATION_LOG_LEVEL` | No | `info` | `debug`, `info`, `warn` or `error`. |

**Dev vs production:** run migrations against a staging copy first. Use `debug` only during
troubleshooting, and never point the target at production without a verified backup.

### 4.9 Legacy CRA variables

`src/config/databaseEnvVars.ts` still defines a `REACT_APP_DATABASE_*` family (provider,
URL, name, caching, sync, encryption, API credentials) and reads it through `process.env`.
Vite does not inject these into the browser bundle, so they are legacy compatibility names,
not the supported configuration path. Prefer `VITE_DB_*` and the backend presets above.

### 4.10 Logging and diagnostics

| Variable | Required | Safe default | Purpose |
| --- | --- | --- | --- |
| `VITE_DEBUG` | No | `false` | Debug flag in `CORE_CONFIG` (`src/core/config/coreConfig.ts`). Enabled only when the value is exactly `true`. |
| `VITE_LOG_LEVEL` | No | `debug` in development, `warn` otherwise | Minimum level logged by `src/utils/logging.ts`: `debug`, `info`, `warn`, `error` or `none`. Unrecognised values fall back to the default. |

**Dev vs production:** leave `VITE_LOG_LEVEL` unset in production so the default `warn`
applies, or set `warn`/`error` explicitly. Keep `VITE_DEBUG=false` outside local debugging.

## 5. How CI supplies configuration

The CI build does not read `.env` from the repository. Pass secrets as environment variables
on the build step; Vite inlines the `VITE_*` values into `dist/`:

```yaml
- name: Production build
  run: pnpm build
  env:
    VITE_BUGSINK_DSN: ${{ secrets.VITE_BUGSINK_DSN }}
    VITE_APP_VERSION: ${{ github.sha }}
    VITE_DB_PROVIDER: sqlite-wasm
    VITE_DB_MODE: production
```

Guidance:

- Store real DSNs, API keys and passwords as GitHub Actions secrets (or the equivalent in
  your CI system). Do not add them to `.env.example`, workflow files or documentation.
- `VITE_APP_VERSION` should identify the build (tag or commit SHA) so Bugsink releases are
  traceable.
- The CI workflow runs `node scripts/prd/secret-scan.mjs` before installing dependencies.
  A committed secret fails the job.

## 6. How a self-hosted deployment supplies configuration

On the server, create `.env.local` (ignored by Git) next to the checkout:

```bash
VITE_PORT=5200
VITE_HOST=0.0.0.0
VITE_DB_PROVIDER=sqlite-wasm
VITE_DB_MODE=production
VITE_DEPLOYMENT_ENV=production
VITE_BUGSINK_DSN=https://<public-key>@<bugsink-host>/<project-id>
```

Then build and serve `dist/`:

```bash
pnpm install --frozen-lockfile
pnpm build
```

The build reads `.env.local` and bakes the `VITE_*` values into the static files. Rebuild
after changing any value; editing `.env.local` on a running server has no effect until the
next build. See `docs/guides/SELF_HOSTING_DEPLOYMENT.md` for the full server runbook.

## 7. Secret scan

`scripts/prd/secret-scan.mjs` is the repository guard. It scans:

- **Tracked files** by default (`git ls-files`), which is the CI gate.
- **The working tree** with `--all`, including untracked files such as `.env`, while skipping
  `.git`, `.claude`, `node_modules`, `dist`, `dist-ssr`, `dev-dist`, `coverage` and
  `.prd-gate`.

```bash
pnpm secret:scan                                  # tracked files (CI gate)
node scripts/prd/secret-scan.mjs --all            # working tree, including .env
node scripts/prd/secret-scan.mjs --root <dir>     # a fixture or another checkout
```

Findings are printed as `file:line: rule - description`. The scanner never prints the
matched value. Exit codes: `0` clean, `1` findings, `2` usage or scan error.

Detected patterns:

| Rule | What it catches |
| --- | --- |
| `bugsink-dsn` | `VITE_BUGSINK_DSN` set to anything other than an empty value or a placeholder. |
| `credential-url` | `postgres://`, `postgresql://`, `mysql://`, `mariadb://`, `mongodb://`, `mongodb+srv://`, `redis://`, `amqp://` or `http(s)://` URLs with an embedded `user:password@`. |
| `openai-key` | `sk-` keys with at least 20 key characters. |
| `aws-access-key` | `AKIA` access key ids. |
| `private-key` | PEM `BEGIN ... PRIVATE KEY` blocks. |
| `password-assignment` | `*_PASSWORD=`, `*_PASSWD=`, `*_SECRET=`, `*_TOKEN=`, `*_API_KEY=` or `*_DSN=` assigned a non-placeholder value. |

Placeholders include empty values, `<...>`, `your_*`, `${...}`, `%...%`, and values that are
wholly `example`, `placeholder`, `changeme`, `redacted` or a generic documentation phrase such
as `db-auth-password`. Marker words only count as whole values or whole tokens: a host such as
`bugsink.example.test` does not make a real credential a placeholder. Documentation and test
fixtures that must show a sample can end the line with `secret-scan:allow`; use that marker
sparingly.

## 8. Known exposure: Bugsink DSN

The Bugsink DSN was committed in `.env` and carried in commits `3c15628` and `5729289`.
`.env` has been tracked since `f116219` and was present at `dea6d2e`; the base commit
`aeca2a9` still contained the non-placeholder DSN. The current change removes `.env` from
the index with `git rm --cached`, ignores `.env` and every `.env.*` variant except
`.env.example`, and adds the CI secret scan.

Consequences and required follow-up:

1. **The current tree is clean.** `pnpm secret:scan` reports no findings on tracked files,
   and `.env` is ignored and untracked.
2. **Git history still contains the old value.** Anyone with clone access can recover it.
   Rewriting shared history with `git filter-repo` or BFG is a separate owner decision:
   it changes every commit SHA and requires coordinating every clone. This task does not
   rewrite history.
3. **Rotate the Bugsink key now.** Create a new project key in Bugsink, deploy it through
   CI/deployment secrets, confirm events arrive, then revoke the old key. Treat the old
   value as compromised until it is revoked.
4. **Do not paste the old key into an issue, chat or commit** while investigating. Refer to
   it as "the historically committed Bugsink DSN".

## 9. Verification checklist

```bash
# 1. No secret in the tracked tree
pnpm secret:scan

# 2. .env is ignored and not tracked
git check-ignore -v .env
git ls-files .env        # must print nothing
git status --porcelain   # must not list .env

# 3. The template is safe to commit
node scripts/prd/secret-scan.mjs --root .
```

If step 1 fails, remove the value, rotate the credential and replace it with a placeholder.
Do not silence the scanner by adding an allow marker to a real secret.
