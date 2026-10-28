# Deploying the hub on a school LAN

The hub is topology B of [spec 06 §3.1](../../specs/multi-curriculum-platform/06-platform-architecture.md):
one Node server over the canonical SQLite database, on a school PC, mini-PC or Raspberry Pi, serving
staff devices on the LAN. This guide is the operator's side of it: three installers, how a client
finds the hub without being told an address, and the certificate story.

Everything here is in `packaging/`, and the measurement at the end is the acceptance evidence for
task P4-D02 ("fresh install to first login ≤ 15 min").

## What an install produces

| Path | What it is |
| --- | --- |
| `/opt/schoolpilot` (Ubuntu, Raspberry Pi) | the install root; `%ProgramData%\SchoolPilot` on Windows |
| `<root>/app` | the hub's sources and its own `node_modules` — the browser's dependency tree is never installed here |
| `<root>/data` | `schoolpilot.db`, `tls/`, and (P4-D01) `backups/` |
| `<root>/data/tls/hub-key.pem`, `hub-cert.pem`, `hub-fingerprint.txt` | the LAN certificate, its key (mode 0600) and the fingerprint clients pin |
| `<root>/hub.env` | the one place the port, data directory, name and TLS switch live |
| `<root>/run-hub.sh` / `run-hub.ps1` | the launcher: `systemd` and the scheduled task run this, and so can you |
| `<root>/logs/hub.log` | the hub's output |
| `<root>/hub.pid` | the hub's own process id, written while it runs |
| `<root>/install-summary.json` | what the installer did, and how long each step took |
| `<root>/node/` | present only when the machine had no Node ≥ 22 and one was unpacked here |

The install is idempotent: running the installer again upgrades the payload and its dependencies in
place and leaves the database, the certificate and the logs alone.

## Install

### Ubuntu

```bash
sudo bash packaging/ubuntu/install-hub.sh
```

### Raspberry Pi (Raspberry Pi OS, 64-bit or armv7)

```bash
sudo bash packaging/raspberry-pi/install-hub.sh --data-dir /mnt/usb/schoolpilot
```

The Pi installer adds three things to the Ubuntu one: it refuses armv6 (a Pi 1 or Zero cannot run a
supported Node), it warns below 900 MB of RAM, and it takes the official Node build for the board's
architecture rather than a distribution package, because Raspberry Pi OS is not a distribution
NodeSource publishes for. Keep the database off the SD card when you can: `--data-dir` on a USB disk
or SSD is the difference between a hub that survives a power cut and one that does not.

### Windows (PowerShell, elevated for the service and the firewall rule)

```powershell
powershell -ExecutionPolicy Bypass -File packaging\windows\install-hub.ps1
```

Without elevation the installer still installs and starts the hub; it warns that it skipped the
scheduled task and the firewall rule, and leaves the hub running as a background process.

### Options (all three installers)

| Option | Default | Meaning |
| --- | --- | --- |
| `--root` / `-Root` | `/opt/schoolpilot`, `%ProgramData%\SchoolPilot` | where the hub is installed |
| `--data-dir` / `-DataDir` | `<root>/data` | database, TLS material, backups |
| `--port` / `-Port` | `8443` | the port the hub listens on |
| `--host` / `-HostAddress` | `0.0.0.0` | the address to bind |
| `--name` / `-Name` | this machine's name | the name clients resolve as `<name>.local` |
| `--source` / `-Source` | the checkout the installer sits in | a checkout directory, a `.tar.gz` (path or URL) or a git URL |
| `--node-strategy` / `-NodeStrategy` | `auto` | `system`, `local` (unpack Node inside the root) or `none` |
| `--no-service` / `-NoService` | off | do not register a service; start the hub in the background |
| `--no-tls` / `-NoTls` | off | serve plain HTTP (a trusted loopback box only) |
| `--mdns-port` / `-MdnsPort` | `5353` | the mDNS UDP port |
| `--dry-run` / `-DryRun` | off | print every step and change nothing |

