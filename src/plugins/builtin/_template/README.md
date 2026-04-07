# Creating a New Builtin Plugin

This template provides a starting point for creating builtin plugins for SchoolPilot3.

## Quick Start

1. **Copy this template:**
   ```bash
   cp -r src/plugins/builtin/_template src/plugins/builtin/my-plugin
   ```

2. **Update `plugin.json`:**
   - Change `id` to a unique identifier (e.g., `com.yourcompany.my-plugin`)
   - Update `name`, `description`, `author`
   - Define `hooks` your plugin uses
   - Define `provides` capabilities
   - Add `settings` schema

3. **Implement your plugin in `index.ts`:**
   - Add your logic to `install()`, `activate()`, `deactivate()`, `uninstall()`
   - Register hooks using `context.api.addHook()`
   - Expose API methods in the `api` object

4. **Add types in `types.ts`:**
   - Define your plugin's interfaces and types

5. **Register your plugin:**
   Add to `src/plugins/BuiltinLoader.ts`:
   ```typescript
   const BUILTIN_PLUGINS: PluginDirectory[] = [
     // ... existing plugins
     { name: 'my-plugin', path: './my-plugin' },
   ];
   ```

6. **Test your plugin:**
   Run the application and check the browser console for plugin loading messages.

## Plugin Structure

### `plugin.json`
The manifest file defines metadata, capabilities, and configuration:

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Unique identifier (reverse domain notation) |
| `name` | Yes | Display name |
| `version` | Yes | Semantic version (e.g., `1.0.0`) |
| `type` | Yes | Plugin type: `module`, `theme`, `integration`, `report`, `widget`, `whitelabel`, `engine` |
| `category` | Yes | `builtin`, `verified`, `community`, `private`, `engine` |
| `entry` | Yes | Entry point path (e.g., `./index.ts`) |
| `description` | No | Brief description |
| `author` | No | Author name |
| `license` | No | License (e.g., `MIT`) |
| `hooks` | No | Array of hook names this plugin uses |
| `provides` | No | Array of capabilities this plugin provides |
| `settings` | No | Array of setting definitions |
| `privileges` | No | Security privileges required |

### `index.ts`
The entry point exports the plugin implementation:

```typescript
export default {
  manifest: manifest as PluginManifest,
  module: {
    install,      // Called once on installation
    activate,     // Called when plugin is enabled
    deactivate,   // Called when plugin is disabled
    uninstall,    // Called on removal
    hooks,        // Hook handlers
    api,          // Public API
  },
};
```

### `types.ts`
Define your plugin's TypeScript interfaces for type safety.

## Lifecycle Hooks

### `install(context)`
Called once when the plugin is first installed. Use for:
- Initializing storage
- Creating default configurations
- Setting up database tables

### `activate(context)`
Called when the plugin is enabled. Use for:
- Registering hooks
- Adding menu items
- Registering routes
- Starting background processes

### `deactivate(context)`
Called when the plugin is disabled. Use for:
- Cleaning up hooks (automatic)
- Removing UI elements
- Stopping background processes

### `uninstall(context)`
Called when the plugin is removed. Use for:
- Cleaning up all stored data
- Removing settings
- Dropping database tables

## Plugin Context API

The `context.api` object provides methods to interact with the application:

### Data Access
```typescript
const data = await context.api.getData('students', { grade: '10' });
await context.api.setData('students', '123', { name: 'John' });
```

### UI Integration
```typescript
context.api.registerMenuItem({
  id: 'my-item',
  label: 'My Item',
  route: '/my-route',
  icon: 'MyIcon',
});

context.api.registerRoute({
  path: '/my-route',
  component: 'MyComponent',
  title: 'My Route',
});

context.api.showNotification('Hello!', 'success');
```

### Hooks
```typescript
// Register a hook
context.api.addHook('app.init', () => {
  console.log('App initialized');
}, 10);

// Execute hooks
const results = context.api.doHook('myHook', arg1, arg2);
```

### Settings
```typescript
const value = context.api.getSetting('myKey');
await context.api.setSetting('myKey', newValue);
```

### Utilities
```typescript
const text = context.api.translate('key');
const date = context.api.formatDate(new Date());
const num = context.api.formatNumber(1234567);
```

## Security & Permissions

Define required permissions in `plugin.json`:

```json
{
  "privileges": {
    "dataRead": ["students", "teachers"],
    "dataWrite": ["my_plugin_data"],
    "uiInject": false,
    "menuModify": true,
    "settingsAccess": true,
    "networkAccess": false,
    "fileSystemAccess": false,
    "executeCode": false
  }
}
```

## Testing Your Plugin

1. Check browser console for loading messages:
   ```
   [BuiltinLoader] ✓ Loaded My Plugin (com.company.my-plugin)
   ```

2. Verify hooks are registered:
   ```typescript
   const manager = getPlugins();
   console.log(manager.getHookSystem().getRegisteredHooks());
   ```

3. Test settings persistence:
   - Change a setting
   - Reload the page
   - Verify setting is restored

## Best Practices

1. **Use TypeScript** for type safety
2. **Handle errors gracefully** in all lifecycle methods
3. **Clean up resources** in `deactivate` and `uninstall`
4. **Use the logger** instead of `console.log` for production code
5. **Validate settings** before using them
6. **Document your plugin's API** for other developers

## Example: Simple Integration Plugin

```typescript
// index.ts
import type { PluginManifest, PluginModule, PluginContext } from '../../types';
import manifest from './plugin.json';

function activate(context: PluginContext) {
  // Register a menu item
  context.api.registerMenuItem({
    id: 'my-integration',
    label: 'My Integration',
    route: '/integrations/my-service',
    icon: 'IntegrationIcon',
  });

  // Add a hook
  context.api.addHook('student.created', (student) => {
    console.log('New student:', student.name);
  });
}

export default {
  manifest: manifest as PluginManifest,
  module: { activate } as PluginModule,
};
```

## Need Help?

- See existing plugins in `src/plugins/builtin/` for examples
- Check the Plugin Architecture Spec in `docs/architecture/PLUGIN_ARCHITECTURE_SPEC.md`
- Review the types in `src/plugins/types.ts`
