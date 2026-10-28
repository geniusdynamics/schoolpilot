# Learner Birthday Notices (example plug-in)

An example third-party plug-in. It is here to show what a plug-in written only against the
[plug-in SDK](../sdk/index.ts) looks like, and it is what
`src/plugins/sdk/__tests__/examplePlugin.test.ts` loads to prove the SDK works without core changes.

## What it does

- Contributes `birthday-notices` to the `dashboard-widget` slot, so the host renders
  `BirthdayNoticesWidget` on the home dashboard.
- Subscribes to the `learner.admitted` service hook and records each admitted learner who has a date of
  birth, so the widget knows about learners admitted since it started.
- Exposes `buildWidgetModel(settings, from)`: the widget's data — the learners with a birthday in the next
  `daysAhead` days, their age on the day, and the notice text from `noticeTemplate`.

It asks for two permissions: `data:read` (to read learner records) and `ui:inject` (to render in a slot).
It uses one slot, one hook, and no server route.

## Settings

| Key | Type | Default | Meaning |
| --- | --- | --- | --- |
| `daysAhead` | number | `7` | How many days ahead to look; kept between 1 and 60. |
| `includeWeekends` | boolean | `true` | Whether a birthday on a Saturday or Sunday is shown. |
| `noticeTemplate` | string | `{name} turns {age} on {date}` | Text for each learner; `{name}`, `{age}`, `{date}` and `{days}` are filled in. |

## Files

| File | What it is |
| --- | --- |
| `plugin.json` | The manifest: id, version, `sdkVersion`, permissions, slot, hook and settings. |
| `index.ts` | The plug-in module: parses its manifest with the SDK, registers the slot, subscribes to the hook, and builds the widget model. |
| `birthdays.ts` | The date arithmetic and notice text, kept free of the host so it can be tested on its own. |
| `__tests__/birthdays.test.ts` | Next occurrence, age, year rollover, 29 February, the weekend filter and unusable dates. |

## What it deliberately does not do

It does not import `src/modules/**`, `PluginManager` internals or `PluginHookSystem`: `index.ts` imports
`@/plugins/sdk` and its own `./birthdays` module, and the test above asserts that. Everything it needs —
the manifest schema, the slot registry, the hook contract, the lifecycle types — is SDK surface.

The one thing it does not implement is `BirthdayNoticesWidget` itself: the host resolves the component name
the slot contribution gives it, which is how slots work for any plug-in. A real plug-in would ship that
component alongside `index.ts`.

## Running its tests

```bash
pnpm vitest run src/plugins/examples/birthday-notices src/plugins/sdk/__tests__/examplePlugin.test.ts
```
