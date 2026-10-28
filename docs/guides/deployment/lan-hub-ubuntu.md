# Deployment: LAN hub on Ubuntu

An Ubuntu machine (server, mini-PC or VM) runs the SchoolPilot hub for the school's network. This
page is the step-by-step; the reference for every option, the certificate and discovery is
[the hub deployment guide](../deployment-hub.md).

Read [what a hub gives you today](lan-hub-windows.md#what-a-hub-gives-you-today) first: the hub is
the server side of the platform and it is tested, but the browser app's screens still keep their data
in the browser. A hub install is the right foundation; it is not yet shared data in the app.

## What you need

- Ubuntu 22.04 LTS or 24.04 LTS, 64-bit, with `sudo` for the installing user.
- 2 GB RAM and 20 GB disk is comfortable; the payload is tens of megabytes and a school's SQLite
  database is small.
- A fixed LAN address (or a DHCP reservation), and the machine on the same subnet as the staff
  devices.
- A checkout of this repository on the machine, or a copy reachable as a path or URL.

## Install

From the repository root:

```bash
sudo bash packaging/ubuntu/install-hub.sh
```

Give the hub a name staff will type, and put the data on the disk you back up:

```bash
sudo bash packaging/ubuntu/install-hub.sh --name stmarys --data-dir /srv/schoolpilot-data
```

The options are the same for all three installers (`--root`, `--data-dir`, `--port`, `--host`,
`--name`, `--source`, `--node-strategy`, `--no-service`, `--no-tls`, `--mdns-port`, `--dry-run`);
[deployment-hub.md](../deployment-hub.md#options-all-three-installers) has the table. Dry-run
first if the machine already runs something:

```bash
sudo bash packaging/ubuntu/install-hub.sh --dry-run --name stmarys
```

What it does: preflight → Node ≥ 22 (the system's, NodeSource's, or an official build unpacked into
the root) → payload → `npm ci` against `packaging/hub/package.json` → verify better-sqlite3 loads
under that Node → issue or reuse the TLS certificate → write `hub.env` → install `libnss-mdns` and
the firewall rules → register and start the systemd unit → wait for `/health` over TLS with the
certificate pinned → write `install-summary.json`.

A port below 1024 needs root and the installer refuses it; 8443 is the default and is above 1024.

## The service

| Task | Command |
| --- | --- |
| Start | `sudo systemctl start schoolpilot-hub` |
| Stop | `sudo systemctl stop schoolpilot-hub` |
| Status | `systemctl status schoolpilot-hub` |
| Log | `journalctl -u schoolpilot-hub -f`, or `/opt/schoolpilot/logs/hub.log` |
| Run in the foreground | `/opt/schoolpilot/run-hub.sh` |
| Stop a foreground run | `/opt/schoolpilot/run-hub.sh --stop` |

The unit template is `packaging/linux/schoolpilot-hub.service`; `@ROOT@` is substituted at install
time. Where a machine has no systemd, the installer falls back to a systemd user service and then to
a background process, and says which it used in the summary and in `install-summary.json`.

## Prove it is up

```bash
# The health report, trusting the certificate the installer issued
curl --cacert /opt/schoolpilot/data/tls/hub-cert.pem https://127.0.0.1:8443/health

# Check a staff device will resolve the name
getent hosts stmarys.local     # needs libnss-mdns, which the installer adds when it can

# What a client on the LAN discovers
npx tsx src/server/cli.ts --discover
```

The certificate is self-signed and pinned: install
`/opt/schoolpilot/data/tls/hub-cert.pem` into the devices' trust store once —

```bash
sudo cp hub-cert.pem /usr/local/share/ca-certificates/schoolpilot-hub.crt
sudo update-ca-certificates
```

— or compare the fingerprint with `data/tls/hub-fingerprint.txt`. Firefox keeps its own certificate
store. The certificate is valid 397 days and reissues under 30 days, changing the fingerprint.

## Backups

```bash
# Start the hub with the passphrase in the environment, never on the command line
SCHOOLPILOT_BACKUP_PASSPHRASE='...' /opt/schoolpilot/run-hub.sh

# Restore one archive into a fresh directory before that instance opens a database
npx tsx src/server/cli.ts --data-dir ./recovered --backup-passphrase '...' \
  --restore-from /opt/schoolpilot/data/backups/<archive>.spbk --restore-to ./recovered
```

Retention is 7 daily, 4 weekly and 12 monthly archives, and the newest archive is always kept.
Restores refuse a directory that already holds a `schoolpilot.db`, so a drill cannot destroy the
database it protects.

Copy `/opt/schoolpilot/data/backups` off the machine on a schedule, and copy
`/opt/schoolpilot/data/keys/restricted-data.key` with it (or however the key is supplied):
without it the encrypted medical and conduct fields in the archive cannot be read.

## Upgrades

Re-run the installer. It is idempotent: it replaces `app/` and its dependencies, and leaves the
database, the certificate and the logs alone. Take a backup first anyway.

## Firewall and network

Allow TCP 8443 from the LAN and UDP 5353 for discovery; the installer adds the rules. mDNS needs
multicast between the hub and the clients, which a flat school LAN has. If a network blocks 5353,
move the advertisement with `--mdns-port` and tell clients the address instead.

Do not run with `--no-tls` on a shared LAN.

## Install-day checklist

- [ ] `/health` answers over TLS with the installed certificate.
- [ ] A second machine resolves `<name>.local` and reaches `/health`.
- [ ] `SCHOOLPILOT_BACKUP_PASSPHRASE` set for the service, and the first backup exists.
- [ ] The backup set and the restricted-data key are in the off-machine routine.
- [ ] `install-summary.json` read and filed.
- [ ] Staff told what a hub does today (link at the top of this page).

## What was and was not verified

The acceptance measurement for this path was run on **Ubuntu 22.04.3 LTS on WSL2**, without
passwordless `sudo`, and therefore with `--no-service`: the installer completed end to end in
**113.8 s**, fetching a Node 22 tarball because the machine had Node 18. The recorded evidence is in
`packaging/verify/evidence/` (`linux-*.json`).

Not exercised in that measurement, and **not exercised by this review either**:

- the NodeSource system install (the run used the local tarball),
- the systemd unit registration and start,
- the firewall rules and `libnss-mdns`,
- a real machine with root, and a second physical device browsing the hub.

Treat those as unverified until someone runs `npx tsx packaging/verify/install-smoke.ts` on real
Ubuntu hardware with sudo.

---

Sources: `packaging/ubuntu/install-hub.sh`, `packaging/lib/install-hub.sh`,
`packaging/linux/run-hub.sh`, `packaging/linux/schoolpilot-hub.service`, `packaging/README.md`,
`docs/guides/deployment-hub.md`, `server/README.md`, `server/backup/README.md`.
