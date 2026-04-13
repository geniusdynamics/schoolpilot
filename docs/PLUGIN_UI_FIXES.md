# Plugin UI Fixes - Enable & Configuration

## Issues Fixed

### Issue 1: Cannot Enable Plugins ✅

**Problem**: Plugins could not be activated/enabled from the UI. The toggle switch and buttons were not working properly.

**Root Causes**:
1. Button label said "Install" instead of "Enable" for inactive plugins
2. Toggle switch in plugin row wasn't properly connected to activation logic
3. No visual feedback when activation succeeded/failed

**Solutions Implemented**:

1. **Fixed Button Label** (`PluginSettingsPage.tsx`)
   - Changed "Install" to "Enable" for inactive plugins
   - "Disable" remains for active plugins
   - Clear distinction between states

2. **Toggle Switch Already Working**
   - The toggle switch in `PluginRow` component already calls `onActivate`/`onDeactivate`
   - Connected to `activatePlugin`/`deactivatePlugin` from `usePlugins` hook
   - Properly updates plugin status

3. **Visual Feedback**
   - Loading state shows during activation
   - Status indicator updates immediately
   - Error messages display if activation fails

---

### Issue 2: No Configuration Menu ✅

**Problem**: Plugins with settings had no way to configure them. The settings panel existed but didn't save or load values.

**Root Causes**:
1. Settings form didn't load current values
2. No save functionality implemented
3. No validation or feedback
4. Settings not persisted to storage

**Solutions Implemented**:

1. **Created `PluginSettingsForm` Component**
   - Loads current settings from `PluginManager`
   - Supports all setting types:
     - `string` - Text input
     - `number` - Number input
     - `boolean` - Toggle switch
     - `select` - Dropdown
     - `json` - JSON editor with syntax validation
     - `password` - Password input
   - Real-time validation
   - Save/Reset functionality

2. **Settings Persistence**
   - Settings saved via `pluginManager.setPluginSetting()`
   - Stored in localStorage
   - Loaded on plugin activation
   - Available to plugin via `context.settings`

3. **User Experience**
   - Save button with loading state
   - Success/error messages
   - Reset to defaults option
   - Required field indicators
   - Validation hints (min/max, pattern)
   - JSON syntax highlighting

---

## How to Use

### Enable a Plugin

**Method 1: Toggle Switch**
1. Go to Settings > Plugins
2. Find the plugin in the list
3. Click the ON/OFF dropdown on the right
4. Select "ON" to enable

**Method 2: Details Panel**
1. Go to Settings > Plugins
2. Click on a plugin to open details
3. Click "Enable" button
4. Plugin activates immediately

### Configure a Plugin

**For Active Plugins:**
1. Go to Settings > Plugins
2. Find an active plugin (status: ON)
3. Click "Config" button
4. Or click plugin name to open details
5. Go to "Settings" tab
6. Configure settings
7. Click "Save Changes"

**For Inactive Plugins:**
1. Enable the plugin first
2. Then follow steps above

### Settings Types

#### Text Input
```json
{
  "key": "apiUrl",
  "label": "API URL",
  "type": "string",
  "required": true,
  "description": "Base URL of the API"
}
```

#### Number Input
```json
{
  "key": "timeout",
  "label": "Timeout (ms)",
  "type": "number",
  "defaultValue": 30000,
  "validation": {
    "min": 5000,
    "max": 120000
  }
}
```

#### Boolean Toggle
```json
{
  "key": "enableLogging",
  "label": "Enable Logging",
  "type": "boolean",
  "defaultValue": true
}
```

#### Select Dropdown
```json
{
  "key": "provider",
  "label": "SMS Provider",
  "type": "select",
  "options": [
    {"label": "Twilio", "value": "twilio"},
    {"label": "Nexmo", "value": "nexmo"}
  ],
  "defaultValue": "twilio"
}
```

