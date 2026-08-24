// ABOUTME: UI components index file for centralized exports
// ABOUTME: Provides clean imports for all UI components

export { default as Button } from './Button';
export type { PolymorphicButtonProps } from './Button';

export { default as IconButton } from './IconButton';
export type { PolymorphicIconButtonProps } from './IconButton';

export { default as ButtonGroup } from './ButtonGroup';

// Enhanced form components
export { default as Input } from './Input';
export type { ModernInputProps } from './Input';

export { default as Textarea } from './Textarea';
export type { TextareaProps } from './Textarea';

// Form utilities
export * from './forms';

export { default as DatePicker } from './forms/DatePicker';
export type { DatePickerProps } from './forms/DatePicker';

export { default as TabbedForm } from './forms/TabbedForm';
export type { TabbedFormProps, FormTab } from './forms/TabbedForm';

// Data display components
export * from './data';

export { default as DataGrid } from './data/DataGrid';
export type { DataGridProps, DataGridColumn, PaginationConfig } from './data/DataGrid';

// Feedback components
export * from './feedback';

export {
  Skeleton,
  TextSkeleton,
  AvatarSkeleton,
  CardSkeleton,
  TableSkeleton,
  FormSkeleton,
  ListSkeleton,
  ProgressiveLoader,
  SpinnerLoader,
  LoadingOverlay,
  default as LoadingStates,
} from './feedback/LoadingStates';

export { default as Toast } from './feedback/Toast';
export type { ToastProps, ToastVariant } from './feedback/Toast';

export {
  Tooltip,
  InfoTooltip,
  HelpTooltip,
  ValidationTooltip,
  useTooltip
} from './feedback/Tooltip';
export type { TooltipProps, InfoTooltipProps, HelpTooltipProps, ValidationTooltipProps } from './feedback/Tooltip';

// Enhanced form components
export { default as Select } from './Select';
export type { SelectOption, SelectProps } from './Select';
export { default as Modal } from './Modal';
export { default as Card, CardHeader, CardTitle, CardDescription, CardContent } from './Card';
export type { CardVariant, CardSize } from './Card';
export { TabsRoot as Tabs, TabsList, TabsTrigger, TabsContent } from './Tabs';
export { default as Spinner } from './Spinner';
export { ConfirmProvider, useConfirm } from './ConfirmDialog';
export type { ConfirmOptions } from './ConfirmDialog';
export { default as EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';
export { default as Badge } from './Badge';
export { Alert, AlertDescription } from './Alert';

// Dialog components
export { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './Dialog';

// Label component
export { Label } from './Label';

// Extended Select components
export { SelectRoot, SelectTrigger, SelectValue, SelectContent, SelectItem } from './SelectExtensions';

// Navigation components
export { default as TabNavigation } from './TabNavigation';
export type { TabItem, TabNavigationProps } from './TabNavigation';
export { default as PageHeaderWithTabs } from './PageHeaderWithTabs';
export type { Tab as PageHeaderTab } from './PageHeaderWithTabs';

// Filter components
export { default as FilterBar } from './FilterBar';
export type { FilterField, FilterOption } from './FilterBar';
