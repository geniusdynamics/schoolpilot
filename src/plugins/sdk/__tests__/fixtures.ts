// ABOUTME: Manifest fixtures shared by the plug-in SDK tests: one valid third-party manifest and a
// ABOUTME: factory that derives refused variants from it.

/** A third-party-shaped manifest: id, version, SDK range, permissions, slots, hooks, routes, settings. */
const BASE_MANIFEST: Record<string, unknown> = {
  id: 'com.example.attendance-digest',
  name: 'Attendance Digest',
  version: '1.2.0',
  sdkVersion: '^1.0.0',
  type: 'integration',
  category: 'community',
  entry: './index.ts',
  description: 'Emails a weekly attendance digest to the head teacher.',
  author: 'Example Extensions Ltd',
  license: 'MIT',
  permissions: ['data:read', 'network:access'],
  slots: ['dashboard-widget', 'report-block'],
  hooks: ['report.published'],
  routes: [
    {
      path: '/plugins/attendance-digest',
      component: 'AttendanceDigestPage',
      title: 'Attendance Digest',
    },
  ],
  settings: [
    {
      key: 'recipient',
      label: 'Head teacher email',
      type: 'string',
      required: true,
      validation: { pattern: '^[^@]+@[^@]+$' },
    },
    {
      key: 'dayOfWeek',
      label: 'Send on',
      type: 'select',
      defaultValue: 'friday',
      options: [
        { label: 'Friday', value: 'friday' },
        { label: 'Monday', value: 'monday' },
      ],
    },
  ],
};

/** Returns a copy of the base manifest with `overrides` applied, for building refused variants. */
export function makeManifest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { ...BASE_MANIFEST, ...overrides };
}

/** Returns a mutable copy of the base manifest so a test can delete a required field. */
export function manifestWithout(key: string): Record<string, unknown> {
  const manifest = { ...BASE_MANIFEST };
  delete manifest[key];
  return manifest;
}