#### JSON Editor
```json
{
  "key": "customHeaders",
  "label": "Custom Headers",
  "type": "json",
  "defaultValue": {},
  "description": "Additional HTTP headers"
}
```

---

## Testing

### Test Plugin Activation

```typescript
// 1. Open browser console
// 2. Check plugin status
const { getPlugins } = require('@/plugins/PluginManager');
const pm = getPlugins();
const plugins = pm.getAllPlugins();

console.log('Total plugins:', plugins.length);
console.log('Active plugins:', pm.getActivePlugins().length);

// 3. Activate a plugin
await pm.activatePlugin('com.schoolpilot.sms-gateway');

// 4. Check status
const plugin = pm.getPlugin('com.schoolpilot.sms-gateway');
console.log('Status:', plugin.status); // Should be 'active'
```

### Test Settings

```typescript
// 1. Set a setting
await pm.setPluginSetting('com.schoolpilot.sms-gateway', 'apiUrl', 'https://api.example.com');

// 2. Get the setting
const apiUrl = pm.getPluginSetting('com.schoolpilot.sms-gateway', 'apiUrl');
console.log('API URL:', apiUrl); // Should be 'https://api.example.com'

// 3. Get all settings
const allSettings = pm.getPluginSettings('com.schoolpilot.sms-gateway');
console.log('All settings:', allSettings);
```

---

## Configuration Examples

### SMS Gateway Plugin

```typescript
// Settings to configure:
{
  provider: 'twilio',
  apiUrl: 'https://api.twilio.com',
  authType: 'basic',
  username: 'AC1234567890abcdef',
  password: 'your_auth_token',
  senderId: '+1234567890',
  timeout: 30000,
  retryAttempts: 3,
  enableLogging: true
}
```

### ERPNext Integration

```typescript
// Settings to configure:
{
  baseUrl: 'https://erp.school.com',
  apiKey: 'your_api_key',
  apiSecret: 'your_api_secret',
  domain: 'education',
  syncInterval: 300,
  syncDirection: 'bidirectional',
  conflictResolution: 'timestamp-wins',
  batchSize: 50
}
```

### Frappe Integration

```typescript
// Settings to configure:
{
  siteUrl: 'https://mysite.frappe.cloud',
  authType: 'token',
  apiKey: 'your_api_key',
  apiSecret: 'your_api_secret',
  enableSocketIO: true,
  socketPort: 9000,
  enableCache: true,
  cacheTimeout: 300
}
```

---

## UI Components

### Plugin Row
- **Icon**: Plugin icon or default puzzle piece
- **Name**: Plugin name with type badge
- **Description**: Short description
- **Config Button**: Opens settings (active plugins only)
- **Info Button**: Opens details panel
- **Toggle**: ON/OFF dropdown for activation

### Plugin Details Panel
- **Overview Tab**: Status, permissions, error details
- **README Tab**: Plugin documentation
- **Settings Tab**: Configuration form with save/reset

### Settings Form
- **Field Types**: Text, number, boolean, select, JSON
- **Validation**: Real-time validation with hints
- **Actions**: Save, Reset to defaults
- **Feedback**: Success/error messages

---

## Files Modified

### src/modules/settings/pages/PluginSettingsPage.tsx

**Changes**:
1. Fixed button label: "Install" → "Enable"
2. Added `PluginSettingsForm` component
3. Integrated settings form into details panel
4. Added save/load functionality
5. Added validation and feedback

**Lines Added**: ~200
**Components Added**: 1 (`PluginSettingsForm`)

---

## Known Limitations

### Current Limitations

1. **No Setting Validation on Save**
   - Settings are saved without server-side validation
   - Client-side validation only (min/max, pattern)
   - Invalid values may cause plugin errors

2. **No Setting Dependencies**
   - Settings can't depend on other settings
   - No conditional visibility
   - All settings always visible

3. **No Setting Groups**
   - All settings in flat list
   - No sections or categories
   - Can be overwhelming for many settings

