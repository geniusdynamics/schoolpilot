// ABOUTME: Generates PBKDF2 hash:salt:iterations triples for demo seed users.
// ABOUTME: Matches src/utils/passwordHash.ts (PBKDF2-SHA256, 100k iters, utf8-encoded hex salt).

const crypto = require('crypto');

const PASSWORD = 'admin123';
const ITERATIONS = 100000;

const usernames = [
  'admin_user', 'mscott', 'dschrute', 'pbeesly', 'omartinez',
  'pvance', 'ehannon', 'tflenderson', 'jhalpert_stu', 'cbeesly_par'
];

for (const username of usernames) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(Buffer.from(PASSWORD, 'utf8'), Buffer.from(salt, 'utf8'), ITERATIONS, 32, 'sha256')
    .toString('hex');
  console.log(`${username}|${hash}:${salt}:${ITERATIONS}`);
}
