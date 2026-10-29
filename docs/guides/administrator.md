# Administrator's guide

Everything an administrator of one SchoolPilot installation needs: first-run setup, accounts and
roles, the Settings hubs, backups and restore, sync, health, the diagnostic bundle, and what to do
when the browser refuses to store data.

Written for the person who looks after the system — a school's IT generalist or the one member of
staff who is not afraid of a settings page. Deployment (installing the app or the hub) is in
[deployment/](deployment/); this guide starts from "the app is open in a browser".

## 1. Know which kind of installation you have

There are two shapes, and the difference matters for backups:

| Shape | Where the data is | Who can read it |
| --- | --- | --- |
| **Single device** (browser only) | A SQLite database in this browser's origin-private file system (OPFS) on this device | Anyone who can open this browser profile on this device |
| **Hub on the school LAN** | One SQLite file on the hub machine; devices reach it over HTTPS | Anyone with a staff account, seen through the hub's API and its permission checks |

If the address in the browser bar is a `localhost` or a file, it is the first shape. If it is
`https://<name>.local:8443` or another host on the network, it is the second. The header tells you
which school profile is loaded; **Settings → Data & System → System Health** tells you the rest.

## 2. First run

The very first time the app opens it asks one question with two answers:

1. **Welcome to SchoolPilot 3** — press **Get Started**.
2. **Choose Your Setup Path**:
   - **Explore with Demo Data** — loads a sample school. Choose it to learn the screens. Demo data
     can be cleared once, and after clearing, demo mode is permanently disabled for that
     installation (the app says so before it does it).
   - **Go Direct to Production** — an empty database plus the setup wizard. This is the one a real
     school chooses.
3. **Ready for Production?** → **Setting up…**. The app then opens its database and says
   *Preparing your database* while it does.
4. The wizard **Set up your school** runs in seven steps. Each step writes as you leave it, so a
   reload resumes rather than restarts:

| Step | What to have ready |
| --- | --- |
| **School Profile** | School name (required), motto, address, phone, email. |
| **Curriculum Packs** | At least one pack. The Kenyan CBE pack (`ke-cbe`) and the 8-4-4 pack (`ke-844`) are two entries; a school that runs both ticks both. A pack with more than one calendar asks which calendar variant. |
| **Academic Year** | The year's name, start and end dates, and the start and end of each term. A financial year is derived; a custom one can be typed. |
| **Classes & Streams** | One row per class ("Form 1") and its streams, comma-separated ("North, South"). |
| **Subjects** | Optional: un-tick what the school does not offer. The list comes from the chosen pack's legacy preset; a non-Kenyan pack leaves it empty. |
| **Sample data** | Optional: tick **Create sample data** to add demo learners, guardians, staff, a teaching group, marks, invoices and a register. Useful for training; it writes real rows. |
| **Administrator** | Username (3+ characters), display name, password (10+ characters) and confirmation. If an account already exists, the step says so and asks you to sign in with it instead. |

5. **Finish setup**. The wizard installs the chosen packs as programmes, links the administrator to
   a staff record, and records `setup_completed_at` on the school profile. From that moment the
   wizard can be re-run from **Settings → School & People → School Profile → Re-run setup wizard**,
   and re-running it is idempotent: it reuses the programme by name rather than creating a second.

A wizard that cannot save the school structure or install a pack keeps itself open and shows the
reason. Setup is only complete when the profile says so — do not work around a failed step by
reloading into the app.

## 3. Accounts, roles and permissions

**Settings → School & People → Users & Roles** (`/settings/school?tab=users`). Two cards:

- **User Accounts Management** — **Add User** opens a form with Username, Email, Password, User
  Type (Staff, Student, Parent, Supplier), Role, and **Is Active User**. A new user needs a password
  of at least 8 characters with upper and lower case, a number and a special character. Editing a
  user leaves the password alone unless you type a new one.
- **Roles Management** — **Add Role** takes a name and a description. There is no permission editor
  in this screen: a role created here is a label and a link target for the accounts that hold it.

What actually decides a role's power is the role catalogue in the code
(`src/data/auth/README.md` documents it): `administrator`, `head_teacher`, `registrar`,
`class_teacher`, `teacher`, `accountant` (bursar + cashier merged), `accounts_clerk`, `bursar`,
`nurse`, `auditor`. Each holds a set of fine-grained permissions and a scope kind — `institution`,
`class_group` (the groups where the staff member is homeroom teacher), `teaching_group` (their
effective teaching assignments) or `finance`.

**Be honest with yourself about what is enforced today.** The authorisation layer — permission
check, scope check, field policy for a learner's medical data — is implemented and tested, and the
hub applies it to its entity, service, approval and backup APIs. The browser app's canonical
repository is built without the authoriser, so a page in the app does not consult the permission
matrix for its writes, and the hub's `/api/sync`, `/api/sequences` and `/api/health` routes are open
to any signed-in session. Both gaps are written down in `src/data/auth/README.md` and
`server/README.md`. Treat role separation in the browser as a screen-level convenience until that
seam is closed, and keep the hub on a trusted network.

