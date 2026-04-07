// ABOUTME: Modal management hook for the SchoolPilot3 design system
// ABOUTME: Focus management, keyboard navigation, and modal state handling

import { useEffect, useRef, useCallback, useState } from 'react';
import { useFocusManagement } from '@/utils/accessibility';

export interface UseModalOptions {
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  preventClose?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
  onAfterOpen?: () => void;
  onAfterClose?: () => void;
}

export interface UseModalReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  modalRef: React.RefObject<HTMLDivElement>;
  backdropRef: React.RefObject<HTMLDivElement>;
  isAnimating: boolean;
}

export const useModal = (
  initialOpen: boolean = false,
  options: UseModalOptions = {}
): UseModalReturn => {
  const {
    closeOnBackdrop = true,
    closeOnEscape = true,
    preventClose = false,
    onOpen,
    onClose,
    onAfterOpen,
    onAfterClose,
  } = options;

  const [isOpen, setIsOpen] = useState(initialOpen);
  const [isAnimating, setIsAnimating] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<Element | null>(null);
  const { trapFocus, restoreFocus } = useFocusManagement();

  // Open modal
  const open = useCallback(() => {
    if (isOpen || preventClose) return;
    
    if (typeof document !== 'undefined') {
      previousActiveElement.current = document.activeElement;
    }
    setIsAnimating(true);
    setIsOpen(true);
    onOpen?.();
    
    // Prevent body scroll
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }
    
    // Focus management after animation
    setTimeout(() => {
      if (modalRef.current && typeof document !== 'undefined') {
        trapFocus(modalRef.current);
      }
      setIsAnimating(false);
      onAfterOpen?.();
    }, 150); // Match animation duration
  }, [isOpen, preventClose, onOpen, onAfterOpen, trapFocus]);

  // Close modal
  const close = useCallback(() => {
    if (!isOpen || preventClose) return;
    
    setIsAnimating(true);
    onClose?.();
    
    setTimeout(() => {
      setIsOpen(false);
      setIsAnimating(false);
      
      // Restore body scroll
      if (typeof document !== 'undefined') {
        document.body.style.overflow = 'unset';
      }
      
      // Restore focus
      if (typeof document !== 'undefined') {
        restoreFocus(previousActiveElement.current);
      }
      onAfterClose?.();
    }, 150); // Match animation duration
  }, [isOpen, preventClose, onClose, onAfterClose, restoreFocus]);

  // Toggle modal
  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, open, close]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape || typeof document === 'undefined') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEscape, close]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((event: React.MouseEvent) => {
    if (!closeOnBackdrop || preventClose) return;
    
    if (event.target === backdropRef.current) {
      close();
    }
  }, [closeOnBackdrop, preventClose, close]);

  // Attach backdrop click handler
  useEffect(() => {
    if (!isOpen || !backdropRef.current) return;

    const backdrop = backdropRef.current;
    const handleClick = (event: MouseEvent) => {
      if (event.target === backdrop) {
        handleBackdropClick(event as any);
      }
    };

    backdrop.addEventListener('click', handleClick);
    return () => backdrop.removeEventListener('click', handleClick);
  }, [isOpen, handleBackdropClick]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = 'unset';
      }
    };
  }, []);

  return {
    isOpen,
    open,
    close,
    toggle,
    modalRef,
    backdropRef,
    isAnimating,
  };
};