What the installer does, in order: preflight (OS, architecture, disk, port, existing install) →
Node ≥ 22 (the machine's own, NodeSource, or an official build unpacked into the root) → payload →
`npm ci` against `packaging/hub/package.json` → verify that better-sqlite3 loads under *that* Node →
issue or reuse the TLS certificate → write `hub.env` → install `libnss-mdns` (Linux) and the firewall
rules → register and start the service → wait for `/health` over TLS with the issued certificate
pinned → write the summary.

## The service

| | Ubuntu, Raspberry Pi | Windows |
| --- | --- | --- |
| Unit | `schoolpilot-hub.service` (systemd) | the `SchoolPilotHub` scheduled task (at startup, as SYSTEM) |
| Start | `sudo systemctl start schoolpilot-hub` | `Start-ScheduledTask -TaskName SchoolPilotHub` |
| Stop | `sudo systemctl stop schoolpilot-hub` | `Stop-ScheduledTask -TaskName SchoolPilotHub` |
| Status | `systemctl status schoolpilot-hub` | `Get-ScheduledTaskInfo -TaskName SchoolPilotHub` |
| Log | `journalctl -u schoolpilot-hub -f`, or `<root>/logs/hub.log` | `<root>\logs\hub.log` |
| Manual run | `<root>/run-hub.sh` | `& <root>\run-hub.ps1` |
| Stop a manual run | `<root>/run-hub.sh --stop` | `& <root>\run-hub.ps1 -Stop` |

Where a machine has no systemd, the installer falls back to a systemd user service, and then to a
background process; it says which one it used in the summary and in `install-summary.json`.

## LAN discovery: how a client finds the hub

Three mechanisms, in the order a client would use them.

1. **mDNS/DNS-SD.** The hub advertises `_schoolpilot._tcp.local` on 224.0.0.251:5353, answering
   service and host queries and announcing itself on start (and saying goodbye on stop). The records
   are a PTR for the service, an SRV with the port, a TXT with `ver`, `path`, `tls`, `name` and
   `fp` (the certificate fingerprint), and an A record for the hub's LAN addresses. This is the
   path a client uses when it is told nothing at all: browse the service type, read the SRV and the
   TXT, connect to the host name it just learned, and pin the fingerprint it was handed.
2. **The host name.** The hub is reachable as `<name>.local` — the machine's name by default, or
   whatever `--name` was given (`--name stmarys` gives `https://stmarys.local:8443`, the address a
   client uses for the hub's API). Windows 10 1803+, macOS and iOS resolve `.local` natively; on
   Linux the installer installs `libnss-mdns` when it can. **The hub does not serve the browser
   application:** it answers `/health`, `/.well-known/schoolpilot-hub` and `/api/**`, so opening
   `https://stmarys.local:8443` in a browser shows the health or descriptor response, not the app.
   Staff open the app from wherever it is served; see
   [What a hub gives you today](deployment/lan-hub-windows.md#what-a-hub-gives-you-today).
3. **The well-known descriptor.** `GET /.well-known/schoolpilot-hub` answers with the service type,
   protocol version, port, instance and host names, addresses and the TLS fingerprint, so a client
   that reached the hub by address can confirm what answered before it pins anything.

Browsing from a terminal:

```bash
# On the hub or anywhere on the LAN
node <root>/app/node_modules/tsx/dist/cli.mjs <root>/app/src/server/cli.ts --discover
# or from a checkout
npx tsx src/server/cli.ts --discover --json
```

```
stmarys  https://stmarys.local:8443
  host:      stmarys.local
  addresses: 192.168.1.20
  tls:       on
  pin:       795ece5f2395518fc4d6c2623031d4902b9d26b1f7548eded38bfbefc6163ac6
```

Two notes that come from running this on Windows: the machine's own mDNS responder already holds
UDP 5353, so the hub's responder shares the port (which works for multicast queries, the ones a LAN
client sends) and a *unicast* query to `127.0.0.1:5353` may be answered by that other responder
instead. `--address` exists for that case, and `--mdns-port` moves the advertisement when a network
blocks 5353. Multicast must also be allowed between the hub's subnet and the clients' — on a flat
school LAN it is.

## TLS on the LAN

**The certificate is self-signed and pinned.** The hub issues itself an ECDSA P-256 certificate on
first run, using `node:crypto` alone (`src/server/tls/selfSigned.ts`), and writes it to
`<root>/data/tls/`. Clients either install `hub-cert.pem` once as a trusted certificate or compare
the SHA-256 fingerprint they were given with the one the hub advertises (`fp=` in mDNS, the well-known
descriptor, `/health`, and the `hub-fingerprint.txt` file).

Why not ACME: Let's Encrypt and its peers issue only for a name they can reach on the public
internet, which means a public DNS name, a publicly reachable hub and a working internet connection
during renewal. A school hub is the opposite of all three — it exists because the internet is
unreliable — and its name is a `.local` mDNS name that no CA can validate. A public CA would also
publish the school's internal host names in Certificate Transparency logs.

Why not a per-school internal CA: it is more moving parts than a school's operator should carry (a
CA key to protect, a revocation story, distribution) for a network whose only members are the
school's own devices. If a school does have a real domain and a CA, the hub will serve a certificate
they bring: `--tls-cert /etc/ssl/hub.pem --tls-key /etc/ssl/hub.key`, and no self-signed material is
written at all.

What the certificate covers: `<name>.local` (what the hub advertises), this machine's own
`<hostname>.local`, `schoolpilot.local`, `localhost`, `127.0.0.1` and every non-internal IPv4 address
the machine had when the certificate was issued. Validity is 397 days — the longest a client accepts
from a certificate it has not seen before — and the hub reissues it when fewer than 30 days remain,
at which point the fingerprint changes and every client that pinned the old one must pin the new one.
That is the cost of pinning without a CA, and it happens at most once a year.

Distributing trust, in order of effort:

```bash
# One machine: pin the fingerprint (no trust store change)
curl --cacert <root>/data/tls/hub-cert.pem --resolve stmarys.local:8443:192.168.1.20 https://stmarys.local:8443/health

# Every machine: install the PEM as a trusted certificate (Windows: double-click, install for the
# computer; Ubuntu: sudo cp hub-cert.pem /usr/local/share/ca-certificates/schoolpilot-hub.crt &&
# sudo update-ca-certificates; Firefox keeps its own store)
```

Ports to allow through the firewall: TCP `--port` (8443 by default) from the LAN, and UDP 5353 for
discovery. Both installers add those rules when they run with the privileges to do so.

Plain HTTP exists only for a loopback development box: `--no-tls`. There is no configuration in which
a hub on a shared LAN should be run that way: the bearer session token travels in the clear, and so
does every restricted field a signed-in caller reads.

## The acceptance measurement

The task's acceptance is "fresh install to first login ≤ 15 min". `packaging/verify/install-smoke.ts`
is the measurement: it runs a real installer against a fresh root, then checks the hub the way a
client meets it and times the whole thing.

```bash
npx tsx packaging/verify/install-smoke.ts                                   # this platform's installer
npx tsx packaging/verify/install-smoke.ts --installer packaging/ubuntu/install-hub.sh --source .
npx tsx packaging/verify/install-smoke.ts --keep --mdns-port 15353         # leave it running, spare mDNS port
```

It fails (non-zero) unless the hub answers `/health` over TLS with the certificate the installer
reported, mDNS finds it without being told an address, and the first authenticated request is served.
Evidence lands in `packaging/verify/evidence/`.

Two runs on the machines available to this task, with the current code:

| Target | Machine | Install to first login | Where it was run |
| --- | --- | --- | --- |
| Windows | Windows 11 10.0.22631, AMD64, Node 24 already present | **67.1 s** (1 m 07 s) | the machine itself, in this worktree |
| Ubuntu | Ubuntu 22.04.3 LTS on WSL2, x86_64, Node 18 present so a Node 22 was fetched | **113.8 s** (1 m 54 s) | WSL2, no sudo, `--no-service` |
| Raspberry Pi | — | not measured | see below |

Both are in `packaging/verify/evidence/`. The spread across repeated runs on this machine was
67 s–355 s: the payload copy and `npm ci` dominate, and both depend on the disk and on whether npm's
cache is warm (the 355 s run was the first on a cold cache and a busy machine; the 67 s run is the
same install warm). The step breakdown of the Windows run: preflight 7 s, Node 1 s (already present),
payload 22 s, dependencies 13 s, certificate 4 s, hub ready 10 s.

The Ubuntu run fetches a Node 22 tarball (34 s of its total) because WSL had Node 18 and no sudo to
upgrade it; a machine that already has Node ≥ 22 skips that. Its payload copy is also from a
Windows-mounted checkout, which is slower than a local one.

**What was not verified, and why:**

- **Raspberry Pi.** No Pi is available here, so no Pi run happened. The installer is the Ubuntu
  installer plus arm checks and an architecture-specific Node, and the payload's dependency set has a
  published build for armv7l and arm64; nothing about the Pi path was executed. Treat it as
  unverified until someone runs `install-smoke.ts` on a board.
- **Ubuntu on real hardware, with root.** WSL2 is a genuine Ubuntu 22.04 userland and the installer
  ran there end to end, but the machine had no passwordless sudo, so `--no-service` was passed: the
  NodeSource system install, the systemd unit, the firewall rules and `libnss-mdns` were not
  exercised. The Node path taken instead was the local tarball download (checksum-verified), and the
  hub was started as a background process by the same launcher the unit runs.
- **The Windows service and firewall rule.** The measurement ran unelevated, so `Register-ScheduledTask`
  and `New-NetFirewallRule` were skipped (the installer says so). The unit file, the task definition
  and the wrapper scripts are in the tree, but their registration was not executed here.
- **A second physical device.** Discovery was proven with a browse on the hub's own machine over the
  multicast group. Two machines on a real LAN, and a browser on a staff PC resolving `stmarys.local`,
  are still the test that matters for the exit criterion.
- **"First login" is not yet a login.** Authentication is P4-C01 and is not on this branch, so the
  milestone measured is the first request the hub serves for a signed-in staff member: `POST
  /api/sessions` when that route exists, and otherwise the repository API with the actor header the
  hub currently trusts. The smoke test reports which one it used. When P4-C01 lands, the same step
  becomes the real login POST and the number does not change.

## What the System Health page (P4-D03) can read from here

- `GET /health` — `running`, `host`, `port`, `uptime`, `databaseFile`, `entityCount`, `startedAt`,
  `protocol`, `tlsFingerprint`, and `discovery`: `{ service, instanceName, hostName, port, addresses,
  running, error }`. `discovery.error` is where a responder that could not bind 5353 says so.
- `GET /.well-known/schoolpilot-hub` — the descriptor a client used to find and trust the hub.
- `<root>/install-summary.json` — platform, root, data directory, port, protocol, URL, certificate
  file, fingerprint, Node version and path, service name, mDNS port, and the per-step durations. A
  health page can show "installed by <platform> in <total>" and the exact paths without guessing.
- `<root>/hub.env` — the configuration the running hub was started with, including
  `SCHOOLPILOT_NODE`, which is the interpreter a diagnostic bundle should report.
- `<root>/logs/hub.log` and `<root>/hub.pid`, plus the service name per platform (above) for
  restart/status actions from the page.
- Not yet available for spec 06 §11 and therefore not to be faked: storage persistence
  (`navigator.storage.persist()` is a client concern; the hub's equivalent is free disk space on the
  data directory), last backup and retention state (P4-D01), sync lag per device and pending outbox
  (P4-A02), integration status, and the diagnostic bundle itself.

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| `the hub did not answer within 120s` | read `<root>/logs/hub.log`. The common causes are below. |
| `was compiled against a different Node.js version` | the machine's PATH held a different Node when `npm ci` ran. The installer checks for this and rebuilds once; if it still fails, install `build-essential` and `python3` (Ubuntu) or the Node.js build tools (Windows) and run the installer again. |
| `invalid ELF header` or a Windows binary on Linux | the hub was started from a directory other than its own, so tsconfig's `@/*` paths resolved into another checkout. The launchers `cd` into `<root>/app`; start the hub with `run-hub.sh` / `run-hub.ps1` rather than by hand. |
| A client cannot reach `https://<name>.local:8443` | check that `.local` resolves (`ping <name>.local`; install `libnss-mdns` on Linux), that UDP 5353 and TCP 8443 are open, and that the client is on the same subnet. A browser at that address gets the hub's health response, not the app (see [What a hub gives you today](deployment/lan-hub-windows.md#what-a-hub-gives-you-today)); fall back to `https://<address>:8443` for the API. |
| Browser warns about the certificate | expected: it is self-signed. Install `<root>/data/tls/hub-cert.pem` as trusted, or confirm the fingerprint against `hub-fingerprint.txt`. |
| `port 8443 is already in use` | something else holds the port. `ss -ltnp` (Linux) or `Get-NetTCPConnection -State Listen -LocalPort 8443` (Windows), then stop it or pass `--port`. |
| The hub will not start after a reinstall | `<root>/logs/hub.log`, then run `<root>/run-hub.sh` in the foreground to see it live. |
