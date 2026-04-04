// ABOUTME: Form styling utilities and Tailwind class patterns
// ABOUTME: Provides consistent form styling patterns across the application

import { cn } from './cn';

// Form input base styles
export const formInputStyles = {
  base: `
    w-full rounded-lg border
    px-3 py-2 text-sm
    placeholder-gray-400
    transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-0
  `,

  variants: {
    outlined: `
      border-gray-300 bg-white
      focus:border-blue-500 focus:ring-blue-500/20
      hover:border-gray-400
    `,
    filled: `
      border-transparent bg-gray-100
      focus:bg-white focus:border-blue-500 focus:ring-blue-500/20
    `,
    standard: `
      border-0 border-b-2 border-gray-300 rounded-none bg-transparent
      focus:border-blue-500 focus:ring-0
      px-0 py-1
    `,
  },

  states: {
    error: `
      border-red-500
      focus:border-red-500 focus:ring-red-500/20
    `,
    success: `
      border-green-500
      focus:border-green-500 focus:ring-green-500/20
    `,
    disabled: `
      bg-gray-100 text-gray-500 cursor-not-allowed
      border-gray-200
    `,
    loading: `
      opacity-70 cursor-wait
    `,
  },

  sizes: {
    sm: 'text-xs px-2.5 py-1.5',
    md: 'text-sm px-3 py-2',
    lg: 'text-base px-4 py-2.5',
  },
};

// Form label styles
export const formLabelStyles = {
  base: 'block text-sm font-medium',
  states: {
    default: 'text-gray-700',
    error: 'text-red-700',
    success: 'text-green-700',
    disabled: 'text-gray-400',
  },
  sizes: {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  },
};

// Form actions (buttons container) styles
export const formActionsStyles = {
  base: 'flex items-center gap-3',
  alignments: {
    right: 'justify-end',
    left: 'justify-start',
    center: 'justify-center',
    between: 'justify-between',
  },
  variants: {
    default: 'bg-gray-50 px-6 py-4 border-t border-gray-200',
    transparent: 'bg-transparent',
    sticky: 'sticky bottom-0 z-10',
  },
};

// Form section styles
export const formSectionStyles = {
  base: 'space-y-4',
  title: 'text-sm font-semibold uppercase tracking-wide text-gray-900',
  description: 'text-sm text-gray-600',
  variants: {
    bordered: 'border-b border-gray-200 pb-6 mb-6',
    collapsible: 'cursor-pointer',
  },
};

// Form grid styles
export const formGridStyles = {
  base: 'grid gap-4',
  columns: {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  },
  gaps: {
    none: 'gap-0',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
  },
};

// Form field wrapper styles
export const formFieldStyles = {
  base: 'flex flex-col',
  layouts: {
    vertical: 'flex flex-col space-y-2',
    horizontal: 'flex flex-row items-start gap-4',
  },
  sizes: {
    sm: { spacing: 'space-y-1', label: 'text-xs' },
    md: { spacing: 'space-y-2', label: 'text-sm' },
    lg: { spacing: 'space-y-3', label: 'text-base' },
  },
};

// Progress bar styles
export const progressBarStyles = {
  track: 'w-full bg-gray-200 rounded-full h-2 overflow-hidden',
  fill: 'h-full rounded-full transition-all duration-300 ease-out',
  variants: {
    default: 'bg-blue-600',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
  },
};

// Step indicator styles
export const stepIndicatorStyles = {
  circle: 'flex items-center justify-center w-10 h-10 rounded-full font-semibold text-sm',
  states: {
    current: 'bg-blue-600 text-white ring-4 ring-blue-100',
    completed: 'bg-green-500 text-white',
    pending: 'bg-gray-200 text-gray-500',
  },
  connector: 'flex-1 h-0.5 mx-4',
  connectorStates: {
    completed: 'bg-green-500',
    pending: 'bg-gray-200',
  },
};

// Helper function to combine input styles
export function getInputClassName(
  variant: 'outlined' | 'filled' | 'standard' = 'outlined',
  size: 'sm' | 'md' | 'lg' = 'md',
  state?: 'error' | 'success' | 'disabled' | 'loading'
): string {
  return cn(
    formInputStyles.base,
    formInputStyles.variants[variant],
    formInputStyles.sizes[size],
    state && formInputStyles.states[state]
  );
}

// Helper function to combine label styles
export function getLabelClassName(
  size: 'sm' | 'md' | 'lg' = 'md',
  state?: 'error' | 'success' | 'disabled'
): string {
  return cn(
    formLabelStyles.base,
    formLabelStyles.sizes[size],
    state ? formLabelStyles.states[state] : formLabelStyles.states.default
  );
}

// Helper function to combine form actions styles
export function getFormActionsClassName(
  align: 'right' | 'left' | 'center' | 'between' = 'right',
  variant: 'default' | 'transparent' | 'sticky' = 'default',
  sticky = false
): string {
  return cn(
    formActionsStyles.base,
    formActionsStyles.alignments[align],
    formActionsStyles.variants[variant],
    sticky && formActionsStyles.variants.sticky
  );
}

// Helper function to combine form grid styles
export function getFormGridClassName(
  columns: 1 | 2 | 3 | 4 = 2,
  gap: 'none' | 'sm' | 'md' | 'lg' = 'md'
): string {
  return cn(
    formGridStyles.base,
    formGridStyles.columns[columns],
    formGridStyles.gaps[gap]
  );
}

// CSS-in-JS style object generator for dynamic styles
export function generateInputStyle(options: {
  variant?: 'outlined' | 'filled' | 'standard';
  size?: 'sm' | 'md' | 'lg';
  state?: 'error' | 'success' | 'disabled' | 'loading';
  focusRingColor?: string;
}): React.CSSProperties {
  const { variant = 'outlined', size = 'md', state, focusRingColor } = options;

  return {
    transitionProperty: 'all',
    transitionDuration: '200ms',
    ...(focusRingColor && {
      '--tw-ring-color': focusRingColor,
    }),
  };
}

// Export cn utility if not already available
export { cn };
