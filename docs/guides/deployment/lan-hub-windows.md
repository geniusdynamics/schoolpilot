# Deployment: LAN hub on Windows

One Windows PC runs the SchoolPilot hub; the school's staff devices reach it over the local
network. This page covers the install and the operator's routine. The detailed reference — every
installer option, the certificate story, mDNS discovery, the acceptance measurement and the full
troubleshooting table — is [the hub deployment guide](../deployment-hub.md); this page is the
step-by-step for a school.

## What a hub gives you today

This is the part to read before you promise a school a shared database.

| A hub gives you | A hub does not give you (yet) |
| --- | --- |
| One canonical SQLite database on the hub machine, with one encrypted backup set | A browser app served by the hub. It answers `/health`, `/.well-known/schoolpilot-hub` and `/api/**`; it does not serve the app's HTML and JavaScript. |
| An authenticated HTTP API: `/api/auth`, `/api/entities`, `/api/services`, `/api/approvals`, `/api/backups`, `/api/sync`, `/api/sequences` | App pages that read and write through that API. The browser app's canonical repository opens a local SQLite database in the browser (`src/data/canonicalRepository.tsx`); it has no HTTP adapter, and the client sync engine (`src/data/sync`) is not wired into the screens. |
| Role-based authorisation on those four APIs, maker–checker approvals, encrypted at-rest fields, restricted-data access logging | Role enforcement in the browser pages: the app's canonical repository is built without the authoriser, so a page does not consult the permission matrix for its writes. |
| Daily encrypted backups with 7/4/12 retention, restore into a fresh directory, a restore drill | Backup of the data in a staff device's browser. The hub backs up its own database. |
| TLS with a self-signed, pinned certificate, mDNS discovery, a health report | A pairing handshake that issues a device its own credential. |

So today the honest description is: **the hub is the server side of the platform, ready and tested;
the browser app is still a local-database application.** A school that installs the hub gets a
well-backed-up server and the API the next phase of the product will use. It does not yet get
"everyone's data in one place" in the app's screens. Say that to the school before the installation
day, not after.

## What you need

- Windows 10 1803 or later, or Windows 11, 64-bit.
- An administrator account on the machine for the service and the firewall rule. Without elevation
  the installer still installs and starts the hub, but says it skipped the scheduled task and the
  firewall rule and leaves the hub running as a background process.
- A wired network connection, and a fixed address (or a DHCP reservation) for the machine.
- A checkout of this repository on the machine, or a copy of it reachable as a path or a URL — the
  installer copies the payload from there.

## Install

From the repository root, in PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File packaging\windows\install-hub.ps1
```

Useful options (the full table is in [deployment-hub.md](../deployment-hub.md#options-all-three-installers)):

| Option | Default | Meaning |
| --- | --- | --- |
| `-Root` | `%ProgramData%\SchoolPilot` | Where the hub is installed. |
| `-DataDir` | `<root>\data` | Database, TLS material, backups. Put it on a disk you back up. |
| `-Port` | `8443` | The port the hub listens on. |
| `-HostAddress` (alias `-Bind`) | `0.0.0.0` | The address to bind. |
| `-Name` | this machine's name | The name clients resolve as `<name>.local`. |
| `-Source` | the checkout the installer sits in | A checkout directory, a `.tar.gz` (path or URL) or a git URL. |
| `-NodeStrategy` | `auto` | `system`, `local` (unpack Node inside the root) or `none`. |
| `-MdnsPort` | `5353` | The mDNS UDP port. |
| `-NoService` | off | Do not register the scheduled task; start the hub in the background. |
| `-NoTls` | off | Serve plain HTTP. A loopback development box only. |
| `-DryRun` | off | Print every step and change nothing. |

Check the plan before you commit to it:

```powershell
powershell -ExecutionPolicy Bypass -File packaging\windows\install-hub.ps1 -DryRun -Name stmarys
```

What the installer does, in order: preflight (OS, architecture, disk, port, existing install) →
Node ≥ 22 (the machine's own, or one unpacked into the root) → payload → `npm ci` against
`packaging/hub/package.json` → verify that better-sqlite3 loads under *that* Node → issue or reuse
the TLS certificate → write `hub.env` → firewall rules → register and start the `SchoolPilotHub`
scheduled task → wait for `/health` over TLS with the issued certificate pinned → write
`install-summary.json`.

Node 22 or newer is a hard requirement (`$script:RequiredNodeMajor = 22` in the installer).

## The service

| Task | Command |
| --- | --- |
| Start | `Start-ScheduledTask -TaskName SchoolPilotHub` |
| Stop | `Stop-ScheduledTask -TaskName SchoolPilotHub` |
| Status | `Get-ScheduledTaskInfo -TaskName SchoolPilotHub` |
| Log | `%ProgramData%\SchoolPilot\logs\hub.log` |
| Run in the foreground | `& "%ProgramData%\SchoolPilot\run-hub.ps1"` |
| Stop a foreground run | `& "%ProgramData%\SchoolPilot\run-hub.ps1" -Stop` |

The installed layout is `app/` (the hub's sources and its own `node_modules`), `data/`
(`schoolpilot.db`, `tls/`, `backups/`), `hub.env` (port, data directory, name, TLS switch), `logs/`
and `hub.pid`. Re-running the installer upgrades the payload in place and leaves the database, the
certificate and the logs alone.

## Prove it is up

```powershell
# On the hub itself: the health report, with the certificate the installer issued
curl.exe --cacert "$env:ProgramData\SchoolPilot\data\tls\hub-cert.pem" https://127.0.0.1:8443/health

