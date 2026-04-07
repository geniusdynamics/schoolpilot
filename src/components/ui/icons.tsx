// ============================================================================
// DEPRECATED: Icon Registry
// ============================================================================
// This file is deprecated in favor of domain-based icon imports.
// 
// NEW IMPORT PATTERN (recommended):
//   import { HomeIcon, UsersIcon } from '@/components/ui/icons/navigation';
//   import { EditIcon, DeleteIcon } from '@/components/ui/icons/actions';
//   import { CheckCircleIcon } from '@/components/ui/icons/status';
//
// BACKWARD COMPATIBILITY:
//   This file re-exports everything for existing code.
//   Import from '@/components/ui/icons' (this file) continues to work.
//
// MIGRATION GUIDE:
//   1. Replace: import { HomeIcon } from '@/components/ui/icons';
//      With:    import { HomeIcon } from '@/components/ui/icons/navigation';
//
//   2. For tree-shaking benefits, import only what you need from specific files.
// ============================================================================

// Re-export all icons from the new domain-based structure
export * from './icons/index';

// Re-export IconProps for backward compatibility
export type { IconProps } from './icons/index';

// Deprecation warning in development
if (import.meta.env.DEV) {
  console.warn(
    '[DEPRECATED] Importing from @/components/ui/icons.tsx is deprecated. ' +
    'Use domain-specific imports for better tree-shaking:\n' +
    '  - @/components/ui/icons/navigation\n' +
    '  - @/components/ui/icons/actions\n' +
    '  - @/components/ui/icons/status\n' +
    '  - @/components/ui/icons/module\n' +
    '  - @/components/ui/icons/misc'
  );
}
