// ABOUTME: The child process of the interruption test: it opens the database, starts a
// ABOUTME: migration, writes part of it and dies before the transaction is committed.

/* eslint-disable @typescript-eslint/no-require-imports -- a plain node script, run by node itself */

const Database = require('better-sqlite3');

const filename = process.argv[2];
const version = Number(process.argv[3]);
const name = process.argv[4];
const checksum = process.argv[5];
const table = process.argv[6];

const database = new Database(filename);

// The framework records the attempt before the migration body starts, in its own
// transaction, so an interrupted run leaves a trace behind.
database
  .prepare(
    `INSERT OR REPLACE INTO _migration_attempts (version, name, checksum, status, error, attempted_at)
     VALUES (?, ?, ?, 'running', NULL, ?)`
  )
  .run(version, name, checksum, new Date().toISOString());

// The migration body: it runs in one transaction, which never commits because the process
// dies half-way through it.
database.exec('BEGIN IMMEDIATE');
database.exec(`CREATE TABLE ${table} (id TEXT PRIMARY KEY, label TEXT NOT NULL)`);
database.prepare(`INSERT INTO ${table} (id, label) VALUES (?, ?)`).run(`${table}-1`, 'partial');

// The process dies here: the transaction is still open, so SQLite rolls it back the next
// time the database is opened.
process.exit(17);
