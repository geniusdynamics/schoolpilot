// ABOUTME: Deprecated path — merged into src/hooks/useValidation.ts (Phase 1b.1).
// Import from '@/hooks/useValidation' instead. This shim keeps old imports
// (`@/hooks/useFormValidation`) working until they are migrated.

export {
  useFormValidation,
  validators,
} from './useValidation';

export type {
  FieldValidationRule as ValidationRule,
  FieldValidationConfig,
  FormValidationConfig,
  FieldValidationError as ValidationError,
  FieldValidationState,
  FormValidationState,
  UseFormValidationOptions,
} from './useValidation';

import { useFormValidation } from './useValidation';
export default useFormValidation;