## 4. The Settings overview and its three hubs

**Settings** (`/settings`) is the overview: accounts that can sign in, modules running, whether the
school profile is set, whether the browser keeps the data, and what needs attention, with links into
the hubs. The hubs and their tabs:

| Hub | Address | Tabs |
| --- | --- | --- |
| **School & People** | `/settings/school` | **School Profile** (details, save, run/re-run the wizard) · **Users & Roles** · **Workflows** (approval states) · **Audit Log** |
| **Modules & Features** | `/settings/modules` | **Modules** (counts of modules, running, with problems; dependency problems; the module list) · **Features** · **Plugins** |
| **Data & System** | `/settings/system` | **Data Layer** · **Sync** · **Backup & Restore** · **Data Integrity** · **System Health** |

Old settings addresses (`/settings/general`, `/settings/features`, `/settings/plugins`,
`/settings/data-integrity`, `/settings/backup`, …) redirect to the tab that now holds them; a
bookmark that answers with a different tab is that redirect, not a bug.

### Modules, features, plugins

- **Modules** shows what is registered and what is running, and lists dependency problems when a
  module's declared dependency is missing. A module with a problem should be fixed in configuration,
  not worked around.
- **Features** has exactly four switches, each of which changes something visible: **Network status
  in the header**, **Module health in the header**, **Connection and sync notices**, and
  **Performance monitor**. Anything else in the configuration file has no switch because nothing
  reads it.
- **Plugins** lists the installed plug-ins with **Activate**, **Deactivate** and **Uninstall**, and
  their settings. Only the application's own built-in plug-ins are installable in this build: the
  SDK exists, but the host does not load third-party plug-ins (see the
  [plugin SDK guide](plugin-sdk.md)).

## 5. Backups and restore

There are two different backups in this product. Do not confuse them.

### 5.1 The in-app snapshot (Settings → Backup & Restore)

**Data & System → Backup & Restore** (`/settings/system?tab=backup`) has three cards: **Create
Backup** (**Backup Now**), **Restore Backup** (**Restore**), and **Schedule** (which states a daily
02:00 run) — plus **Backup History**, a grid of the snapshots with type, status and size.

What it really does: **Backup Now** serialises the database's collections to JSON and inserts that
JSON as a row in the `backup_records` collection, inside the same database. That is a version
history you can restore from after a mistaken edit, and it is *not* protection against losing the
device: the snapshot lives in the same file that would be lost. The **Download** button on a row
only shows a "Downloading…" notice; it does not write a file.

**Restore** replaces all current data with the chosen snapshot. The dialog warns that it cannot be
undone and advises a fresh backup first — take that advice literally.

### 5.2 The hub's encrypted archive (deployment with a hub)

A hub takes a real backup: a consistent SQLite snapshot (`VACUUM INTO`, not a file copy), hashed,
then encrypted with AES-256-GCM into a single `.spbk` archive under `<data dir>/backups`. Retention
is a union of 7 daily, 4 weekly and 12 monthly archives, and the newest archive is always kept.
Restores always target a fresh directory — a directory that already holds a `schoolpilot.db` is
refused — so a restore drill can never destroy the database it is protecting. The passphrase comes
from `--backup-passphrase`, `--backup-key-file` or `SCHOOLPILOT_BACKUP_PASSPHRASE`; prefer the
environment variable or a key file on an unattended hub, since a command-line passphrase is visible
in the process list. No key is stored in the archive.

What to do with this, in order:

1. Copy the backup set off the hub machine. A backup on the same disk as the database survives a
   mistake, not a theft or a fire.
2. Prove a restore monthly. The layer keeps a drill reminder and the health page shows
   **Restore drill** as due or clear.
3. Keep the passphrase somewhere that is not the backup media, and test that the person on call can
   find it.

The full format and routes are in `server/backup/README.md`; the restore command is in
[deployment/lan-hub-windows.md](deployment/lan-hub-windows.md) and its Ubuntu twin.

### 5.3 What no backup covers

- **Passwords** are hashed (PBKDF2-SHA256), so a restore restores hashes, not passwords; nobody can
  read them out of a backup.
