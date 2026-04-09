/**
 * React Hooks
 * 
 * Custom React hooks for SchoolPilot3.
 */

// PWA
export { usePWA } from './usePWA';

// Performance
export { useVirtualList } from './useVirtualList';

// Utility hooks
export { useLocalStorage } from './useLocalStorage';
export { useDebounce } from './useDebounce';
export { useAsync } from './useAsync';
export { usePrevious } from './usePrevious';
export { useMediaQuery } from './useMediaQuery';
export { useKeyPress } from './useKeyPress';

// Data access hooks
export {
  useSharedData,
  useSharedEntity,
  useSharedUsers,
  useSharedStudents,
  useSharedStaff,
  useSharedClasses,
  useSharedClassStreams,
  useSharedDepartments,
  useSharedAcademicYears,
  useSharedSchoolDetails,
  SHARED_ENTITIES,
  isSharedEntity,
  type SharedEntity,
} from './useSharedData';
