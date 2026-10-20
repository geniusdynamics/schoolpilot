
// ABOUTME: Enhanced Modal component for the SchoolPilot3 design system
// ABOUTME: Tokenized surfaces, entrance animations, focus trap, and responsive sizes

import React, { ReactNode, useEffect, useId, useRef } from 'react';
import ReactDOM from 'react-dom';
import { XIcon } from './icons';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  /** Optional muted line rendered under the title in the header. */
  subtitle?: ReactNode;
  children: ReactNode;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  variant?: 'default' | 'centered' | 'drawer';
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  footer?: ReactNode;
  loading?: boolean;
  preventClose?: boolean;
  bodyClassName?: string;
  headerClassName?: string;
  footerClassName?: string;
  overlayClassName?: string;
  className?: string;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  size = 'md',
  closeOnBackdrop = true,
  closeOnEscape = true,
  showCloseButton = true,
  footer,
  loading = false,
  preventClose = false,
  bodyClassName = '',
  headerClassName = '',
  footerClassName = '',
  overlayClassName = '',
  className = '',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = useId();

  // Handle modal state changes
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape || preventClose) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEscape, preventClose, onClose]);

  // Focus management: move focus into the dialog on open, trap Tab, restore on close
  useEffect(() => {
    if (!isOpen) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const focusTimer = window.setTimeout(() => {
      modalRef.current?.focus();
    }, 0);

    const handleTabTrap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !modalRef.current) return;

      const focusables = Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);

      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && (document.activeElement === first || document.activeElement === modalRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleTabTrap);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleTabTrap);
      previouslyFocused.current?.focus?.();
    };
  }, [isOpen]);

  // Handle backdrop click
  const handleBackdropClick = (event: React.MouseEvent) => {
    if (!closeOnBackdrop || preventClose) return;

    if (event.target === backdropRef.current) {
      onClose();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  if (!isOpen) return null;

  // Size classes — bumped so forms occupy the right amount of screen space
  const getSizeClasses = () => {
    return {
      xs: 'max-w-sm',
      sm: 'max-w-md',
      md: 'max-w-lg',
      lg: 'max-w-2xl',
      xl: 'max-w-4xl',
      full: 'max-w-full',
    };
  };

  const sizeClasses = getSizeClasses();

  // Render default/centered variant
  const renderModal = () => (
    <div
      ref={backdropRef}
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/50 backdrop-blur-[2px] animate-backdrop-in ${overlayClassName}`}
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className={`
          bg-surface-card ring-1 ring-black/5 dark:ring-white/10 rounded-2xl shadow-xl w-full
          outline-none animate-modal-in
          ${sizeClasses[size]}
          flex flex-col max-h-[90vh]
          ${className}
        `}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between gap-4 px-6 py-4 border-b border-surface-border flex-shrink-0 ${headerClassName}`}>
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold tracking-tight text-surface-foreground">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 text-sm text-surface-muted-fg">{subtitle}</p>
            )}
          </div>
          {showCloseButton && !preventClose && (
            <button
              onClick={onClose}
              className="p-1.5 -m-1 text-surface-muted-fg hover:text-surface-foreground hover:bg-surface-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              aria-label="Close modal"
              disabled={loading}
            >
              <XIcon className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className={`flex-1 overflow-y-auto px-6 py-5 ${bodyClassName}`}>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-7 w-7 border-2 border-surface-border border-t-primary-600"></div>
              <span className="ml-3 text-sm text-surface-muted-fg">Loading...</span>
            </div>
          ) : (
            children
          )}
        </div>

        {/* Footer */}
        {footer && (
          <div className={`px-6 py-4 bg-surface-muted border-t border-surface-border flex-shrink-0 rounded-b-2xl ${footerClassName}`}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  const modalContent = renderModal();

  return ReactDOM.createPortal(modalContent, document.body);
};

export default Modal;
