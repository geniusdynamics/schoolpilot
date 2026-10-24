<!--
ABOUTME: The encrypted backup layer of the hub: archive format, key handling, retention, the daily
ABOUTME: schedule, restore and the drill, and the HTTP surface an operator or the health page reads.
-->

# Encrypted backups, restore and the drill

Every hub keeps one encrypted backup set beside its database: `<dataDir>/backups` by default. A
backup is a consistent SQLite snapshot, not a file copy, so a hub that is serving writes still
produces a database that opens cleanly.

The layer lives in this directory. `BackupService` in `service.ts` is the orchestration entry
point; `src/server/LANServer.ts` owns its lifecycle and `server/http/backupRoutes.ts` is its HTTP
surface.

## The archive

One archive is `<id>.spbk` and has four parts:

1. the five ASCII bytes `SPBK1`;
2. the header length as a uint32BE;
3. the JSON header, UTF-8;
4. AES-256-GCM ciphertext followed by its 16-byte authentication tag.

The header is passed to GCM as additional authenticated data, so altering the recorded key id,
digest or timestamps fails decryption. The header carries no secret: the scrypt salt, the AES-GCM
IV and a short `keyId` are public, and the key is derived per archive with scrypt
(`N=16384, r=8, p=1`) from the operator's passphrase and that archive's 16-byte salt.

A snapshot is written with `VACUUM INTO ?` after `repository.whenIdle()`, hashed with SHA-256, then
encrypted; the plaintext snapshot is removed in a `finally`. `createNow` also prunes inside a
try/catch, so a failed retention pass can never lose the archive that was just written.

## The key

The passphrase comes from, in order: `--backup-passphrase`, `--backup-key-file`, or the
`SCHOOLPILOT_BACKUP_PASSPHRASE` environment variable. Prefer the environment variable or a key
file for an unattended hub: a command-line passphrase is visible in the process list.

A key file must hold at least 16 bytes after trimming and must live **outside** the backup
directory. `resolveBackupSecret` refuses a key file inside it (`key_invalid`) because copying the
backup set would then copy the key with the ciphertext. No key is written into an archive, the
state file or the database.

Without a key the backup endpoints still exist but every write answers `503 key_missing`; reads
such as the status and the checksum still work. Pass `--no-backups` to remove the endpoints
entirely.

## Retention

Spec 06 §3.3: keep 7 daily, 4 weekly and 12 monthly archives. The rule is a union, not three
independent deletions:

- the newest `daily` archives are kept outright;
- the newest archive of each of the newest `weekly` ISO weeks is kept;
- the newest archive of each of the newest `monthly` calendar months is kept;
- the newest archive is always kept, even with every bucket at zero.

`selectExpiredBackups` in `retention.ts` is the whole policy and `backupSchedule.test.ts` covers
its period keys and the union. Pruning runs after every successful backup.

## The schedule

`BackupScheduler.runDue()` runs once from the hub's start path **before** it listens: a fresh hub
backs up immediately and a hub that was off at its scheduled time backs up as soon as it returns.
After that an unref'd interval (one minute by default) asks whether the next daily time (UTC,
`02:00` by default) has passed. A failed attempt is recorded and not retried for 15 minutes, so a
missing key does not produce a log line every minute.

## Restore and the drill

A restore always targets a fresh directory. The HTTP route writes under `<dataDir>/restores`, the
drill under `<dataDir>/drills`, and the CLI writes into the directory named by `--restore-to` (the
data directory by default). A directory that already holds a `schoolpilot.db` is refused with
`restore_target_exists` (409): proving a backup works must never destroy the database it protects.

Before reporting success, `restoreArchive`:

1. decrypts and checks the plaintext SHA-256 against the digest in the header;
2. writes `schoolpilot.db` through a temporary sibling and a rename;
3. opens it read-only and runs `PRAGMA integrity_check`;
4. recomputes the per-table logical digest and compares it with the header;
5. removes the file on any mismatch, and only then writes `restore.json`.

The **restore drill** is the monthly reminder spec 06 §3.3 asks for. `POST /api/backups/drill`
restores the newest archive into a scratch directory, verifies it, deletes the scratch copy and
sets `lastDrillAt`. The status reports `drill.due` when neither a drill nor a restore has happened
in 30 days (`never_performed` on a hub that has never done either).

## The portable export

`POST /api/backups/export` writes `<entity>.json`, `<entity>.csv` and `manifest.json` into a fresh
directory under `<dataDir>/exports`. `health_visit`, `conduct_incident` and `identifier` are
excluded by default (spec 06 §8.1 restricted entities) and columns the schema marks as encrypted
are written as `null`; `{ "includeRestricted": true }` opts into both. The manifest records counts,
per-file checksums and the logical digest.

## The HTTP API

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/backups` | GET | The archives on disk, newest first, plus the unreadable count. |
| `/api/backups` | POST | Take a backup now; body `{ "kind": "manual" \| "pre_restore" }`, default `manual`. |
| `/api/backups/status` | GET | Key, schedule, retention, counts, last events and the drill reminder. |
| `/api/backups/checksum` | GET | The live database's logical digest, in the shape a restore reports. |
| `/api/backups/:id` | GET | One archive's authenticated header, without decrypting it. |
| `/api/backups/:id/restore` | POST | Restore that archive into a new directory under `restores`. |
| `/api/backups/drill` | POST | Restore the newest archive into scratch space and clear the reminder. |
| `/api/backups/export` | POST | Write the portable export and return its manifest. |

`GET /health` carries a `backup` block (`enabled`, `available`, `lastBackupAt`, `drillDue`) from the
cached status, so the P4-D03 health page does not have to call the backup API to render a badge.

## Operator commands

```bash
# Back up daily at 02:00 UTC, passphrase from the environment
SCHOOLPILOT_BACKUP_PASSPHRASE='...' npx tsx src/server/cli.ts --data-dir ./data

# Use a key file outside the backup directory, and a different daily time
npx tsx src/server/cli.ts --data-dir ./data --backup-key-file /etc/schoolpilot/backup.key --daily-at 21:30

# Restore an archive into a fresh directory before the hub opens its database
npx tsx src/server/cli.ts --data-dir ./recovered \
  --backup-passphrase '...' --restore-from ./data/backups/backup-....spbk --restore-to ./recovered
```

## Prove it

- `server/__tests__/backup.test.ts` — archive bytes carry no plaintext, a wrong key is refused, a
  tampered tag is detected, restore matches the checksum, retention deletes what it should, the
  export redacts by default and includes on request, and the drill clears the reminder.
- `server/__tests__/backupSchedule.test.ts` — due times, the retry window and the scheduler.
- `server/__tests__/backupRoutes.test.ts` — the HTTP surface, including restore and the drill.
- `tests/e2e/gp8-backup-restore.spec.ts` — the GP-8 property end to end: seed a school, let the
  automatic backup run, wipe the database, restore into a new instance and compare the logical
  checksums.

```bash
npx vitest run server/__tests__/backup.test.ts server/__tests__/backupSchedule.test.ts server/__tests__/backupRoutes.test.ts
npx playwright test tests/e2e/gp8-backup-restore.spec.ts
```
