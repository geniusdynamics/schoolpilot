# Packaging

One installer per target that takes a fresh machine to a running hub:

| Target | Entry point |
| --- | --- |
| Ubuntu | [`ubuntu/install-hub.sh`](ubuntu/install-hub.sh) |
| Raspberry Pi (Raspberry Pi OS) | [`raspberry-pi/install-hub.sh`](raspberry-pi/install-hub.sh) |
| Windows | [`windows/install-hub.ps1`](windows/install-hub.ps1) |

The operator's guide — options, the service, discovery, the certificate story, the acceptance
measurement and troubleshooting — is [`docs/guides/deployment-hub.md`](../docs/guides/deployment-hub.md).
This file is the map of the directory.

| Path | What it is |
| --- | --- |
| `lib/install-hub.sh` | the install itself, shared by the two Linux entry points; each adds only what its platform needs |
| `ubuntu/install-hub.sh` | the Ubuntu entry point: `install_hub_main` with Ubuntu's defaults |
| `raspberry-pi/install-hub.sh` | the Pi entry point: architecture and memory checks, and the board's own Node build |
| `windows/install-hub.ps1` | the Windows installer: PowerShell 5.1, Node via winget or an unpacked build, a scheduled task |
| `linux/run-hub.sh` | the launcher the systemd unit runs, and an operator can run: reads `hub.env`, `--stop` stops it |
| `linux/schoolpilot-hub.service` | the systemd unit template (`@ROOT@` is substituted at install time) |
| `windows/run-hub.ps1` | the Windows launcher: reads `hub.env`, records the hub's pid, `-Stop` stops it |
| `hub/package.json` | the hub's runtime dependencies — `better-sqlite3`, `tsx`, `zod` and nothing else |
| `hub/package-lock.json` | the lockfile the installer's `npm ci` uses |
| `verify/install-smoke.ts` | the acceptance measurement: install, then check the hub as a client meets it |
| `verify/evidence/` | what each measurement run produced |

## Why the payload has its own manifest

The hub serves the repository and the domain services over HTTP; it imports `node:http`, `node:crypto`,
`node:dgram`, better-sqlite3 and zod. The browser's dependency tree — React, LiveStore, PouchDB,
puppeteer, the lot — is never installed on a school PC. `hub/package.json` says so in one file, and
the installer copies it over the checkout's manifest, so a hub install is tens of megabytes and a
minute of `npm ci` instead of a full frontend install.

The hub runs its TypeScript through `tsx`, which is why there is no build step in the installer: the
payload is the same source the tests run, and an upgrade is a copy.

## Running the smoke test

```bash
npx tsx packaging/verify/install-smoke.ts            # this platform's installer, fresh root
npx tsx packaging/verify/install-smoke.ts --help     # no such flag: see the header of the file
```

It exits non-zero when the hub does not answer over TLS with the reported certificate, when a browse
cannot find it, or when the install took longer than fifteen minutes.
