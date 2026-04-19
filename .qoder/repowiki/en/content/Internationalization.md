# Internationalization

<cite>
**Referenced Files in This Document**
- [index.ts](file://src/i18n/index.ts)
- [i18n.ts](file://src/i18n/i18n.ts)
- [I18nProvider.tsx](file://src/i18n/I18nProvider.tsx)
- [loader.ts](file://src/i18n/loader.ts)
- [modularLoader.ts](file://src/i18n/modularLoader.ts)
- [types.ts](file://src/i18n/types.ts)
- [useTranslation.ts](file://src/i18n/useTranslation.ts)
- [I18nManager.ts](file://src/i18n/I18nManager.ts)
- [LanguageSwitcher.tsx](file://src/components/ui/LanguageSwitcher.tsx)
- [common.json](file://src/locales/en/common.json)
- [navigation.json](file://src/i18n/locales/en/navigation.json)
- [administration.json](file://src/i18n/locales/en/administration.json)
- [sw.json](file://src/modules/dashboard/i18n/sw.json)
- [sw.json](file://src/modules/administration/i18n/sw.json)
- [navigation.json](file://src/i18n/locales/fr/navigation.json)
- [navigation.json](file://src/i18n/locales/rw/navigation.json)
- [navigation.json](file://src/i18n/locales/sw/navigation.json)
</cite>

## Update Summary
**Changes Made**
- Updated language support to include Kinyarwanda (rw) and Swahili (sw) locales with comprehensive translation coverage
- Enhanced navigation keys across all four supported languages (English, French, Kinyarwanda, Swahili) with standardized key structures
- Added missing navigation keys for administration.newsletters, analytics sections, and houses across all languages
- Fixed JSON parsing errors in administration module's English translation file
- Standardized translation key structures across all supported languages
- Updated modular loader to support four languages with unified navigation namespace

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Multi-Language Support Enhancement](#multi-language-support-enhancement)
7. [Translation Key Standardization](#translation-key-standardization)
8. [Dependency Analysis](#dependency-analysis)
9. [Performance Considerations](#performance-considerations)
10. [Troubleshooting Guide](#troubleshooting-guide)
11. [Conclusion](#conclusion)
12. [Appendices](#appendices)

## Introduction
This document explains SchoolPilot3's internationalization (i18n) system. It covers how i18next integrates with react-i18next, how namespaces are organized per module, and how translations are dynamically loaded based on the detected or selected language. The system now supports four languages: English (en), French (fr), Kinyarwanda (rw), and Swahili (sw). It documents the translation key structure, the fallback system to English for missing translations, language switching, and the modular translation loader that aggregates translations from both static and module-specific sources. Practical guidance is included for adding new translations, managing keys, implementing language-specific formatting, and maintaining translations across the modular architecture.

## Project Structure
The i18n system is centered under src/i18n and integrates with the component system via a React provider and hook. Translations are loaded from three sources:
- Static translation bundles under src/i18n/locales for shared namespaces.
- Module-specific translation files under src/modules/*/i18n and src/modules/core/*/i18n.
- Core module translations under src/modules/core/*/i18n for shared functionality.

```mermaid
graph TB
subgraph "i18n Core"
IDX["index.ts"]
I18N["i18n.ts"]
IP["I18nProvider.tsx"]
UM["I18nManager.ts"]
UT["useTranslation.ts"]
TL["loader.ts"]
ML["modularLoader.ts"]
TP["types.ts"]
end
subgraph "Components"
LS["LanguageSwitcher.tsx"]
end
subgraph "Supported Languages"
EN["English (en)"]
FR["French (fr)"]
RW["Kinyarwanda (rw)"]
SW["Swahili (sw)"]
end
IDX --> I18N
IDX --> IP
IDX --> UM
IDX --> UT
IDX --> TL
IDX --> ML
IDX --> TP
IP --> UM
UT --> IP
I18N --> ML
I18N --> TL
LS --> UT
EN --> I18N
FR --> I18N
RW --> I18N
SW --> I18N
```

**Diagram sources**
- [index.ts:1-56](file://src/i18n/index.ts#L1-L56)
- [i18n.ts:1-117](file://src/i18n/i18n.ts#L1-L117)
- [I18nProvider.tsx:1-77](file://src/i18n/I18nProvider.tsx#L1-L77)
- [I18nManager.ts:1-415](file://src/i18n/I18nManager.ts#L1-L415)
- [useTranslation.ts:1-114](file://src/i18n/useTranslation.ts#L1-L114)
- [loader.ts:1-69](file://src/i18n/loader.ts#L1-L69)
- [modularLoader.ts:1-92](file://src/i18n/modularLoader.ts#L1-L92)
- [types.ts:1-59](file://src/i18n/types.ts#L1-L59)
- [LanguageSwitcher.tsx:1-119](file://src/components/ui/LanguageSwitcher.tsx#L1-L119)

**Section sources**
- [index.ts:1-56](file://src/i18n/index.ts#L1-L56)
- [i18n.ts:1-117](file://src/i18n/i18n.ts#L1-L117)
- [I18nProvider.tsx:1-77](file://src/i18n/I18nProvider.tsx#L1-L77)
- [loader.ts:1-69](file://src/i18n/loader.ts#L1-L69)
- [modularLoader.ts:1-92](file://src/i18n/modularLoader.ts#L1-L92)
- [types.ts:1-59](file://src/i18n/types.ts#L1-L59)
- [useTranslation.ts:1-114](file://src/i18n/useTranslation.ts#L1-L114)
- [I18nManager.ts:1-415](file://src/i18n/I18nManager.ts#L1-L415)
- [LanguageSwitcher.tsx:1-119](file://src/components/ui/LanguageSwitcher.tsx#L1-L119)

## Core Components
- i18next bootstrap and configuration: Initializes i18next with react-i18next, language detection, and dynamic resource loading.
- Modular loader: Aggregates translation resources from static and module directories into a single i18next resource map.
- Provider and hook: Expose translation and formatting functions and manage locale lifecycle.
- Manager: Provides translation lookup, fallback, pluralization, and formatting helpers.
- Language switcher: UI component to change the active locale.

Key responsibilities:
- Namespace organization: Namespaces are derived from translation files and merged into a unified structure, with special handling for navigation.
- Multi-language support: Supports English, French, Kinyarwanda, and Swahili with standardized key structures.
- Fallback: Missing keys fall back to English; missing locales fall back to built-in English data.
- Dynamic loading: Resources are loaded at runtime via modular loader and/or static loader.

**Section sources**
- [i18n.ts:14-116](file://src/i18n/i18n.ts#L14-L116)
- [modularLoader.ts:12-92](file://src/i18n/modularLoader.ts#L12-L92)
- [loader.ts:36-69](file://src/i18n/loader.ts#L36-L69)
- [I18nProvider.tsx:37-77](file://src/i18n/I18nProvider.tsx#L37-L77)
- [useTranslation.ts:42-114](file://src/i18n/useTranslation.ts#L42-L114)
- [I18nManager.ts:17-415](file://src/i18n/I18nManager.ts#L17-L415)
- [LanguageSwitcher.tsx:30-49](file://src/components/ui/LanguageSwitcher.tsx#L30-L49)

## Architecture Overview
The i18n pipeline starts with initialization, proceeds through resource loading, and exposes translation/formatting APIs to components. The system now supports four languages with enhanced navigation keys and standardized structures.

```mermaid
sequenceDiagram
participant App as "App"
participant Provider as "I18nProvider"
participant Manager as "I18nManager"
participant I18n as "i18next"
participant Loader as "modularLoader"
participant Static as "loader"
App->>Provider : Mount with config
Provider->>Manager : initI18n(config)
Manager->>I18n : configure (namespaces, detection)
I18n->>Loader : loadModularTranslations()
Loader-->>I18n : resources {en,fr,rw,sw}
I18n->>Static : loadTranslations(i18n) (optional)
Static-->>I18n : static bundles
I18n-->>Manager : ready
Provider-->>App : isReady=true
```

**Diagram sources**
- [I18nProvider.tsx:37-77](file://src/i18n/I18nProvider.tsx#L37-L77)
- [I18nManager.ts:402-412](file://src/i18n/I18nManager.ts#L402-L412)
- [i18n.ts:14-116](file://src/i18n/i18n.ts#L14-L116)
- [modularLoader.ts:12-92](file://src/i18n/modularLoader.ts#L12-L92)
- [loader.ts:36-69](file://src/i18n/loader.ts#L36-L69)

## Detailed Component Analysis

### i18next Bootstrap and Configuration
- Creates an i18next instance and initializes it with react-i18next and language detection.
- Loads resources via modular loader and falls back to a minimal English/French baseline if modular loading fails.
- Configures default namespace, fallback language, and detection order.
- **Updated**: Now supports four languages with enhanced resource loading.

```mermaid
flowchart TD
Start(["initializeI18n"]) --> CheckReady{"Already ready?"}
CheckReady --> |Yes| Return["Return"]
CheckReady --> |No| CheckInProgress{"Init in progress?"}
CheckInProgress --> |Yes| Await["Await promise"]
CheckInProgress --> |No| BuildResources["loadModularTranslations()"]
BuildResources --> InitI18n["i18n.init(...)"]
InitI18n --> Success{"Success?"}
Success --> |Yes| Done["Set ready=true"]
Success --> |No| Fallback["Fallback init with en/fr/rw/sw"]
Fallback --> Done
```

**Diagram sources**
- [i18n.ts:14-116](file://src/i18n/i18n.ts#L14-L116)
- [modularLoader.ts:12-92](file://src/i18n/modularLoader.ts#L12-L92)

**Section sources**
- [i18n.ts:14-116](file://src/i18n/i18n.ts#L14-L116)

### Modular Translation Loader
- Scans module directories for JSON translation files and merges them into a single resource map.
- Supports static translation files under src/i18n/locales and module-specific files under src/modules/*/i18n and src/modules/core/*/i18n.
- Builds a unified navigation namespace by merging module navigation entries.
- **Updated**: Now supports four languages (en, fr, rw, sw) with enhanced error handling.

```mermaid
flowchart TD
Scan["Scan modules & core i18n JSON"] --> MergeStatic["Merge static locales/**.json"]
MergeStatic --> MergeModules["Merge modules/*/i18n/*.json"]
MergeModules --> MergeCore["Merge core/*/i18n/**/*.json"]
MergeCore --> BuildNav["Build unified 'navigation' namespace"]
BuildNav --> ValidateKeys["Validate translation keys"]
ValidateKeys --> ReturnRes["Return resources"]
```

**Diagram sources**
- [modularLoader.ts:6-10](file://src/i18n/modularLoader.ts#L6-L10)
- [modularLoader.ts:12-92](file://src/i18n/modularLoader.ts#L12-L92)

**Section sources**
- [modularLoader.ts:12-92](file://src/i18n/modularLoader.ts#L12-L92)

### Static Translation Loader
- Imports and registers static translation bundles for English, French, Kinyarwanda, and Swahili across predefined namespaces.
- Useful for legacy or centralized translation files.
- **Updated**: Enhanced to support all four languages with standardized key structures.

**Section sources**
- [loader.ts:36-69](file://src/i18n/loader.ts#L36-L69)

### Provider and Hook
- I18nProvider initializes the manager, persists the selected locale to localStorage, and exposes readiness.
- useTranslation provides t, locale, setLocale, and formatting helpers, with loading state during locale changes.

```mermaid
sequenceDiagram
participant C as "Component"
participant Hook as "useTranslation"
participant Prov as "I18nProvider"
participant Mgr as "I18nManager"
C->>Prov : Render with I18nProvider
Prov->>Mgr : initI18n(config)
C->>Hook : useTranslation()
Hook->>Mgr : t(key), formatDate(), formatNumber()
Hook->>Mgr : setLocale(locale)
Mgr-->>Hook : locale change event
Hook-->>C : updated locale + formatted values
```

**Diagram sources**
- [I18nProvider.tsx:37-77](file://src/i18n/I18nProvider.tsx#L37-L77)
- [useTranslation.ts:42-114](file://src/i18n/useTranslation.ts#L42-L114)
- [I18nManager.ts:55-72](file://src/i18n/I18nManager.ts#L55-L72)

**Section sources**
- [I18nProvider.tsx:37-77](file://src/i18n/I18nProvider.tsx#L37-L77)
- [useTranslation.ts:42-114](file://src/i18n/useTranslation.ts#L42-L114)

### Manager: Translation, Fallback, Pluralization, Formatting
- Translation lookup supports nested keys and optional fallback to the configured fallback locale.
- Pluralization uses locale-aware rules; English defaults to simple singular/plural.
- Formatting helpers include dates, times, and numbers with locale-aware patterns.
- Relative time formatting provides localized "ago" messages.

```mermaid
flowchart TD
Lookup["t(key, options)"] --> Find["Find translation in current locale"]
Find --> Found{"Found?"}
Found --> |Yes| Apply["Apply pluralization & interpolation"]
Found --> |No| Fallback["Try fallback locale"]
Fallback --> FFound{"Found?"}
FFound --> |Yes| Apply
FFound --> |No| ReturnKey["Return key as fallback"]
Apply --> Out["Return formatted string"]
```

**Diagram sources**
- [I18nManager.ts:109-150](file://src/i18n/I18nManager.ts#L109-L150)
- [I18nManager.ts:343-357](file://src/i18n/I18nManager.ts#L343-L357)

**Section sources**
- [I18nManager.ts:109-150](file://src/i18n/I18nManager.ts#L109-L150)
- [I18nManager.ts:167-225](file://src/i18n/I18nManager.ts#L167-L225)
- [I18nManager.ts:230-252](file://src/i18n/I18nManager.ts#L230-L252)

### Language Switcher Component
- Presents a dropdown of supported languages and updates the active locale via i18next.
- Persists the selection and handles errors gracefully.

```mermaid
sequenceDiagram
participant U as "User"
participant LS as "LanguageSwitcher"
participant I18n as "i18next"
U->>LS : Click language button
LS->>I18n : changeLanguage(code)
I18n-->>LS : Language changed
LS-->>U : UI re-renders with new locale
```

**Diagram sources**
- [LanguageSwitcher.tsx:30-49](file://src/components/ui/LanguageSwitcher.tsx#L30-L49)

**Section sources**
- [LanguageSwitcher.tsx:30-49](file://src/components/ui/LanguageSwitcher.tsx#L30-L49)

## Multi-Language Support Enhancement

### Supported Languages
The system now supports four languages with comprehensive translation coverage:

| Language | Code | Coverage | Status |
|----------|------|----------|--------|
| English | en | Complete | ✅ Active |
| French | fr | Complete | ✅ Active |
| Kinyarwanda | rw | Complete | ✅ Active |
| Swahili | sw | Complete | ✅ Active |

### Language Detection and Fallback
- Language detection prioritizes localStorage, navigator, then HTML tag
- Fallback to English for missing translations
- Automatic language switching with persistence

**Section sources**
- [i18n.ts:65-68](file://src/i18n/i18n.ts#L65-L68)
- [i18n.ts:38](file://src/i18n/i18n.ts#L38)

### Enhanced Navigation Keys
Recent updates have standardized navigation keys across all languages:

#### Administration Module Enhancements
- **Added**: `newsletters` navigation key for newsletter management
- **Enhanced**: Expanded administrative sections with consistent key naming
- **Fixed**: JSON parsing errors in English translation file

#### Analytics Module Improvements
- **Added**: `teacherDashboard`, `subjectAnalytics`, `classAnalytics`, `exportReports` keys
- **Standardized**: Consistent key naming across all supported languages

#### Houses Module Integration
- **Added**: `categories`, `award`, `leaderboard`, `studentPoints`, `classStandings` keys
- **Integrated**: Seamless navigation flow with other modules

**Section sources**
- [navigation.json:34](file://src/i18n/locales/en/navigation.json#L34)
- [navigation.json:215](file://src/i18n/locales/en/navigation.json#L215)
- [navigation.json:223](file://src/i18n/locales/en/navigation.json#L223)

## Translation Key Standardization

### Key Naming Conventions
- **Dot notation**: `module.namespace.key` structure
- **Descriptive keys**: Human-readable and context-specific
- **Consistent hierarchy**: Module → Section → Specific functionality

### Standardized Key Structure Examples

#### Common Keys
```json
{
  "desktop": "Desktop",
  "workspaces": "Workspaces", 
  "website": "Website",
  "reload": "Reload"
}
```

#### Navigation Keys
```json
{
  "administration": {
    "title": "Administration",
    "dashboard": "Administration Dashboard",
    "newsletters": "Newsletters"
  },
  "analytics": {
    "title": "Analytics",
    "teacherDashboard": "Teacher Dashboard",
    "exportReports": "Export Reports"
  }
}
```

#### Module-Specific Keys
```json
{
  "administration": {
    "title": "Administration",
    "staff": "Staff Management",
    "departments": "Departments"
  }
}
```

**Section sources**
- [common.json:1-41](file://src/locales/en/common.json#L1-L41)
- [navigation.json:1-231](file://src/i18n/locales/en/navigation.json#L1-L231)
- [administration.json:1-15](file://src/i18n/locales/en/administration.json#L1-L15)

### Language-Specific Implementations

#### Swahili Translation Examples
```json
{
  "welcomeBack": "Karibu tena, {{name}}!",
  "dashboardSubtitle": "Fuatilia masomo, mahudhurio, fedha, na mawasiliano kutoka dashibodi moja tayari kwa uamuzi.",
  "newMessages": "Ujumbe Mpya",
  "pendingTasks": "Kazi Zinazosubiri"
}
```

#### Administration Module Swahili
```json
{
  "title": "Udhibiti",
  "staff": "Usimamizi wa Wafanyakazi",
  "departments": "Idara",
  "newsletters": "Matangazo"
}
```

**Section sources**
- [sw.json:1-34](file://src/modules/dashboard/i18n/sw.json#L1-L34)
- [sw.json:384-419](file://src/modules/administration/i18n/sw.json#L384-L419)

## Dependency Analysis
- The provider depends on the manager for locale lifecycle and translation services.
- The hook depends on the provider context and manager for translation and formatting.
- The i18next bootstrap depends on the modular loader for dynamic resources and optionally on the static loader for baseline bundles.
- The language switcher depends on react-i18next's i18n instance.
- **Updated**: Enhanced dependency tracking for multi-language support.

```mermaid
graph LR
Provider["I18nProvider.tsx"] --> Manager["I18nManager.ts"]
Hook["useTranslation.ts"] --> Provider
Bootstrap["i18n.ts"] --> Modular["modularLoader.ts"]
Bootstrap --> Static["loader.ts"]
Switcher["LanguageSwitcher.tsx"] --> Hook
Languages["Four Languages"] --> Bootstrap
```

**Diagram sources**
- [I18nProvider.tsx:37-77](file://src/i18n/I18nProvider.tsx#L37-L77)
- [useTranslation.ts:42-114](file://src/i18n/useTranslation.ts#L42-L114)
- [i18n.ts:14-116](file://src/i18n/i18n.ts#L14-L116)
- [modularLoader.ts:12-92](file://src/i18n/modularLoader.ts#L12-L92)
- [loader.ts:36-69](file://src/i18n/loader.ts#L36-L69)
- [LanguageSwitcher.tsx:30-49](file://src/components/ui/LanguageSwitcher.tsx#L30-L49)

**Section sources**
- [index.ts:34-56](file://src/i18n/index.ts#L34-L56)
- [i18n.ts:14-116](file://src/i18n/i18n.ts#L14-L116)
- [modularLoader.ts:12-92](file://src/i18n/modularLoader.ts#L12-L92)
- [loader.ts:36-69](file://src/i18n/loader.ts#L36-L69)
- [I18nProvider.tsx:37-77](file://src/i18n/I18nProvider.tsx#L37-L77)
- [useTranslation.ts:42-114](file://src/i18n/useTranslation.ts#L42-L114)
- [I18nManager.ts:17-415](file://src/i18n/I18nManager.ts#L17-L415)
- [LanguageSwitcher.tsx:30-49](file://src/components/ui/LanguageSwitcher.tsx#L30-L49)

## Performance Considerations
- Lazy initialization: The system prevents redundant initialization and tracks an initialization promise to avoid concurrent setups.
- Suspense-friendly: react-i18next is configured with useSuspense to integrate with React Suspense boundaries.
- Minimal fallback: On failure, a minimal English/French baseline is used to keep the app functional.
- Efficient resource building: The modular loader consolidates resources once during initialization.
- **Updated**: Optimized resource loading for multiple languages with caching mechanisms.

## Troubleshooting Guide
Common issues and resolutions:
- Missing translation keys: The manager returns the key itself when a translation is not found; verify key paths and namespaces.
- Fallback not applied: Ensure the fallback locale is configured and present in the loaded resources.
- Language switching not persisting: Confirm localStorage persistence and that the provider is mounted before components requiring translations.
- Module translations not loading: Verify module i18n JSON paths and filenames; ensure namespaces match expectations.
- **Updated**: Multi-language specific issues:
  - JSON parsing errors: Check for syntax errors in translation files
  - Missing language keys: Ensure all languages have complete key coverage
  - Language detection failures: Verify browser language settings and localStorage

**Section sources**
- [I18nManager.ts:114-126](file://src/i18n/I18nManager.ts#L114-L126)
- [I18nProvider.tsx:56-62](file://src/i18n/I18nProvider.tsx#L56-L62)
- [LanguageSwitcher.tsx:30-49](file://src/components/ui/LanguageSwitcher.tsx#L30-L49)

## Conclusion
SchoolPilot3's i18n system combines a robust provider/hook architecture with dynamic, modular translation loading. The system now supports four languages with enhanced navigation keys and standardized structures. Namespaces are cleanly separated per module while a unified navigation namespace ensures consistent UI labels. The system provides strong fallbacks to English and offers locale-specific formatting. The LanguageSwitcher enables seamless language changes, and the modular loader simplifies adding translations across modules. Recent updates have focused on improving translation coverage and fixing JSON parsing errors across all supported languages.

## Appendices

### Translation Key Structure and Best Practices
- Keys are dot-separated paths (e.g., module.namespace.key).
- Prefer short, descriptive namespaces aligned with modules (e.g., academics, administration, finance).
- Keep keys stable; avoid renaming to prevent broken references.
- Use pluralization consistently with count-based options; define plural variants in translation files.
- **Updated**: Maintain consistency across all four supported languages.

**Section sources**
- [I18nManager.ts:109-150](file://src/i18n/I18nManager.ts#L109-L150)
- [I18nManager.ts:343-357](file://src/i18n/I18nManager.ts#L343-L357)

### Adding New Translations
- Static bundles: Add JSON files under src/i18n/locales/{lang}/{namespace}.json and ensure they are imported and registered.
- Module-specific: Place JSON files under src/modules/{module}/i18n/{lang}.json; the modular loader will automatically include them.
- Core module translations: Place JSON files under src/modules/core/{coreModule}/i18n/{lang}.json; they will be aggregated similarly.
- **Updated**: Ensure all four languages (en, fr, rw, sw) have complete key coverage.

**Section sources**
- [loader.ts:36-69](file://src/i18n/loader.ts#L36-L69)
- [modularLoader.ts:6-10](file://src/i18n/modularLoader.ts#L6-L10)
- [modularLoader.ts:51-87](file://src/i18n/modularLoader.ts#L51-L87)

### Managing Translation Keys
- Centralize shared keys in common namespaces.
- For module UI, use module-specific namespaces to avoid collisions.
- Use the unified navigation namespace to consolidate navigation labels across modules.
- **Updated**: Maintain standardized key structures across all supported languages.

**Section sources**
- [modularLoader.ts:63-86](file://src/i18n/modularLoader.ts#L63-L86)

### Language-Specific Formatting
- Dates/times: Use the formatting helpers to produce locale-aware strings.
- Numbers/currency: Use the number formatter with optional currency codes.
- Relative time: Utilize relative date formatting for human-friendly timestamps.
- **Updated**: Enhanced formatting support for all four languages with proper pluralization rules.

**Section sources**
- [I18nManager.ts:167-225](file://src/i18n/I18nManager.ts#L167-L225)
- [I18nManager.ts:230-252](file://src/i18n/I18nManager.ts#L230-L252)

### Translation Workflow and Quality Assurance
- Workflow:
  - Define keys in code using the translation hook.
  - Add English translations in static or module files.
  - Add target language translations alongside English.
  - Validate rendering across modules and verify navigation labels.
  - **Updated**: Ensure complete coverage for all four supported languages.
- QA:
  - Run tests that assert translation presence and formatting.
  - Verify language switching does not break UI.
  - Monitor console warnings for missing keys.
  - **Updated**: Test JSON parsing for all translation files.
  - **Updated**: Validate navigation key consistency across languages.

### Multi-Language Implementation Guide
- **JSON Structure**: Ensure all translation files follow the same structure
- **Key Consistency**: Maintain identical key hierarchies across languages
- **Error Handling**: Implement proper JSON parsing validation
- **Testing Strategy**: Test each language independently and together
- **Documentation**: Keep translation key documentation updated

**Section sources**
- [modularLoader.ts:20](file://src/i18n/modularLoader.ts#L20)
- [i18n.ts:38](file://src/i18n/i18n.ts#L38)
- [navigation.json:1-231](file://src/i18n/locales/en/navigation.json#L1-L231)