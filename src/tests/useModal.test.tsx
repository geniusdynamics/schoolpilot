// ABOUTME: Tests for the useModal hook
// ABOUTME: Testing modal state management and basic functionality

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useModal } from '@/hooks/useModal';

// Mock the accessibility utilities
vi.mock('../utils/accessibility', () => ({
  useFocusManagement: () => ({
    trapFocus: vi.fn(),
    restoreFocus: vi.fn(),
    getFocusableElements: vi.fn(() => []),
  }),
}));

describe('useModal Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.style.overflow = 'unset';
    
    // Mock DOM methods
    Object.defineProperty(document, 'activeElement', {
      value: document.createElement('button'),
      writable: true,
    });
  });

  afterEach(() => {
    document.body.style.overflow = 'unset';
  });

  describe('Initial State', () => {
    it('initializes with closed state by default', () => {
      const { result } = renderHook(() => useModal());
      
      expect(result.current.isOpen).toBe(false);
      expect(result.current.isAnimating).toBe(false);
    });

    it('initializes with open state when specified', () => {
      const { result } = renderHook(() => useModal(true));
      
      expect(result.current.isOpen).toBe(true);
    });

    it('provides modal and backdrop refs', () => {
      const { result } = renderHook(() => useModal());
      
      expect(result.current.modalRef).toBeDefined();
      expect(result.current.backdropRef).toBeDefined();
      expect(result.current.modalRef.current).toBeNull();
      expect(result.current.backdropRef.current).toBeNull();
    });
  });

  describe('Modal State Management', () => {
    it('opens modal when open is called', () => {
      const { result } = renderHook(() => useModal());
      
      act(() => {
        result.current.open();
      });
      
      expect(result.current.isOpen).toBe(true);
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('closes modal when close is called', () => {
      const { result } = renderHook(() => useModal(true));
      
      act(() => {
        result.current.close();
      });
      
      // Should start animation
      expect(result.current.isAnimating).toBe(true);
    });

    it('toggles modal state', () => {
      const { result } = renderHook(() => useModal());
      
      // Toggle to open
      act(() => {
        result.current.toggle();
      });
      
      expect(result.current.isOpen).toBe(true);
      
      // Toggle to close
      act(() => {
        result.current.toggle();
      });
      
      expect(result.current.isAnimating).toBe(true);
    });

    it('prevents opening when already open', () => {
      const onOpen = vi.fn();
      const { result } = renderHook(() => useModal(true, { onOpen }));
      
      act(() => {
        result.current.open();
      });
      
      expect(onOpen).not.toHaveBeenCalled();
    });

    it('prevents closing when already closed', () => {
      const onClose = vi.fn();
      const { result } = renderHook(() => useModal(false, { onClose }));
      
      act(() => {
        result.current.close();
      });
      
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Prevent Close Option', () => {
    it('prevents opening when preventClose is true', () => {
      const { result } = renderHook(() => useModal(false, { preventClose: true }));
      
      act(() => {
        result.current.open();
      });
      
      expect(result.current.isOpen).toBe(false);
    });

    it('prevents closing when preventClose is true', () => {
      const { result } = renderHook(() => useModal(true, { preventClose: true }));
      
      act(() => {
        result.current.close();
      });
      
      expect(result.current.isOpen).toBe(true);
    });
  });

  describe('Callback Functions', () => {
    it('calls onOpen when modal opens', () => {
      const onOpen = vi.fn();
      const { result } = renderHook(() => useModal(false, { onOpen }));
      
      act(() => {
        result.current.open();
      });
      
      expect(onOpen).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when modal closes', () => {
      const onClose = vi.fn();
      const { result } = renderHook(() => useModal(true, { onClose }));
      
      act(() => {
        result.current.close();
      });
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Keyboard Event Handling', () => {
    it('closes modal on Escape key when closeOnEscape is true', () => {
      const { result } = renderHook(() => useModal(true, { closeOnEscape: true }));
      
      act(() => {
        const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
        document.dispatchEvent(escapeEvent);
      });
      
      expect(result.current.isAnimating).toBe(true);
    });

    it('does not close modal on Escape key when closeOnEscape is false', () => {
      const { result } = renderHook(() => useModal(true, { closeOnEscape: false }));
      
      act(() => {
        const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
        document.dispatchEvent(escapeEvent);
      });
      
      expect(result.current.isOpen).toBe(true);
      expect(result.current.isAnimating).toBe(false);
    });

    it('does not close modal on Escape key when preventClose is true', () => {
      const { result } = renderHook(() => useModal(true, { 
        closeOnEscape: true, 
        preventClose: true 
      }));
      
      act(() => {
        const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
        document.dispatchEvent(escapeEvent);
      });
      
      expect(result.current.isOpen).toBe(true);
    });

    it('ignores other keys', () => {
      const { result } = renderHook(() => useModal(true, { closeOnEscape: true }));
      
      act(() => {
        const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
        document.dispatchEvent(enterEvent);
      });
      
      expect(result.current.isOpen).toBe(true);
    });
  });

  describe('Animation State', () => {
    it('sets isAnimating to true when opening', () => {
      const { result } = renderHook(() => useModal());
      
      act(() => {
        result.current.open();
      });
      
      expect(result.current.isAnimating).toBe(true);
    });

    it('sets isAnimating to true when closing', () => {
      const { result } = renderHook(() => useModal(true));
      
      act(() => {
        result.current.close();
      });
      
      expect(result.current.isAnimating).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('restores body overflow on unmount', () => {
      document.body.style.overflow = 'hidden';
      
      const { unmount } = renderHook(() => useModal(true));
      
      unmount();
      
      expect(document.body.style.overflow).toBe('unset');
    });
  });

  describe('Edge Cases', () => {
    it('handles rapid open/close calls', () => {
      const { result } = renderHook(() => useModal());
      
      act(() => {
        result.current.open();
        result.current.close();
        result.current.open();
      });
      
      expect(result.current.isOpen).toBe(true);
    });

    it('handles missing DOM elements gracefully', () => {
      const { result } = renderHook(() => useModal());
      
      // Should not throw error even if refs are not attached
      act(() => {
        result.current.open();
      });
      
      expect(result.current.isOpen).toBe(true);
    });
  });
});