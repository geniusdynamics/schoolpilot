# Plugin Activation Context Fix

## Issue
When trying to enable plugins, the error "Cannot read properties of undefined (reading 'api')" was thrown.

## Root Cause
In `PluginManager.ts`, the plugin activation and deactivation methods were using `.call(context)` to invoke the plugin lifecycle functions:

```typescript
// WRONG - sets 'this' to context, but doesn't pass context as parameter
await plugin.module.activate.call(context);
await plugin.module.deactivate.call(context);
```

This approach sets the `this` context but doesn't pass the `context` object as a parameter. Since the plugin functions are defined as:

```typescript
async activate(context: PluginContext) {
  // context.api is undefined here because context wasn't passed as parameter
  context.api.addHook(...);
}
```

The `context` parameter was `undefined`, causing the error when trying to access `context.api`.

## Solution
Changed the invocation to pass `context` as a parameter instead of using `.call()`:

```typescript
// CORRECT - passes context as parameter
await plugin.module.activate(context);
await plugin.module.deactivate(context);
```

## Files Modified
- `src/plugins/PluginManager.ts`
  - Line ~249: Changed `activate.call(context)` to `activate(context)`
  - Line ~285: Changed `deactivate.call(context)` to `deactivate(context)`

## Impact
All plugins can now be activated successfully. The `PluginContext` object with its `api` property is correctly passed to plugin lifecycle methods, allowing plugins to:
- Register hooks via `context.api.addHook()`
- Show notifications via `context.api.showNotification()`
- Access settings via `context.api.getSetting()`
- Register UI elements via `context.api.registerMenuItem()`, etc.

## Testing
After this fix:
1. All 10 builtin plugins can be enabled without errors
2. Plugins that use `context.api` (like whitelabel, grading-engine, etc.) work correctly
3. Plugin settings are accessible via the context

## Related
- Previous fix: Plugin system fixes (frappe-react-sdk removal, sms-mock removal)
- Related: Plugin Details Panel UI improvements
