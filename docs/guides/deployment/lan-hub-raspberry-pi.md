# Deployment: LAN hub on a Raspberry Pi

A Raspberry Pi is the cheapest way to leave a hub running in a school office: low power, silent, and
enough for one SQLite database and a handful of API clients. This page is the Pi-specific part; the
installer options, certificate and discovery are in
[the hub deployment guide](../deployment-hub.md), and
[what a hub gives you today](lan-hub-windows.md#what-a-hub-gives-you-today) applies here unchanged.

## What you need

- A **Raspberry Pi 3 or newer**, and Raspberry Pi OS 64-bit (or the 32-bit armv7 image). A Pi 1 or
  Zero is refused: `armv6` has no Node build at the version the hub needs.
- A microSD card for the operating system, and **a USB disk or SSD for the data** — see below.
- A wired network connection. Wi-Fi works but a school's Wi-Fi is the part that fails.
- A power supply that does not brown out under load.

## Install

```bash
sudo bash packaging/raspberry-pi/install-hub.sh --data-dir /mnt/usb/schoolpilot
```

The Pi installer is the Ubuntu installer plus three things:

1. it refuses `armv6` (a Pi 1 or Zero cannot run a supported Node),
2. it warns below 900 MB of RAM (add swap, or expect `npm ci` to fail),
3. it takes the official Node build for the board's architecture rather than a distribution
   package, because Raspberry Pi OS is not a distribution NodeSource publishes for.

**Keep the database off the SD card.** `--data-dir` on a USB disk or SSD is the difference between a
hub that survives a power cut and one that does not: SD cards do not do many small writes well. A
Pi with the data directory on the card will work, and will eventually corrupt it.

Name it what staff will type:

```bash
sudo bash packaging/raspberry-pi/install-hub.sh --name stmarys --data-dir /mnt/usb/schoolpilot
```

The remaining options (`--root`, `--port`, `--host`, `--source`, `--node-strategy`, `--no-service`,
`--no-tls`, `--mdns-port`, `--dry-run`) are the shared ones, listed in
[deployment-hub.md](../deployment-hub.md#options-all-three-installers).

## The service

| Task | Command |
| --- | --- |
| Start | `sudo systemctl start schoolpilot-hub` |
| Stop | `sudo systemctl stop schoolpilot-hub` |
| Status | `systemctl status schoolpilot-hub` |
| Log | `journalctl -u schoolpilot-hub -f`, or `/opt/schoolpilot/logs/hub.log` |
| Foreground | `/opt/schoolpilot/run-hub.sh` (and `--stop`) |

On a Pi, watch the temperature and the power. A hub that restarts every afternoon is usually a
power supply, not the software: `vcgencmd get_throttled` reports under-voltage.

## Prove it is up

```bash
curl --cacert /opt/schoolpilot/data/tls/hub-cert.pem https://127.0.0.1:8443/health
npx tsx src/server/cli.ts --discover
```

Then from a staff device: `https://stmarys.local:8443`. Install
`/opt/schoolpilot/data/tls/hub-cert.pem` as trusted on each device, or pin the fingerprint from
`data/tls/hub-fingerprint.txt`.

## Backups, and the SD-card rule again

The hub writes its encrypted archives under `<data-dir>/backups` — on the USB disk, which is where
they belong. Copy them off the Pi on a schedule; a backup on the disk that failed is not a backup.
Set the passphrase through `SCHOOLPILOT_BACKUP_PASSPHRASE` in the service environment, and copy
`data/keys/restricted-data.key` with the archives.

A restore targets a fresh directory:

```bash
npx tsx src/server/cli.ts --data-dir ./recovered --backup-passphrase '...' \
  --restore-from /mnt/usb/schoolpilot/backups/<archive>.spbk --restore-to ./recovered
```

## Power and storage hygiene

- Use the official (or a good 3 A) supply; a phone charger is the usual cause of corruption.
- Mount the USB disk by UUID in `/etc/fstab`, so a reordering of USB devices does not leave the hub
  writing to the card.
- `sudo systemctl disable --now` nothing else you need; a Pi that also runs a desktop is not a hub.
- Shut down with `sudo shutdown -h now` rather than pulling the power.

## What was and was not verified

**Nothing about this path was executed.** No Raspberry Pi was available for the measurement that
produced the other two platforms' evidence, and this review did not run the installer either. The
installer is the Ubuntu installer plus arm checks and an architecture-specific Node, and the hub's
dependency set has published builds for `armv7l` and `arm64`, but that is an argument, not a test.

Treat every step above as **untested**. The check that settles it is the same one the other
platforms used, on the board itself:

```bash
npx tsx packaging/verify/install-smoke.ts
```

It fails unless the hub answers `/health` over TLS with the certificate the installer reported, mDNS
finds it without being told an address, and the first authenticated request is served.

---

Sources: `packaging/raspberry-pi/install-hub.sh` (armv6 refusal, the 900 MB warning, the
architecture-specific Node), `packaging/README.md`, `docs/guides/deployment-hub.md` (including its
explicit "no Pi is available here" note), `server/README.md`, `server/backup/README.md`.
