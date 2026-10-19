// ABOUTME: Spike prototype for DR-04 useLookup: derived id-to-row maps, labels and archived handling.
// ABOUTME: Models loading/empty/error state and keeps archived rows resolvable but out of picker options.

export function isArchived(row) {
  return row?.archived === true || row?.status === 'archived' || row?.deleted_at != null;
}

function defaultLabel(row) {
  return String(row.name ?? row.title ?? row.code ?? row.id);
}

export function createLookup(rows, options = {}) {
  const {
    idField = 'id',
    label,
    isArchived: archived = isArchived,
    includeArchived = false,
  } = options;
  const byId = new Map();
  for (const row of rows ?? []) byId.set(row[idField], row);

  const resolve = (id) => byId.get(id);
  const labelFor = (id, fallback = '') => {
    const row = byId.get(id);
    if (!row) return fallback;
    const text = label ? label(row) : defaultLabel(row);
    return archived(row) ? `${text} (archived)` : text;
  };
  const pickerOptions = [...byId.values()]
    .filter((row) => includeArchived || !archived(row))
    .map((row) => ({ value: row[idField], label: labelFor(row[idField]) }));

  return { byId, resolve, label: labelFor, options: pickerOptions, isArchived: archived };
}

export function lookupState(cache, key) {
  const snapshot = cache.snapshot(key);
  const lookup = snapshot.data;
  return {
    data: lookup,
    status: snapshot.status,
    isFetching: snapshot.isFetching,
    error: snapshot.error,
    byId: lookup?.byId ?? new Map(),
    options: lookup?.options ?? [],
    label: lookup?.label ?? ((id, fallback = '') => fallback),
    resolve: lookup?.resolve ?? (() => undefined),
  };
}
