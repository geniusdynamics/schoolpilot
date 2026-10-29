# Plug-in SDK guide

A plug-in extends SchoolPilot without changing it: a manifest declares what it needs, and a module
does the work against a context the host hands it. Everything a plug-in may use is exported from
`src/plugins/sdk/index.ts`.

This page is the contributor-facing summary. The reference is
[docs/extensions/plugins.md](../extensions/plugins.md); the version promise is
[`src/plugins/sdk/COMPATIBILITY.md`](../../src/plugins/sdk/COMPATIBILITY.md); the worked example is
[`src/plugins/examples/birthday-notices/`](../../src/plugins/examples/birthday-notices/README.md).

## Read this first: the host does not load third-party plug-ins yet

This release ships the SDK and its tests, not the host wiring around them. Today the application:

- does **not** validate manifests at load time,
- does **not** call `isCompatible` when installing a plug-in,
- does **not** render anything from the slot registry,
- does **not** publish the service hooks (`learner.admitted`, `invoice.posted`,
  `report.published`), and
- does **not** enforce the sandbox through the plug-in context — `PluginManager.createPluginContext`
  builds a context without consulting `PluginSecuritySandbox`.

So a plug-in is **developed and tested but not installed** by the app. Call `validateManifest` and
`isCompatible` yourself before you ship, and treat the registry, the bus and the sandbox as the
contract the host will enforce once that wiring lands. The Settings **Plugins** tab lists and
activates the application's own built-in plug-ins; it has no "install from file" path for a
third-party one.

## The two versions

| Value | Today | Meaning |
| --- | --- | --- |
| `SDK_VERSION` | `1.0.0` | The SDK this core implements. Additive changes raise the minor; a breaking change raises the major. |
| `SDK_COMPATIBLE_RANGE` | `>=1.0.0 <2.0.0` | The ranges this core accepts. Declare the range you actually tested against. |

Both live in `src/plugins/sdk/version.ts`, so the manifest schema, the compatibility check and this
document cannot drift apart.

## The manifest

`plugin.json`, strict — an unknown field is refused, so a typo such as `permisions` fails loudly
instead of becoming a capability that silently does nothing.

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
  "hooks": ["report.published"]
}
```

| Field | Required | Notes |
| --- | --- | --- |
| `id` | yes | Lowercase reverse-domain (`com.yourcompany.plugin-name`); built-ins use `builtin-*`. |
| `name` | yes | Display name, at most 80 characters. |
| `version` | yes | Strict semver (`1.2.0`, not `1.2`). |
| `sdkVersion` | yes | A semver **range** you support, for example `^1.0.0`. |
| `type` | yes | `module`, `theme`, `integration`, `report`, `widget`, `whitelabel` or `engine`. |
| `entry` | yes | The module the host imports. |
| `permissions`, `slots`, `hooks` | no | Each entry must be in the SDK's own catalogue. |
| `routes`, `menuItems`, `widgets`, `settings` | no | UI contributions and settings. |

Validate before you ship:

```ts
import { validateManifest, parseManifest, isCompatible, SDK_VERSION } from '@/plugins/sdk';

const result = validateManifest(manifestJson);
if (!result.success) console.error(result.issues);   // [{ path, message }, …]

const manifest = parseManifest(manifestJson);         // throws ManifestValidationError
if (!isCompatible(manifest, SDK_VERSION)) throw new Error('not compatible with this core');
```

## The module

The host imports your module's default export: `{ manifest, module }`. `install`, `uninstall`,
`activate` and `deactivate` are optional and may be async.

```ts
import { parseManifest, registerSlot, type PluginContext, type PluginModule } from '@/plugins/sdk';
import manifestJson from './plugin.json';

export const manifest = parseManifest(manifestJson);

const module: PluginModule = {
  activate(context: PluginContext) {
    registerSlot(context.pluginId, {
      slot: 'dashboard-widget',
      id: 'attendance-digest',
      title: 'Attendance digest',
      component: 'AttendanceDigestWidget',
    });
    context.api.addHook('report.published', (event) => {
      // event is typed: reportId, institutionId, reportType, publishedAt, publishedBy?
    }, 10);
  },
  deactivate(context) {
    // unregister your slot contributions and drop your hooks here
  },
};