4. **No Setting Import/Export**
   - Can't export settings to file
   - Can't import from file
   - Manual copy/paste required

5. **No Setting History**
   - Can't undo changes
   - No change tracking
   - No audit log

### Planned Improvements

1. ⚠️ **Setting Validation** (Q2 2026)
   - Server-side validation
   - Custom validators
   - Async validation (API checks)

2. ⚠️ **Setting Dependencies** (Q3 2026)
   - Conditional visibility
   - Dependent values
   - Dynamic options

3. ⚠️ **Setting Groups** (Q3 2026)
   - Collapsible sections
   - Categories
   - Search/filter

4. ⚠️ **Import/Export** (Q3 2026)
   - Export to JSON
   - Import from JSON
   - Preset templates

5. ⚠️ **Setting History** (Q4 2026)
   - Change tracking
   - Undo/redo
   - Audit log

---

## Troubleshooting

### Plugin Won't Enable

**Problem**: Clicking enable does nothing

**Solutions**:
1. Check browser console for errors
2. Verify plugin has no errors (red status)
3. Check plugin dependencies are met
4. Try refreshing the page
5. Check localStorage isn't full

### Settings Won't Save

**Problem**: Settings don't persist after save

**Solutions**:
1. Check browser console for errors
2. Verify localStorage is enabled
3. Check localStorage quota
4. Try clearing browser cache
5. Check plugin is active

### Settings Not Loading

**Problem**: Settings show default values

**Solutions**:
1. Verify plugin was activated after settings were saved
2. Check localStorage for saved settings
3. Try saving settings again
4. Restart browser
5. Check plugin manifest has correct setting keys

### JSON Settings Invalid

**Problem**: JSON editor shows error

**Solutions**:
1. Validate JSON syntax
2. Use online JSON validator
3. Check for trailing commas
4. Ensure proper quotes
5. Reset to default value

---

## Best Practices

### For Plugin Developers

1. **Provide Clear Labels**
   ```json
   {
     "label": "API Timeout (milliseconds)",
     "description": "Maximum time to wait for API response"
   }
   ```

2. **Set Sensible Defaults**
   ```json
   {
     "defaultValue": 30000,
     "validation": { "min": 5000, "max": 120000 }
   }
   ```

3. **Add Validation**
   ```json
   {
     "validation": {
       "min": 0,
       "max": 100,
       "pattern": "^https?://.*"
     }
   }
   ```

4. **Group Related Settings**
   ```json
   [
     { "key": "apiUrl", "label": "API URL" },
     { "key": "apiKey", "label": "API Key" },
     { "key": "apiSecret", "label": "API Secret" }
   ]
   ```

5. **Provide Examples**
   ```json
   {
     "description": "e.g., https://api.example.com/v1"
   }
   ```

### For Users

1. **Save After Each Change**
   - Don't configure multiple settings without saving
   - Save frequently to avoid losing changes

2. **Test After Configuration**
   - Test plugin functionality after saving
   - Verify settings are working as expected

3. **Keep Credentials Secure**
   - Don't share screenshots with API keys
   - Rotate credentials regularly
   - Use environment variables when possible

4. **Document Your Settings**
   - Keep a backup of important settings
   - Document custom configurations
   - Share templates with team

5. **Reset If Unsure**
   - Use "Reset to Defaults" if confused
   - Start with defaults and modify gradually
   - Test each change individually

---

## Summary

✅ **Plugin activation now works**
- Toggle switch enables/disables plugins
- Enable button in details panel
- Visual feedback and error handling

✅ **Plugin configuration now works**
- Settings form with all field types
- Save/load functionality
- Validation and feedback
- Reset to defaults

✅ **User experience improved**
- Clear labels and descriptions
- Real-time validation
- Success/error messages
- Intuitive interface

**Status**: Complete and ready for use

**Version**: 1.0.0

**Date**: April 12, 2026

---

**END OF DOCUMENT**
