
// ABOUTME: Enhanced Modal component for the SchoolPilot3 design system
// ABOUTME: Modern modal with animations, focus management, and responsive design

import React, { ReactNode, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { XIcon } from './icons';
import { useModal } from '../../hooks/useModal';
import { useBreakpoint } from '../../utils/responsive';
import { useReducedMotion } from '../../utils/accessibility';
import { designTokens } from '../../utils/designTokens';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
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

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  variant = 'default',
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
  const { isMobile } = useBreakpoint();
  const prefersReducedMotion = useReducedMotion();
  const [isAnimating, setIsAnimating] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Use mobile drawer variant on small screens
  const effectiveVariant = isMobile && variant === 'default' ? 'drawer' : variant;

  // Handle modal state changes
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      document.body.style.overflow = 'hidden';
      
      // Add backdrop blur effect
      document.body.style.backdropFilter = 'blur(2px)';
      
      const timer = setTimeout(() => setIsAnimating(false), 150);
      return () => clearTimeout(timer);
    } else {
      document.body.style.overflow = 'unset';
      document.body.style.backdropFilter = 'none';
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
      document.body.style.overflow = 'unset';
      document.body.style.backdropFilter = 'none';
    };
  }, []);

  if (!isOpen) return null;

  // Size classes for different variants
  const getSizeClasses = () => {
    if (effectiveVariant === 'drawer') {
      return {
        xs: 'w-80',
        sm: 'w-96',
        md: 'w-[28rem]',
        lg: 'w-[32rem]',
        xl: 'w-[36rem]',
        full: 'w-full',
      };
    }

    return {
      xs: 'max-w-xs',
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl',
      full: 'max-w-full',
    };
  };

  const sizeClasses = getSizeClasses();

  // Animation classes
  const getAnimationClasses = () => {
    if (prefersReducedMotion) {
      return '';
    }

    const baseTransition = 'transition-all duration-300 ease-out';
    
    if (effectiveVariant === 'drawer') {
      return `${baseTransition} ${
        isAnimating 
          ? 'transform translate-x-full opacity-0' 
          : 'transform translate-x-0 opacity-100'
      }`;
    }

    return `${baseTransition} ${
      isAnimating 
        ? 'transform scale-95 opacity-0' 
        : 'transform scale-100 opacity-100'
    }`;
  };

  // Backdrop animation classes
  const backdropAnimationClasses = prefersReducedMotion 
    ? '' 
    : `transition-all duration-300 ease-out ${
        isAnimating ? 'opacity-0' : 'opacity-100'
      }`;

  // Render drawer variant
  const renderDrawer = () => (
    <div
      ref={backdropRef}
      className={`fixed inset-0 z-50 ${backdropAnimationClasses} ${overlayClassName}`}
      onClick={handleBackdropClick}
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        ref={modalRef}
        className={`
          fixed right-0 top-0 h-full bg-white shadow-2xl
          ${sizeClasses[size]}
          ${getAnimationClasses()}
          flex flex-col
          ${className}
        `}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0 ${headerClassName}`}>
          <h2 id="modal-title" className="text-lg font-semibold text-gray-900">
            {title}
          </h2>
          {showCloseButton && !preventClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              aria-label="Close modal"
              disabled={loading}
            >
              <XIcon className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className={`flex-1 overflow-y-auto px-6 py-4 ${bodyClassName}`}>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <span className="ml-3 text-gray-600">Loading...</span>
            </div>
          ) : (
            children
          )}
        </div>

        {/* Footer */}
        {footer && (
          <div className={`px-6 py-4 bg-gray-50 border-t border-gray-200 flex-shrink-0 ${footerClassName}`}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  // Render default/centered variant
  const renderDefault = () => (
    <div
      ref={backdropRef}
      className={`
        fixed inset-0 z-50 flex items-center justify-center p-4
        ${backdropAnimationClasses}
        ${overlayClassName}
      `}
      onClick={handleBackdropClick}
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        ref={modalRef}
        className={`
          bg-white rounded-lg shadow-2xl w-full
          ${sizeClasses[size]}
          ${getAnimationClasses()}
          flex flex-col max-h-[90vh]
          ${className}
        `}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0 ${headerClassName}`}>
          <h2 id="modal-title" className="text-lg font-semibold text-gray-900">
            {title}
          </h2>
          {showCloseButton && !preventClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              aria-label="Close modal"
              disabled={loading}
            >
              <XIcon className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className={`flex-1 overflow-y-auto px-6 py-4 ${bodyClassName}`}>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <span className="ml-3 text-gray-600">Loading...</span>
            </div>
          ) : (
            children
          )}
        </div>

        {/* Footer */}
        {footer && (
          <div className={`px-6 py-4 bg-gray-50 border-t border-gray-200 flex-shrink-0 ${footerClassName}`}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  const modalContent = effectiveVariant === 'drawer' ? renderDrawer() : renderDefault();

  return ReactDOM.createPortal(modalContent, document.body);
};

export default Modal;