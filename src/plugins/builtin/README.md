# Builtin plug-ins

The plug-ins the application ships with. `src/plugins/BuiltinLoader.ts` is the list that is actually
loaded: the three active ones on every start, the dormant ones only when the feature flag
`plugin_<directory>` is enabled in the feature-flag store. Nothing here is deleted; a plug-in that is not
loaded is listed below with the flag that wakes it up.

Every manifest in this directory validates against the SDK's manifest schema
(`src/plugins/sdk/manifest.ts`, exercised by `src/plugins/sdk/__tests__/builtinManifests.test.ts`), and
every one declares the range of SDK versions it supports (`sdkVersion`).

## Active

| Directory | Manifest id | Display name | What it is |
| --- | --- | --- | --- |
| `whitelabel` | `builtin-whitelabel` | White-Label Branding | Branding and label overrides: app name, logo, colours, hidden modules, custom footer. Subscribes to the `ui.*` hooks. |
| `grading-engine` | `poc-grading-engine` | Results Engine | The results engine (spec 06 §10): turns assessment scores into grades, ranks and pass/fail outcomes. Prefers the shared Go/WASM grader, falls back to JavaScript. Ids, routes and hooks keep the `grading` prefix. |
| `fee-calculator` | `poc-fee-calculator` | Billing Service | The billing service (spec 06 §10): computes a learner's fees from fee items and discounts and generates the payment schedule. Ids, routes and hooks keep the `fees` prefix. |

The two engine manifests were renamed from "Grading Engine (POC)" and "Fee Calculator (POC)" to the names
spec 06 §10 gives them. Only the display name, the description and the menu/route titles changed; the
manifest ids, directory names, hook names and public APIs are unchanged, so saved settings, feature flags
and anything holding a plug-in id keep working.

## Dormant (enabled by a feature flag)

Each loads only when the feature flag `plugin_<directory>` is on.

| Directory | Manifest id | Flag | What it is |
| --- | --- | --- | --- |
| `analytics-mock` | `com.schoolpilot.analytics-mock` | `plugin_analytics-mock` | Mock analytics engine used while the real one is built. |
| `erpnext-integration` | `com.schoolpilot.erpnext-integration` | `plugin_erpnext-integration` | ERPNext connector. Spec 06 §10 wants this behind the accounting-connector interface; it is not there yet, so it stays dormant. |
| `frappe-integration` | `com.schoolpilot.frappe-integration` | `plugin_frappe-integration` | Frappe/ERPNext client and React hooks. |
| `generic-rest` | `com.schoolpilot.generic-rest` | `plugin_generic-rest` | Generic REST provider for schools pointing the app at their own backend. |
| `payment-mock` | `com.schoolpilot.payment-mock` | `plugin_payment-mock` | Mock payment provider for demos and tests. |
| `saas-backend` | `com.schoolpilot.saas-backend` | `plugin_saas-backend` | GraphQL/REST/WebSocket client for the hosted SaaS backend. |
| `sms-gateway` | `com.schoolpilot.sms-gateway` | `plugin_sms-gateway` | SMS provider integration. |
| `sms-mock` | `com.schoolpilot.sms-mock` | `plugin_sms-mock` | Mock SMS provider for demos and tests. |

## Not loaded

| Directory | What it is |
| --- | --- |
| `_template` | The starting point for a new builtin plug-in, with its README. `BuiltinLoader` never loads it. Its manifest is schema-validated along with the rest. |

`src/plugins/payments/mpesa/` sits outside this directory: it is an M-Pesa Daraja provider with its own
tests, and `BuiltinLoader` never loads it either.

## Third-party plug-ins

These are built by someone else and live outside this directory — see
[`docs/extensions/plugins.md`](../../../docs/extensions/plugins.md) and the worked example in
`src/plugins/examples/birthday-notices/`.
