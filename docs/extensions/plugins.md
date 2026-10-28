# Writing a plug-in

A plug-in extends SchoolPilot without changing it: it declares what it needs in a manifest, and the host is
meant to load it, check it and hand it a context. Everything a plug-in may use is exported from
`src/plugins/sdk/index.ts`; the promise about versions is in
[`src/plugins/sdk/COMPATIBILITY.md`](../../src/plugins/sdk/COMPATIBILITY.md).

## Not wired into the host yet

This release ships the SDK and its tests, not the host wiring around them. Today the application:

- does **not** validate manifests at load time,
- does **not** call `isCompatible` when installing a plug-in,
- does **not** render anything from the slot registry,
- does **not** publish the service hooks (`learner.admitted`, `invoice.posted`, `report.published`), and
- does **not** enforce the sandbox through the plug-in context: `PluginManager.createPluginContext` builds a
  context without consulting `PluginSecuritySandbox`.

So an author cannot rely on the host to catch any of it. **Call `validateManifest` and `isCompatible`
yourself** before you ship, and treat the registry, the bus and the sandbox as the contract the host will
enforce once that wiring lands. Nothing below is weaker than that wiring will be; some of it simply is not
connected yet.

A worked example lives in [`src/plugins/examples/birthday-notices/`](../../src/plugins/examples/birthday-notices/):
a dashboard widget of upcoming learner birthdays that imports nothing but the SDK.

## 1. The manifest

`plugin.json` describes the plug-in. The schema is strict: a field the SDK does not know is refused by
`validateManifest`, so a typo such as `permisions` fails loudly instead of becoming a capability that
silently does nothing. (The app does not run that check for you yet — see above.)

```json
{
  "id": "com.example.attendance-digest",
  "name": "Attendance Digest",
  "version": "1.0.0",
  "sdkVersion": "^1.0.0",
  "type": "integration",
  "category": "community",
  "entry": "./index.ts",
  "description": "Emails a weekly attendance digest to the head teacher.",
  "author": "Example Extensions Ltd",
  "license": "MIT",
  "permissions": ["data:read", "network:access"],
  "slots": ["dashboard-widget", "report-block"],
  "hooks": ["report.published"],
  "routes": [
    { "path": "/plugins/attendance-digest", "component": "AttendanceDigestPage", "title": "Attendance Digest" }
  ],
  "settings": [
    { "key": "recipient", "label": "Head teacher email", "type": "string", "required": true }
  ]
}
```

| Field | Required | Notes |
| --- | --- | --- |
| `id` | yes | Lowercase. Use reverse-domain (`com.yourcompany.plugin-name`); builtin plug-ins use `builtin-*`. |
| `name` | yes | Display name, at most 80 characters. |
| `version` | yes | Strict semantic version (`1.2.0`, not `1.2`). |
| `sdkVersion` | yes | Semver **range** of SDK versions you support, e.g. `^1.0.0`. |
| `type` | yes | `module`, `theme`, `integration`, `report`, `widget`, `whitelabel` or `engine`. |
| `entry` | yes | Path to the module the host imports. |
| `permissions` | no | Defaults to `[]`. Every entry must be in the permission catalogue. |
| `slots` | no | Slots you contribute to. Every entry must be a slot the host renders. |
| `hooks` | no | Hooks you subscribe to. Every entry must be a hook the SDK publishes. |
| `routes`, `menuItems`, `widgets`, `settings` | no | UI contributions and settings; see `src/plugins/types.ts`. |
| `privileges`, `engine`, `integration`, `marketplace` | no | Provider and engine metadata; see below. |

Validate a manifest before you ship it:

```ts
import { validateManifest, parseManifest } from '@/plugins/sdk';

const result = validateManifest(json);
if (!result.success) console.error(result.issues);   // [{ path, message }, …]

const manifest = parseManifest(json);                 // throws ManifestValidationError
```

## 2. The module

The host imports your module's default export: `{ manifest, module }`.