# What a client on the LAN discovers without being told an address
npx tsx src/server/cli.ts --discover --json
```

The health report carries the protocol, the TLS fingerprint, the database file, the entity count
and the discovery block. A staff device on the same subnet should resolve
`https://<name>.local:8443` — Windows 10 1803+ resolves `.local` natively.

The certificate is **self-signed and pinned**. Either install
`data\tls\hub-cert.pem` as a trusted certificate on a staff device (double-click, install for the
computer), or compare the fingerprint with `data\tls\hub-fingerprint.txt`. It is valid 397 days and
reissues when fewer than 30 days remain, at which point every device that pinned it must pin the
new one.

## Backups

1. Give the hub a passphrase before you rely on it. The key comes from `--backup-passphrase`,
   `--backup-key-file` or `SCHOOLPILOT_BACKUP_PASSPHRASE`; prefer the environment variable or a key
   file, because a command-line passphrase is visible in the process list. A key file must live
   outside the backup directory, and it must be at least 16 bytes after trimming.
2. The hub backs up daily (02:00 UTC by default) and keeps 7 daily, 4 weekly and 12 monthly
   archives.
3. Copy `<root>\data\backups` off the machine on a schedule. A backup on the same disk survives a
   mistake, not a theft.
4. Prove a restore monthly. A restore always targets a fresh directory and refuses one that already
   holds a `schoolpilot.db`:

   ```powershell
   npx tsx src/server/cli.ts --data-dir .\recovered --backup-passphrase "<passphrase>" `
     --restore-from <root>\data\backups\<archive>.spbk --restore-to .\recovered
   ```

5. **Back up the restricted-data key too.** `<root>\data\keys\restricted-data.key` (or the
   `SCHOOLPILOT_RESTRICTED_KEY` value) opens the encrypted columns — a learner's medical notes and
   special needs, a health visit, a conduct incident. A hub that finds sealed values with no key
   refuses to start rather than run with half the data unreadable.

## Firewall and network

Allow TCP `-Port` (8443 by default) from the LAN, and UDP 5353 for discovery. The installer adds
those rules when it runs elevated. On a Windows machine another mDNS responder may already hold UDP
5353; the hub shares the port for multicast queries, and `-MdnsPort` moves the advertisement when a
network blocks 5353.

Never run the hub with `-NoTls` on a shared LAN: the session token and every restricted field a
signed-in caller reads would travel in the clear.

## Install-day checklist

- [ ] Fixed address or DHCP reservation; the machine will not be renumbered.
- [ ] Elevated PowerShell; the scheduled task and firewall rule registered.
- [ ] `install-summary.json` read: total time, certificate path, fingerprint, service name.
- [ ] `/health` answers over TLS with that certificate.
- [ ] `--discover` finds the hub from another machine on the LAN.
- [ ] Backup passphrase set and stored somewhere that is not the hub.
- [ ] `<root>\data\backups` in the school's off-machine backup routine.
- [ ] The school told, in plain words, what a hub does today (top of this page).

## Untested on this machine, and what was measured

The Windows installer has an acceptance measurement in the repository: `npx tsx
packaging/verify/install-smoke.ts` installs into a fresh root, checks the hub as a client meets it
and times the whole thing. The recorded run for Windows is in `packaging/verify/evidence/`
(`win32-*.json`) and took **67.1 s** on Windows 11 with Node 24 already present, with the steps
broken down as preflight 7 s, Node 1 s, payload 22 s, dependencies 13 s, certificate 4 s, hub ready
10 s. Repeated runs on that machine ranged 67 s–355 s depending on disk and npm cache warmth.

That measurement ran **unelevated**, so `Register-ScheduledTask` and `New-NetFirewallRule` were
skipped; the task definition and the firewall rule are in the tree but their registration was not
executed. A second physical device browsing `https://<name>.local:8443`, and a restore on a real
installation, are still the checks that matter. **This review did not run the installer at all.**

---

Sources: `packaging/windows/install-hub.ps1` (options, Node 22 requirement, steps),
`packaging/windows/run-hub.ps1`, `packaging/README.md`, `packaging/hub/package.json`,
`docs/guides/deployment-hub.md` (options, service table, discovery, TLS, measurement),
`server/README.md` (the API surface and what it deliberately does not do),
`server/backup/README.md` (archive, key, retention, restore),
`src/server/LANServer.ts` and `server/http/hubRouter.ts` (what the hub actually serves).