- **Restricted fields** (a learner's medical notes and special needs, a health visit's complaint and
  treatment, a conduct incident's description and action) are encrypted at rest in a hub with a key
  from `<dataDir>/keys/restricted-data.key` or `SCHOOLPILOT_RESTRICTED_KEY`. **Back up that key with
  the database**: an archive whose key is lost is unreadable, and a hub that finds sealed values
  with no key refuses to start rather than pretend to be healthy.

## 6. Sync

**Data & System → Sync** (`/settings/system?tab=sync`) holds the sync settings (**Auto sync**,
**Background sync**, **Sync interval**, **Batch size**, **Max retries**, **Retry delay**, **Conflict
resolution**) and the **Sync history**, plus the conflict panels.

The honest position in this build: the hub serves the sync API (`/api/sync/push`,
`/api/sync/changes`, `/api/sync/conflicts`) and the client sync engine exists and is tested
(`src/data/sync/README.md`), but the app's screens do not yet push and pull through it, and there is
no pairing step that gives a device its own credential. The settings here are the configuration that
engine will read; changing them today changes a stored preference, not what the app does. Do not
promise a school multi-device convergence yet.

## 7. Health and the diagnostic bundle

**Data & System → System Health** (`/settings/system?tab=health`).

1. **Hub connection** — type the hub's address (`https://hub.school.lan:3000`) and a session token,
   press **Connect**. The address and token are kept on the page only and forgotten when you leave
   it; **Disconnect** clears them. A single device without a hub leaves this blank — the storage and
   backup signals still read locally.
2. **Refresh** re-reads everything.
3. The signal cards: **Storage** (this device's mode, whether persistent storage was granted, quota
   used; the hub's database file and size), **Last backup** (last archive, restore-drill state, count
   and total size, last failure), **Sync lag** (hub change log head, this device's cursor, changes
   behind, per-device table), **Pending outbox** (waiting, oldest waiting since, refused), and
   **Integrations**.
4. **Diagnostic bundle** downloads a JSON file of the same signals for a support ticket. It is
   assembled by the hub and contains status, not school records — but read it before you email it
   outside the school.

## 8. When the browser refuses persistent storage

The app refuses to run on a throwaway database unless it is explicitly told to. When SQLite cannot
open persistent storage you get a full-screen dialog:

> **This browser cannot store data offline**
> Use Chrome or Edge 109 or newer, or connect to the school server.
> If SchoolPilot is already open in another tab, close that tab and try again.
> Nothing can be saved until persistent storage is available.
> *Technical details* (the underlying error) · **Try again**

Work through it in this order:

1. **Close other tabs of the app.** OPFS is exclusive: a second tab holding the database is the
   most common cause.
2. **Use Chrome or Edge 109+.** Firefox and Safari do not provide the storage this build needs.
3. **Check the browser is not in a private/incognito window**, and that site data is not blocked for
   the address (an enterprise policy or an extension can block it).
4. **Check free disk space** — the browser will not grant a quota it cannot meet.
5. **Try again**. If it still fails, open the *Technical details* and keep the message for support.
6. If the device is meant to work against a hub, stop fighting the browser and use the hub's address
   instead: `https://<name>.local:8443`.

Separately, a red **TEMPORARY DATA** badge in the header means the app was started with
`VITE_DB_ALLOW_MEMORY` and is running an in-memory database: everything typed will be gone on
reload. That switch exists for development; it should never be used for real school data.

## 9. Destructive actions, and how to survive them

| Action | Where | What it does |
| --- | --- | --- |
| **Clear All Data** | Settings → Data & System → **Data Layer** | Empties every collection. In production it asks you to type `DELETE` first. There is no undo; only a backup helps. |
| **Seed Demo Data** | same tab | Fills the database with sample rows. In a live school this contaminates real data — do not. |
| **Apply Configuration** | same tab | Switches the data layer (mode, provider, backend) and reloads the app. Take a backup first: a wrong provider is how data appears to vanish. |
| **Restore Selected Backup** | Backup & Restore | Replaces all data with the snapshot. |
| **Delete** on a user or a role | Users & Roles | Removes the account (or unassigns the role from everyone). |

Before any of the first three: **Backup Now**, and copy the hub's backup set if there is a hub.

## 10. A month's routine

1. **Backup & Restore** — a snapshot taken, and the history has no unexpected failures.
2. **System Health** — persistent storage granted, last backup recent, drill not overdue, no
   integration failing.
3. **Users & Roles** — leavers deactivated (**Is Active User** off) rather than deleted, so their
   audit trail keeps a name.
4. **Audit Log** — a skim for changes nobody admits to.
5. **Modules & Features** — no dependency problems.
6. **Hub deployments only**: the backup set copied off the machine, and that the certificate has
   more than 30 days left (`<root>/data/tls/hub-fingerprint.txt` changes when it renews).

---

Menu labels and addresses were checked against `src/modules/settings/hubTabs.ts`, the Settings pages
and components, the first-run wizard and login pages, `src/data/auth/README.md`,
`server/README.md`, `server/backup/README.md` and the English locale files on 2026-10-28. The
backup, sync, health and storage behaviour described was read from those sources and their tests;
this review did not create a backup or a restore on a running installation.