```ts
import {
  parseManifest,
  registerSlot,
  pluginSlots,
  type PluginContext,
  type PluginModule,
  type SdkPluginManifest,
  type ServiceHookHandler,
} from '@/plugins/sdk';
import manifestJson from './plugin.json';

export const manifest: SdkPluginManifest = parseManifest(manifestJson);

const onReportPublished: ServiceHookHandler<'report.published'> = (event) => {
  // event is typed: reportId, institutionId, reportType, publishedAt, publishedBy?
};

const module: PluginModule = {
  activate(context) {
    registerSlot(context.pluginId, {
      slot: 'report-block',
      id: 'attendance-digest',
      title: 'Attendance summary',
      component: 'AttendanceDigestBlock',
    });
    context.api.addHook('report.published', onReportPublished, 10);
  },
  deactivate(context) {
    pluginSlots.unregisterPlugin(context.pluginId);
    context.api.removeHook('report.published', onReportPublished);
  },
};

export default { manifest, module };
```

`install`, `uninstall`, `activate` and `deactivate` are optional and may be async. `context` is a
`PluginContext`:

| Member | What it gives you |
| --- | --- |
| `context.pluginId` | Your manifest id. |
| `context.manifest` | Your manifest as validated. |
| `context.settings` | Your settings for this school. |
| `context.api.getData` / `setData` | Read and write school collections — only the ones your `privileges` allow. |
| `context.api.getSetting` / `setSetting` | One setting at a time; `setSetting` persists. |
| `context.api.showNotification` | A toast for the person using the app. |
| `context.api.addHook` / `removeHook` / `doHook` | The hook system, scoped to your plug-in id. |
| `context.api.translate`, `formatDate`, `formatNumber` | The host's locale helpers. |

## 3. Permissions

A manifest asks; the school grants. Every permission is catalogued in `PERMISSIONS`, grouped by risk:

| Permission | Risk | What it allows |
| --- | --- | --- |
| `settings:access` | low | Read and write your own settings for this school. |
| `ui:inject` | low | Render components in UI extension slots. |
| `menu:modify` | low | Add or hide navigation entries. |
| `data:read` | medium | Read the collections your `privileges.dataRead` names. |
| `network:access` | medium | Outbound HTTP to the hosts the administrator allows. |
| `data:write` | high | Create and update rows in the collections your `privileges.dataWrite` names. |
| `filesystem:access` | high | Read and write files inside your plug-in directory. |
| `code:execute` | high | Run dynamic code, such as a WebAssembly engine you ship. |

Rules that are enforced, not advisory:

- A permission outside the catalogue is refused at manifest validation.
- `highestRisk(permissions)` is what an administrator is asked to confirm; ask for nothing you do not use.
- `data:read` and `data:write` are further narrowed by `privileges.dataRead` / `privileges.dataWrite`
  (collection names, or `["*"]`). `PluginSecuritySandbox.canAccessCollection` decides each collection
  access against that list, and `PluginSecuritySandbox.hasPermission` against the granted set.
- Community plug-ins run with the sandbox on and a tighter hook timeout than builtins
  (`PluginSecuritySandbox.getSecurityTier`).

## 4. UI extension slots

The host provides four slots (spec 06 §10), which it will render once the wiring lands:

| Slot | Where it appears |
| --- | --- |
| `learner-profile-tab` | A tab on one learner's profile page. |
| `dashboard-widget` | A card on the home dashboard. |
| `report-block` | A section appended to a generated report. |
| `payment-method` | A payment method a school can offer at checkout. |

`registerSlot(pluginId, contribution)` validates and stores what you add; `getSlots(slot)` is what a host
renderer will read, ordered by `order` then id. A contribution is:

```ts
{
  slot: 'learner-profile-tab',
  id: 'guardian-contacts',      // lowercase, unique per plug-in within the slot
  title: 'Guardian contacts',   // shown as the tab label
  component: 'GuardianContactsTab', // the component name the host resolves
  description: 'Who to call.',  // optional
  order: 50,                    // optional, defaults to 100
}
```

