# Tabbed Workspace - Integration & Development Guide

## 🚀 How to Open a Tab
Use the `useTabs` hook in your React components to interact with the workspace.

```typescript
import { useTabs } from '../hooks/tabs';

const MyComponent = () => {
  const { openTab } = useTabs();

  const handleOpenStudent = (id: string) => {
    // This will either activate an existing tab or open a new one
    openTab(`/academics/students/${id}`, { title: 'Student Detail' });
  };

  return <button onClick={() => handleOpenStudent('123')}>Open Student</button>;
};
```

---

## 🎨 Adding New Icons
To map a new module or entity to an icon, update `src/services/tabs/TabStateDeriver.ts`.

### 1. Module Icon
Add your module key and the corresponding `Lucide` icon name to `iconMap`.
```typescript
const iconMap: Record<string, string> = {
  // ... existing modules
  'my-new-module': 'ShieldCheckIcon',
};
```

### 2. Entity-Specific Icon
Add the entity name to `entityIconMap` for more granular control.
```typescript
const entityIconMap: Record<string, string> = {
  // ... existing entities
  'my-special-entity': 'StarIcon',
};
```

---

## 🏷️ Customizing Tab Titles
The system automatically capitalizes hyphenated or underscored strings (e.g., `new-student` → `New Student`). 

If you need a specific display name for a module, add it to `MODULE_NAMES` in `TabStateDeriver.ts`.
```typescript
const MODULE_NAMES: Record<string, string> = {
  // ... existing modules
  'my-module': 'navigation:my_module.title', // Key used for translation
};
```

---

## ⚠️ Important Best Practices
1. **Always Use `openTab`**: Avoid direct `navigate()` calls when you want to open a new task. `openTab` ensures the tab system stays in sync with the URL.
2. **Pinned Tabs**: Pinned tabs cannot be closed. By default, only the Dashboard is pinned. You can pin a tab using `openTab(url, { pinned: true })`.
3. **Dirty State**: If a tab has unsaved changes, use `markDirty(tabId, true)` to show a visual indicator.
4. **URL Length**: Keep your entity IDs concise. If the combined URL of all open tabs exceeds 2000 characters, the `?tabs=` parameter will be hidden from the URL bar (though the tabs will still persist in `sessionStorage`).

---

## 📋 Tab Data Structure
```typescript
interface Tab {
  id: string;          // Deterministic ID (e.g., "admissions-applications")
  url: string;         // The full task URL
  title: string;       // Display name
  module: string;      // Module key (e.g., "admissions")
  entity?: string;     // Entity name (e.g., "applications")
  entityId?: string;   // Specific ID (optional)
  pinned: boolean;     // Cannot be closed
  isDirty: boolean;    // Has unsaved changes
  icon: string;        // Lucide icon name
  metadata: {
    createdAt: number;
    lastAccessed: number;
  };
}
```
