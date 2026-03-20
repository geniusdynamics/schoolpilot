# Tabbed Workspace - System Overview

## Purpose & Architecture
The Tabbed Workspace is a URL-driven multi-tasking interface designed to provide a browser-like experience within the application. It allows users to manage multiple open entities (students, applications, settings, etc.) across different modules without losing context.

### Core Philosophy
- **URL-Driven**: The state of open tabs is primarily derived from the browser URL, making the workspace shareable and refresh-persistent.
- **Cross-Module**: Tabs can stay open even when switching between primary modules (Admissions, Finance, etc.).
- **Durable**: If the URL becomes too long for the browser to handle, the system automatically falls back to `sessionStorage` for data persistence.

---

## 🏗️ System Components

### 1. `URLTabSyncEngine.ts`
The "brain" of the system. It handles:
- Parsing the current URL to derive the list of open tabs.
- Updating the browser's history API (`pushState`/`replaceState`).
- Managing `sessionStorage` fallback for redundancy and URL length management (2000 character limit).

### 2. `TabStateDeriver.ts`
Responsible for interpreting raw URLs into meaningful tab metadata:
- **Title Derivation**: Automatically capitalizes entity names (e.g., `new-application` → `New Application`).
- **Icon Mapping**: Matches modules and entities to specific `Lucide` icons.
- **ID Generation**: Creates deterministic IDs based on the module, entity, and ID.

### 3. `TabValidationService.ts`
Ensures that only authorized tabs are opened:
- **Permission Checking**: Validates that the current user has the `userRole` and `userPermissions` required for a specific tab.
- **State Validation**: Prevents corrupted or malformed tab data from entering the system.

### 4. `useTabs.ts` (Hook)
The primary interface for components to interact with the system:
- `openTab(url, options)`: Opens a new tab or activates an existing one.
- `closeTab(id)`: Removes a tab and updates the active selection.
- `activateTab(id)`: Switches focus to a specific tab.
- `pinTab(id)` / `unpinTab(id)`: Manages pinned status.

---

## 🔄 State Flow
1. **URL Change**: User navigates or clicks a link.
2. **Sync Engine**: Detects the change, parses the URL, and updates the internal `ParsedTabState`.
3. **useTabs Hook**: Receives the new state via a subscription and triggers a React re-render.
4. **UI Update**: `TabBar` and `LayoutNew` reflect the latest list of tabs and active content.

---

## 🛠️ Key Technical Constraints
- **URL Limit**: Browser URLs are limited to ~2048 characters. The sync engine automatically switches to "Silent Mode" (omitting the `?tabs=` param) when the workspace grows too large.
- **Module Separation**: Primary sidebar clicks now use `openTab` instead of `startSession` to preserve the user's workspace when switching modules.
- **Icon Registry**: New modules or entities must be registered in `TabStateDeriver.ts` to show custom icons.
