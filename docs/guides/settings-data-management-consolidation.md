# Settings Data Management Consolidation

## Current State Analysis

### Feature Settings
- Previously owned editable application mode controls.
- Previously embedded backend configuration controls.
- Previously embedded a full sync management panel.
- Still owns feature flags, offline capability toggles, performance tooling, and conflict visibility.

### Unified Settings
- Previously exposed a second sync-management surface.
- Still acts as the top-level settings hub for system, users, features, workflows, and reporting.

### Data Layer Settings
- Already owned provider, mode, backend, and provider-detail concepts, but the controls were split across tabs and mixed legacy/current mode models.
- Now becomes the single editable control surface for application mode, database type, backend configuration, and synchronization.

### Data Layer Architecture Findings
- Application mode is split across a legacy runtime mode manager and unified config.
- Demo-facing settings previously overlapped with the legacy `development` mode.
- Backend selection existed both as a feature-settings concern and as a backend architecture concern.
- Sync settings were duplicated between runtime state in `AppDataContext` and persisted config in `unifiedConfig`.

## Consolidated Architecture

### Single Source of Truth
- **Editable control surface:** `DataLayerSettingsPage`
- **Persisted app/database config:** `unifiedConfig`
- **Runtime sync state:** `AppDataContext`, mirrored back into `unifiedConfig`
- **Backend architecture state:** `backendArchitecture`, now persisted across reloads

### User-Facing Flow
1. Select **Application Mode**: Demo or Production
2. Select **Database Type** filtered by the chosen mode
3. Select **Backend Configuration** filtered by the chosen database
4. Review backend capabilities and apply the configuration
5. Open the **Sync Management** tab on the same page for queue and sync preferences

### Mode to Database to Backend Mapping

#### Demo
- SQLite File -> Local Only
- SQLite WASM -> Local Only

#### Production
- LiveStore -> Local Only
- PouchDB -> CouchDB Sync
- RxDB -> PostgreSQL API
- SQLite WASM -> Custom API
- SQLite WASM -> ERPNext

## Migration Strategy
- Remove editable mode and backend controls from `FeatureSettings`.
- Replace feature-settings sync editing with a handoff to `DataLayerSettingsPage`.
- Replace unified-settings sync editing with the same handoff.
- Centralize compatibility filtering in `dataLayerConfig` helper exports.
- Persist selected backend type in `backendArchitecture`.
- Expand `AppDataContext` sync settings so the sync panel and persisted config share one schema.

## Backward Compatibility Notes
- Legacy `development` runtime mode is presented under the consolidated Demo application mode.
- Existing stored sync settings are merged with the new fields during initialization.
- Existing backend configuration remains readable while the selected backend type is now persisted for future sessions.
- Existing database provider fields are preserved and extended with compatibility metadata.

## Implementation Timeline

### Phase 1: Audit and Modeling
- Inventory duplicated settings surfaces
- Map current mode/database/backend relationships
- Define consolidated compatibility helpers

### Phase 2: UI Consolidation
- Move editable controls into `DataLayerSettingsPage`
- Replace duplicate control surfaces with guided handoffs
- Add sync management as a dedicated data-management tab

### Phase 3: State Consolidation
- Persist backend selection
- Mirror runtime sync updates into unified config
- Preserve compatibility metadata in database options

### Phase 4: Quality Assurance
- Add unit coverage for compatibility helpers
- Add integration coverage for the consolidated settings page
- Add workflow-level end-to-end regression coverage
- Run targeted tests for feature settings, data management, and workflow behavior

## User Guidance
- Use **Feature Settings** for feature flags and offline capabilities.
- Use **Unified Settings** as the global settings hub.
- Use **Data Layer Settings** for all application mode, database, backend, and sync changes.
- Apply configuration changes after selecting a new mode/database/backend combination so both runtime and persisted config stay aligned.

### 2. Provider Transition & Lifecycle (Second Pass Enhancements)
- Fixed an issue in `dataModeManager.ts` where switching database providers and seeding demo data immediately after would throw `Cannot read properties of null (reading 'insert')` due to collections not being instantiated yet.
- Enhanced `seedDemoData` to automatically infer and generate collection schemas dynamically (using `collectionsDefinition` and `SchemaConverter.convertRxDBToSQLite`) if they don't already exist on the active provider.
- Ensured seamless switching between SQLite WASM, File, and PouchDB configurations without unexpected runtime crashes during initial data seeding.

### 3. Redundancy Elimination