An unknown slot, a malformed id, a missing title or component, or the same id twice from one plug-in is a
`SlotRegistrationError` — registration fails loudly instead of rendering nothing. Remove your contributions
with `pluginSlots.unregisterPlugin(pluginId)` when you deactivate.

## 5. Service hooks

The SDK publishes three service hooks with typed payloads (spec 06 §10). `ServiceHookBus` subscribes and
publishes on top of the core hook system, which owns the timeouts and the per-plug-in circuit breaker.

| Hook | Payload | Fires when |
| --- | --- | --- |
| `learner.admitted` | `{ learnerId, institutionId, admittedAt, programmeId?, learnerName?, dateOfBirth? }` | An admission is complete. |
| `invoice.posted` | `{ invoiceId, institutionId, learnerId, totalMinor, currency, postedAt }` | An invoice is posted and payable. |
| `report.published` | `{ reportId, institutionId, reportType, publishedAt, publishedBy? }` | A generated report is published. |

Money in payloads is in minor units plus an ISO-4217 currency, the way the ledger stores it.

The hook catalogue also includes the UI hooks (`ui.branding.*`, `ui.label.resolve`, `ui.menu.beforeRender`,
`ui.footer.render`), the engine hooks (`grading.*`, `fees.*`) and the integration hooks
(`backend.provider.register`, `sync.*`, `data.*`, `realtime.*`) that the builtin plug-ins use.
`KNOWN_HOOK_NAMES` is the complete list; a name outside it is refused by both the manifest schema and the
bus. That refusal is the SDK's, not the manager's: `PluginManager.addHook` accepts any string, so an unknown
hook passed through the manager is silently never fired — only `ServiceHookBus` refuses unknown names.

## 6. Server routes

A plug-in that needs to answer HTTP declares routes against the contract in `serverRoutes.ts`: method, path
under its own namespace, whether auth is required, and a handler `(request) => response`. This release
publishes the contract only — the hub/cloud server does not mount plug-in routes yet, so treat them as
design work rather than something callable. `pluginRoutePath(id, '/digest')` and
`isPluginRouteOwnedBy(id, path)` are the helpers for building and checking the namespace.

## 7. Testing a plug-in

1. Validate the manifest: `validateManifest(manifestJson).success` must be `true`.
2. Check compatibility: `isCompatible(manifest, SDK_VERSION)` must be `true`.
3. Activate it against a fake `PluginContext` (plain object with an `api` whose `addHook` records handlers),
   then call the recorded handler with a payload and assert what your plug-in did — that is exactly what
   `src/plugins/sdk/__tests__/examplePlugin.test.ts` does.
4. Keep pure logic out of the host: `birthdays.ts` in the example is tested without touching the SDK at all.

```bash
pnpm vitest run src/plugins/sdk path/to/your-plugin
```

## 8. Publishing

- Pick a version: your plug-in's semver, independent of the SDK's.
- Declare `sdkVersion` as the range you have actually tested against. If you use a feature added in SDK
  `1.3.0`, declare `^1.3.0` so older cores refuse you instead of half-loading you.
- List only the permissions, slots and hooks you use; the manifest is what the school reads before granting.
- Ship the manifest beside the module, and validate it yourself: until the host wiring lands, nothing checks
  it at load — see *Not wired into the host yet*.
- For the official registry, the manifest is versioned and signed by the maintainers (spec 06 §10); a
  self-hosted school installs the same directory as a local plug-in.

## 9. Builtin plug-ins

The application's own plug-ins live in [`src/plugins/builtin/`](../../src/plugins/builtin/): white-label
branding, the results engine and the billing service, plus dormant connectors behind feature flags. Their
README lists each one, what loads it, and how the two engines were renamed from "grading engine" and
"fee calculator". They follow this same manifest schema.
