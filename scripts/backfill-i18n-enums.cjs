// ABOUTME: One-off backfill of runtime-dynamic i18n enum keys (status/method/category) that are
// ABOUTME: built via template literals, so no raw dotted key renders for enum-driven labels.
const fs = require('fs');
const path = require('path');
const EN = path.join(__dirname, '..', 'src', 'i18n', 'locales', 'en');

// namespace -> { dottedKey: value }
const ENUM_KEYS = {
  assignments: {
    'assignment.status.Draft': 'Draft',
    'assignment.status.Published': 'Published',
    'assignment.status.Archived': 'Archived',
    'submission.status.Submitted': 'Submitted',
    'submission.status.Late': 'Late',
    'submission.status.Graded': 'Graded',
    'submission.status.Pending Review': 'Pending Review',
    'submission.status.Returned': 'Returned',
  },
  pickup: {
    'pickupCode.status.ACTIVE': 'Active',
    'pickupCode.status.EXPIRED': 'Expired',
    'pickupCode.status.USED': 'Used',
    'pickupCode.status.REVOKED': 'Revoked',
  },
  hr: {
    // Filter <option> literals are lowercase; item status uses the enum's Title-case values.
    'payrollPeriods.status.draft': 'Draft',
    'payrollPeriods.status.open': 'Open',
    'payrollPeriods.status.closed': 'Closed',
    'payrollPeriods.status.Open': 'Open',
    'payrollPeriods.status.Closed': 'Closed',
    'payrollPeriods.status.Processed': 'Processed',
  },
  portal: {
    'blog.companyNews': 'Company News',
    'blog.productNews': 'Product News',
    'blog.partnerNews': 'Partner News',
  },
};

function setDeep(obj, keyPath, value) {
  const parts = keyPath.split('.');
  let node = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (typeof node[p] !== 'object' || node[p] === null || Array.isArray(node[p])) {
      if (node[p] !== undefined && typeof node[p] !== 'object') return false;
      node[p] = {};
    }
    node = node[p];
  }
  const leaf = parts[parts.length - 1];
  if (node[leaf] === undefined) {
    node[leaf] = value;
    return true;
  }
  return false;
}

let total = 0;
for (const ns of Object.keys(ENUM_KEYS)) {
  const file = path.join(EN, `${ns}.json`);
  let data = {};
  if (fs.existsSync(file)) data = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
  let wrote = 0;
  for (const [k, v] of Object.entries(ENUM_KEYS[ns])) if (setDeep(data, k, v)) wrote++;
  if (wrote > 0) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
    total += wrote;
    console.log(`  [${ns}] +${wrote} enum keys`);
  }
}
console.log(`\n[backfill-i18n-enums] ${total} enum keys written.`);
