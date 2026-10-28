# Plug-in SDK compatibility

`SDK_VERSION` in `version.ts` is the SDK version this core implements. It is `1.0.0`.

A plug-in states the SDK versions it supports in its manifest:

```json
{ "sdkVersion": "^1.0.0" }
```

`isCompatible(manifest, coreSdkVersion)` answers whether this core may load that plug-in. Both values are
semantic versions and the manifest field is a semver range, so `^1.0.0`, `>=1.0.0 <2.0.0` and `1.4.0` all
work. A missing or unparseable range is incompatible: a plug-in that never promised support for a version
is not quietly trusted with it.

## What the version number promises

| Change | Version | An existing plug-in |
| --- | --- | --- |
| A new permission, hook, slot or optional manifest field | minor (`1.0.0` → `1.1.0`) | keeps working unchanged |
| A new optional SDK export | minor | keeps working unchanged |
| A fix that makes behaviour match this documentation | minor | keeps working unless it relied on the bug |
| Removing or renaming an export, permission, hook, slot or manifest field | major (`1.x` → `2.0.0`) | must be re-published |
| Changing the shape of a hook payload or a manifest field's type or meaning | major | must be re-published |
| Making a previously optional manifest field required | major | must be re-published |

A core that implements `1.0.0` accepts every plug-in whose range includes `1.0.0`. A core that implements
`1.4.0` accepts every plug-in whose range includes `1.4.0`; a plug-in built for `^1.0.0` therefore runs on
every 1.x core, and a plug-in that needs a `1.3.0` feature declares `^1.3.0` and is refused by a `1.2.0` core.

## What is stable

Everything exported from `src/plugins/sdk/index.ts`:

- `SDK_VERSION`, `SDK_COMPATIBLE_RANGE`
- the manifest schema (`manifestSchema`, `validateManifest`, `parseManifest`, `ManifestValidationError`,
  `SdkPluginManifest`) and the manifest types re-exported from `src/plugins/types.ts`
- the permission catalogue and `isCompatible`, `highestRisk`, `permissionsByRisk`
- the slot catalogue and registry (`SLOT_NAMES`, `registerSlot`, `getSlots`, `SlotRegistry`, …)
- the hook catalogue and bus (`SERVICE_HOOK_NAMES`, `ServiceHookBus`, typed payloads, …)
- the server-route contract (`PluginServerRoute`, `PluginServerRequest`, `PluginServerResponse`,
  `pluginRoutePath`, `isPluginRouteOwnedBy`)
- `PluginContext`, `PluginModule`, `PluginAPI` — the lifecycle surface the host calls

The manifest *ids* of the builtin plug-ins, the *names* of the hooks above, and the *ids* of the
permissions are part of this contract. Their display names, descriptions and UI ordering are not.

## What is experimental

- `PluginManifest.marketplace` and `PluginManifest.privileges` are carried through the schema because the
  existing builtin manifests use them; the marketplace is not open, so treat both as provisional.
- The `integration` block (backend-provider metadata) describes today's dormant ERP/SaaS connectors. It is
  accepted by the schema but only the connectors in `src/plugins/builtin/` are known to populate it.
- Server routes are types and path helpers only. The hub/cloud server does not mount plug-in routes yet, so
  no plug-in should depend on one being reachable.
- `realtime.document.update` and `realtime.update` are the two integration hooks whose publish sites are
  still being moved into the connector layer.

Experimental parts may change in a minor release. They are listed here rather than in the stable list so a
plug-in author can see what not to build a business on.

## What a breaking change means in practice

A major version means a plug-in published against `1.x` may not load on `2.0.0`. The compatibility check
(`isCompatible`) refuses it before the plug-in's module runs — once the host calls that check; it does not
yet, so an author must call it (see [`docs/extensions/plugins.md`](../../docs/extensions/plugins.md),
*Not wired into the host yet*). A plug-in author then publishes a release whose `sdkVersion` range includes
`2.0.0`, and the compatibility test for that plug-in (`validateManifest` + `isCompatible`) is what proves it.
