// ABOUTME: Comprehensive tooltip component with smart positioning and accessibility
// ABOUTME: Supports multiple trigger methods, rich content, and collision detection

import { ReactNode, cloneElement, isValidElement } from 'react';
import { createPortal } from 'react-dom';
import { useTooltip, UseTooltipOptions } from '../../../hooks/useTooltip';

export interface TooltipProps extends UseTooltipOptions {
  content: ReactNode;
  children: ReactNode;
  maxWidth?: string;
  className?: string;
  contentClassName?: string;
  arrow?: boolean;
}

export function Tooltip({
  content,
  children,
  maxWidth = '320px',
  className = '',
  contentClassName = '',
  arrow = true,
  ...options
}: TooltipProps) {
  const {
    isVisible,
    position,
    triggerRef,
    tooltipRef,
    getTriggerProps,
    getTooltipProps
  } = useTooltip(options);

  // Clone the child element and add trigger props
  const triggerElement = isValidElement(children)
    ? cloneElement(children, {
        ...getTriggerProps(),
        ref: (node: HTMLElement) => {
          // Handle both function and object refs
          if (typeof children.ref === 'function') {
            children.ref(node);
          } else if (children.ref) {
            children.ref.current = node;
          }
          triggerRef.current = node;
        }
      })
    : children;

  const tooltipContent = (
    <div
      {...getTooltipProps()}
      className={`
        fixed z-50 px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-lg
        transition-opacity duration-200 pointer-events-none
        ${isVisible ? 'opacity-100' : 'opacity-0'}
        ${options.interactive ? 'pointer-events-auto' : ''}
        ${className}
      `}
      style={{
        top: position?.top ?? -9999,
        left: position?.left ?? -9999,
        maxWidth,
        ...(!isVisible && { visibility: 'hidden' })
      }}
    >
      <div className={`relative ${contentClassName}`}>
        {content}
        {arrow && position && (
          <div
            className={`
              absolute w-2 h-2 bg-gray-900 transform rotate-45
              ${position.placement === 'top' ? 'top-full left-1/2 -translate-x-1/2 -translate-y-1/2' : ''}
              ${position.placement === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 translate-y-1/2' : ''}
              ${position.placement === 'left' ? 'left-full top-1/2 -translate-y-1/2 -translate-x-1/2' : ''}
              ${position.placement === 'right' ? 'right-full top-1/2 -translate-y-1/2 translate-x-1/2' : ''}
            `}
          />
        )}
      </div>
    </div>
  );

  return (
    <>
      {triggerElement}
      {typeof document !== 'undefined' && createPortal(tooltipContent, document.body)}
    </>
  );
}

// Specialized tooltip variants
export interface InfoTooltipProps extends Omit<TooltipProps, 'content'> {
  title: string;
  description?: string;
}

export function InfoTooltip({ title, description, ...props }: InfoTooltipProps) {
  const content = (
    <div>
      <div className="font-semibold">{title}</div>
      {description && <div className="mt-1 text-xs opacity-90">{description}</div>}
    </div>
  );

  return <Tooltip content={content} {...props} />;
}

export interface HelpTooltipProps extends Omit<TooltipProps, 'content' | 'children'> {
  content: ReactNode;
  className?: string;
}

export function HelpTooltip({ content, className = '', ...props }: HelpTooltipProps) {
  return (
    <Tooltip content={content} {...props}>
      <button
        type="button"
        className={`
          inline-flex items-center justify-center w-4 h-4 text-surface-muted-fg hover:text-surface-muted-fg
          rounded-full border border-surface-border hover:border-gray-400
          transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500
          ${className}
        `}
        aria-label="Help"
      >
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </Tooltip>
  );
}

export interface ValidationTooltipProps extends Omit<TooltipProps, 'content'> {
  rules: string[];
  examples?: string[];
}

export function ValidationTooltip({ rules, examples, ...props }: ValidationTooltipProps) {
  const content = (
    <div className="space-y-2">
      <div>
        <div className="font-semibold text-xs uppercase tracking-wide mb-1">Requirements:</div>
        <ul className="space-y-1">
          {rules.map((rule, index) => (
            <li key={index} className="flex items-start text-xs">
              <span className="text-primary-400 mr-1">â€¢</span>
              {rule}
            </li>
          ))}
        </ul>
      </div>
      {examples && examples.length > 0 && (
        <div>
          <div className="font-semibold text-xs uppercase tracking-wide mb-1">Examples:</div>
          <ul className="space-y-1">
            {examples.map((example, index) => (
              <li key={index} className="text-xs text-green-300">
                {example}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  return <Tooltip content={content} maxWidth="280px" {...props} />;
}

// Export the hook for advanced usage
export { useTooltip } from '../../../hooks/useTooltip';