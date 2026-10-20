// ABOUTME: ButtonGroup component for grouped actions with proper spacing and accessibility
// ABOUTME: Supports various layouts, selection states, and keyboard navigation

import React, { ReactNode, Children, cloneElement, isValidElement, forwardRef } from 'react';
import { useKeyboardNavigation, generateId } from '@/utils/accessibility';
import { useTransition } from '@/utils/animations';

interface ButtonGroupProps {
  children: ReactNode;
  orientation?: 'horizontal' | 'vertical';
  variant?: 'default' | 'segmented' | 'toolbar';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  spacing?: 'none' | 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  className?: string;
  'aria-label'?: string;
  role?: 'group' | 'toolbar' | 'radiogroup';
  // Selection props for segmented variant
  value?: string | number;
  onChange?: (value: string | number) => void;
  exclusive?: boolean; // For radio-like behavior
}

const ButtonGroup = forwardRef<HTMLDivElement, ButtonGroupProps>(({
  children,
  orientation = 'horizontal',
  variant = 'default',
  size = 'md',
  spacing = 'sm',
  fullWidth = false,
  className = '',
  'aria-label': ariaLabel,
  role = 'group',
  value,
  onChange,
  exclusive = false,
  ...rest
}, ref) => {
  const groupId = generateId('button-group');
  const childrenArray = Children.toArray(children);
  const validChildren = childrenArray.filter(isValidElement);

  // Enhanced transition styles
  const transitionStyles = useTransition(['box-shadow']);

  // Base styles for the group container
  const baseStyles = [
    'inline-flex',
    'items-center',
    fullWidth ? 'w-full' : '',
    orientation === 'vertical' ? 'flex-col' : 'flex-row',
  ].filter(Boolean).join(' ');

  // Variant-specific styles using standard Tailwind classes
  const variantStyles = {
    default: '',
    segmented: [
      'bg-surface-accent',
      'border border-surface-border',
      'rounded-lg',
      'p-1',
      'shadow-sm',
    ].join(' '),
    toolbar: [
      'bg-surface-card',
      'border border-surface-border',
      'rounded-md',
      'shadow-sm',
      'divide-x divide-surface-border',
    ].join(' '),
  };

  // Spacing styles
  const spacingStyles = {
    none: '',
    sm: orientation === 'horizontal' ? 'gap-1' : 'gap-1',
    md: orientation === 'horizontal' ? 'gap-2' : 'gap-2',
    lg: orientation === 'horizontal' ? 'gap-3' : 'gap-3',
  };

  // Special spacing for segmented variant (no gap needed)
  const actualSpacing = variant === 'segmented' ? 'none' : spacing;

  const combinedClassName = [
    baseStyles,
    variantStyles[variant],
    spacingStyles[actualSpacing],
    className,
  ].filter(Boolean).join(' ');

  // Enhanced children with proper styling and accessibility
  const enhancedChildren = validChildren.map((child, index) => {
    if (!isValidElement(child)) return child;

    const childElement = child as React.ReactElement;
    const isFirst = index === 0;
    const isLast = index === validChildren.length - 1;
    const isSelected = value !== undefined && childElement.props.value === value;

    // Props to pass to each child button
    const childProps: any = {
      key: childElement.key || index,
      size,
    };

    // Handle different variants
    if (variant === 'default') {
      // Default spacing - no special styling needed
    } else if (variant === 'segmented') {
      // Segmented control styling
      childProps.variant = isSelected ? 'primary' : 'ghost';
      childProps.className = [
        childElement.props.className || '',
        'flex-1',
        fullWidth ? 'w-full' : '',
        'rounded-md',
        'border-0',
        'shadow-none',
        'hover:shadow-none',
        'focus-visible:ring-1',
        'focus-visible:ring-offset-0',
        isSelected ? 'shadow-sm' : '',
      ].filter(Boolean).join(' ');
      
      // Handle selection
      if (onChange && childElement.props.value !== undefined) {
        const originalOnClick = childElement.props.onClick;
        childProps.onClick = (event: React.MouseEvent) => {
          onChange(childElement.props.value);
          originalOnClick?.(event);
        };
      }
    } else if (variant === 'toolbar') {
      // Toolbar styling with connected borders
      childProps.className = [
        childElement.props.className || '',
        'border-0',
        'rounded-none',
        'shadow-none',
        'hover:shadow-none',
        'focus-visible:ring-1',
        'focus-visible:ring-offset-0',
        'focus-visible:z-10',
        isFirst && orientation === 'horizontal' ? 'rounded-l-md' : '',
        isLast && orientation === 'horizontal' ? 'rounded-r-md' : '',
        isFirst && orientation === 'vertical' ? 'rounded-t-md' : '',
        isLast && orientation === 'vertical' ? 'rounded-b-md' : '',
      ].filter(Boolean).join(' ');
    }

    // Add ARIA attributes for selection states
    if (exclusive && role === 'radiogroup') {
      childProps['aria-checked'] = isSelected;
      childProps.role = 'radio';
    } else if (value !== undefined) {
      childProps['aria-pressed'] = isSelected;
    }

    return cloneElement(child, childProps);
  });

  // Keyboard navigation for the group
  const buttonElements = validChildren.map((_, index) => 
    document.getElementById(`${groupId}-button-${index}`)
  ).filter(Boolean) as HTMLElement[];

  const { handleKeyDown } = useKeyboardNavigation(buttonElements, {
    orientation: orientation === 'horizontal' ? 'horizontal' : 'vertical',
    loop: true,
    onSelect: (index) => {
      const selectedChild = validChildren[index];
      if (isValidElement(selectedChild) && onChange && (selectedChild as React.ReactElement).props.value !== undefined) {
        onChange((selectedChild as React.ReactElement).props.value);
      }
    },
  });

  return (
    <div
      ref={ref}
      id={groupId}
      className={combinedClassName}
      style={transitionStyles}
      role={role}
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      {...rest}
    >
      {enhancedChildren}
    </div>
  );
});

ButtonGroup.displayName = 'ButtonGroup';

export default ButtonGroup;