export default { manifest, module };
```

What `context` gives you: `pluginId`, the validated `manifest`, `settings`, `api.getData` /
`setData` (only the collections your `privileges` allow), `api.getSetting` / `setSetting`,
`api.showNotification`, `api.addHook` / `removeHook` / `doHook`, and the locale helpers
`translate`, `formatDate`, `formatNumber`.

## Permissions

A manifest asks; the school grants. Every permission is catalogued, grouped by risk:

| Permission | Risk | Allows |
| --- | --- | --- |
| `settings:access` | low | Read and write your own settings for this school. |
| `ui:inject` | low | Render in UI extension slots. |
| `menu:modify` | low | Add or hide navigation entries. |
| `data:read` | medium | Read the collections your `privileges.dataRead` names. |
| `network:access` | medium | Outbound HTTP to hosts the administrator allows. |
| `data:write` | high | Create and update rows in the collections you name. |
| `filesystem:access` | high | Read and write files inside your plug-in directory. |
| `code:execute` | high | Run dynamic code, such as a WebAssembly engine you ship. |

A permission outside the catalogue is refused at manifest validation; `highestRisk(permissions)` is
what an administrator is asked to confirm. Ask for nothing you do not use.

## Slots and hooks

Four UI slots: `learner-profile-tab`, `dashboard-widget`, `report-block`, `payment-method`. A
contribution names the slot, a lowercase id unique within your plug-in, a title, the component name
the host resolves, and an optional `order`. An unknown slot, a malformed id, a missing title or
component, or the same id twice is a `SlotRegistrationError` — it fails loudly rather than rendering
nothing.

Three service hooks with typed payloads: `learner.admitted`, `invoice.posted`, `report.published`.
Money in payloads is in minor units plus an ISO-4217 currency, the way the ledger stores it. The
catalogue also carries the UI, engine and integration hooks the built-in plug-ins use;
`KNOWN_HOOK_NAMES` is the complete list, and `ServiceHookBus` refuses a name outside it (the
manager's `addHook` does not, so an unknown hook passed that way is silently never fired).

Server routes: the contract in `serverRoutes.ts` (method, path under your own namespace, whether auth
is required, a handler) is published, and `pluginRoutePath(id, '/digest')` /
`isPluginRouteOwnedBy(id, path)` help build and check the namespace. The hub does not mount plug-in
routes yet.

## Testing a plug-in

1. `validateManifest(manifestJson).success` must be `true`.
2. `isCompatible(manifest, SDK_VERSION)` must be `true`.
3. Activate against a fake `PluginContext` (a plain object whose `api.addHook` records handlers), then
   call a recorded handler with a payload and assert what your plug-in did. That is exactly what
   `src/plugins/sdk/__tests__/examplePlugin.test.ts` does.
4. Keep pure logic out of the host: the example's `birthdays.ts` is tested without touching the SDK.

```bash
pnpm vitest run src/plugins/sdk path/to/your-plugin
pnpm vitest run src/plugins/examples/birthday-notices src/plugins/sdk/__tests__/examplePlugin.test.ts
```

## What a plug-in cannot do today

- **Be installed by the app.** There is no installer and no load-time validation. A self-hosted
  school can put a directory on disk; nothing loads it from the Plugins tab.
- **Appear on a page.** Slots register, and nothing renders them.
- **Receive a business event.** The service hooks are published by nothing yet.
- **Answer HTTP.** The route contract exists; the hub does not mount it.
- **Be trusted to stay in its sandbox.** The sandbox's checks exist; the context the manager builds
  does not consult them.

A plug-in written today is a well-tested library against a published contract. That is worth
building — the contract is the part that is hard to change later — as long as nobody tells a school
it can be installed.

---

Sources: `docs/extensions/plugins.md`, `src/plugins/sdk/index.ts`, `version.ts`, `manifest.ts`,
`permissions.ts`, `slots.ts`, `serverRoutes.ts`, `src/plugins/sdk/COMPATIBILITY.md`,
`src/plugins/examples/birthday-notices/README.md` and `src/modules/settings/pages/PluginSettingsPage.tsx`,
read on 2026-10-28. No plug-in was built, installed or run during this review.
