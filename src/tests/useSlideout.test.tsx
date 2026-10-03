// ABOUTME: Tests for useSlideout hook functionality
// ABOUTME: Tests state management, auto-save, data updates, and hook integration

import { renderHook, act } from '@testing-library/react';
import { useSlideout } from '@/hooks/useSlideout';

import { vi } from 'vitest';

// Mock the accessibility utilities
vi.mock('../utils/accessibility', () => ({
  announceToScreenReader: vi.fn(),
}));

// Get the mocked function for assertions
const { announceToScreenReader } = await import('../utils/accessibility');

describe('useSlideout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('Basic State Management', () => {
    it('should initialize with closed state', () => {
      const { result } = renderHook(() => useSlideout());
      
      expect(result.current.isOpen).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSaving).toBe(false);
      expect(result.current.hasUnsavedChanges).toBe(false);
      expect(result.current.data).toBe(null);
    });

    it('should open slideout with data', () => {
      const { result } = renderHook(() => useSlideout());
      const testData = { name: 'John', age: 30 };
      
      act(() => {
        result.current.open(testData);
      });
      
      expect(result.current.isOpen).toBe(true);
      expect(result.current.data).toEqual(testData);
      expect(result.current.hasUnsavedChanges).toBe(false);
    });

    it('should open slideout without data', () => {
      const { result } = renderHook(() => useSlideout());
      
      act(() => {
        result.current.open();
      });
      
      expect(result.current.isOpen).toBe(true);
      expect(result.current.data).toBe(null);
    });

    it('should close slideout', () => {
      const { result } = renderHook(() => useSlideout());
      
      act(() => {
        result.current.open({ name: 'John' });
      });
      
      expect(result.current.isOpen).toBe(true);
      
      act(() => {
        result.current.close();
      });
      
      expect(result.current.isOpen).toBe(false);
      expect(result.current.data).toBe(null);
      expect(result.current.hasUnsavedChanges).toBe(false);
    });

    it('should call onClose callback when closing', () => {
      const onClose = vi.fn();
      const { result } = renderHook(() => useSlideout({ onClose }));
      
      act(() => {
        result.current.open();
      });
      
      act(() => {
        result.current.close();
      });
      
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Data Management', () => {
    it('should update data with object', () => {
      const { result } = renderHook(() => useSlideout());
      
      act(() => {
        result.current.open({ name: 'John', age: 30 });
      });
      
      act(() => {
        result.current.updateData({ age: 31 });
      });
      
      expect(result.current.data).toEqual({ name: 'John', age: 31 });
      expect(result.current.hasUnsavedChanges).toBe(true);
    });

    it('should update data with function', () => {
      const { result } = renderHook(() => useSlideout());
      
      act(() => {
        result.current.open({ name: 'John', age: 30 });
      });
      
      act(() => {
        result.current.updateData((prev) => ({ ...prev, age: prev.age + 1 }));
      });
      
      expect(result.current.data).toEqual({ name: 'John', age: 31 });
      expect(result.current.hasUnsavedChanges).toBe(true);
    });

    it('should set loading state', () => {
      const { result } = renderHook(() => useSlideout());
      
      act(() => {
        result.current.setLoading(true);
      });
      
      expect(result.current.isLoading).toBe(true);
      
      act(() => {
        result.current.setLoading(false);
      });
      
      expect(result.current.isLoading).toBe(false);
    });

    it('should reset to initial data', () => {
      const initialData = { name: 'John', age: 30 };
      const { result } = renderHook(() => useSlideout());
      
      act(() => {
        result.current.open(initialData);
      });
      
      act(() => {
        result.current.updateData({ age: 31 });
      });
      
      expect(result.current.hasUnsavedChanges).toBe(true);
      
      act(() => {
        result.current.reset();
      });
      
      expect(result.current.data).toEqual(initialData);
      expect(result.current.hasUnsavedChanges).toBe(false);
    });

    it('should detect changes from initial data', () => {
      const { result } = renderHook(() => useSlideout());
      const initialData = { name: 'John', age: 30 };
      
      act(() => {
        result.current.open(initialData);
      });
      
      expect(result.current.hasChanges()).toBe(false);
      
      act(() => {
        result.current.updateData({ age: 31 });
      });
      
      expect(result.current.hasChanges()).toBe(true);
    });
  });

  describe('Save Functionality', () => {
    it('should save data successfully', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useSlideout({ onSave }));
      
      act(() => {
        result.current.open({ name: 'John' });
      });
      
      act(() => {
        result.current.updateData({ age: 30 });
      });
      
      expect(result.current.hasUnsavedChanges).toBe(true);
      
      let saveResult;
      await act(async () => {
        saveResult = await result.current.save();
      });
      
      expect(saveResult).toBe(true);
      expect(onSave).toHaveBeenCalledWith({ name: 'John', age: 30 });
      expect(result.current.hasUnsavedChanges).toBe(false);
      expect(result.current.isSaving).toBe(false);
    });

    it('should handle save errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const onSave = vi.fn().mockRejectedValue(new Error('Save failed'));
      const { result } = renderHook(() => useSlideout({ onSave }));
      
      act(() => {
        result.current.open({ name: 'John' });
      });
      
      let saveResult;
      await act(async () => {
        saveResult = await result.current.save();
      });
      
      expect(saveResult).toBe(false);
      expect(result.current.isSaving).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('[ERROR]', 'Save failed:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should not save when no onSave provided', async () => {
      const { result } = renderHook(() => useSlideout());
      
      act(() => {
        result.current.open({ name: 'John' });
      });
      
      await act(async () => {
        await result.current.save();
      });
      
      // Should not throw or cause issues
      expect(result.current.isSaving).toBe(false);
    });

    it('should set saving state during save', async () => {
      // Deferred promise so we control exactly when the save resolves. Never
      // leave an act() promise unresolved: an abandoned async act() wedges
      // React's act queue for the remainder of the worker run.
      let resolveSave: () => void = () => {};
      const onSave = vi.fn().mockImplementation(
        () => new Promise<void>(resolve => { resolveSave = resolve; })
      );
      const { result } = renderHook(() => useSlideout({ onSave }));

      act(() => {
        result.current.open({ name: 'John' });
      });

      let savePromise: Promise<boolean | undefined> = Promise.resolve(false);
      act(() => {
        savePromise = result.current.save();
      });

      // save() sets isSaving synchronously before awaiting onSave
      expect(result.current.isSaving).toBe(true);

      await act(async () => {
        resolveSave();
        await savePromise;
      });

      expect(result.current.isSaving).toBe(false);
    });
  });

  describe('Auto-save Functionality', () => {
    it('should trigger auto-save after delay', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useSlideout({ 
        autoSave: true, 
        autoSaveDelay: 1000,
        onSave 
      }));
      
      act(() => {
        result.current.open({ name: 'John' });
      });
      
      act(() => {
        result.current.updateData({ age: 30 });
      });
      
      expect(result.current.hasUnsavedChanges).toBe(true);
      
      // Fast-forward time
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      
      // Wait for async operations
      await act(async () => {
        await Promise.resolve();
      });
      
      expect(onSave).toHaveBeenCalledWith({ name: 'John', age: 30 });
      expect(result.current.hasUnsavedChanges).toBe(false);
    });

    it('should not auto-save when disabled', () => {
      const onSave = vi.fn();
      const { result } = renderHook(() => useSlideout({ 
        autoSave: false,
        onSave 
      }));
      
      act(() => {
        result.current.open({ name: 'John' });
      });
      
      act(() => {
        result.current.updateData({ age: 30 });
      });
      
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      
      expect(onSave).not.toHaveBeenCalled();
    });

    it('should debounce auto-save calls', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useSlideout({ 
        autoSave: true, 
        autoSaveDelay: 1000,
        onSave 
      }));
      
      act(() => {
        result.current.open({ name: 'John' });
      });
      
      // Make multiple rapid changes
      act(() => {
        result.current.updateData({ age: 30 });
      });
      
      act(() => {
        vi.advanceTimersByTime(500);
      });
      
      act(() => {
        result.current.updateData({ age: 31 });
      });
      
      act(() => {
        vi.advanceTimersByTime(500);
      });
      
      act(() => {
        result.current.updateData({ age: 32 });
      });
      
      // Only the last change should trigger auto-save after full delay
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      
      await act(async () => {
        await Promise.resolve();
      });
      
      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenCalledWith({ name: 'John', age: 32 });
    });

    it('should handle auto-save errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const onSave = vi.fn().mockRejectedValue(new Error('Auto-save failed'));
      const { result } = renderHook(() => useSlideout({ 
        autoSave: true, 
        autoSaveDelay: 1000,
        onSave 
      }));
      
      act(() => {
        result.current.open({ name: 'John' });
      });
      
      act(() => {
        result.current.updateData({ age: 30 });
      });
      
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      
      await act(async () => {
        await Promise.resolve();
      });
      
      expect(consoleSpy).toHaveBeenCalledWith('[ERROR]', 'Auto-save failed:', expect.any(Error));
      expect(result.current.isSaving).toBe(false);
      
      consoleSpy.mockRestore();
    });
  });

  describe('Close Prevention', () => {
    it('should prevent close with unsaved changes when enabled', () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      const { result } = renderHook(() => useSlideout({ 
        preventCloseOnUnsaved: true 
      }));
      
      act(() => {
        result.current.open({ name: 'John' });
      });
      
      act(() => {
        result.current.updateData({ age: 30 });
      });
      
      expect(result.current.hasUnsavedChanges).toBe(true);
      expect(result.current.canClose).toBe(false);
      
      const closeResult = act(() => {
        return result.current.close();
      });
      
      expect(confirmSpy).toHaveBeenCalledWith('You have unsaved changes. Are you sure you want to close?');
      expect(result.current.isOpen).toBe(true); // Should still be open
      
      confirmSpy.mockRestore();
    });

    it('should allow close when user confirms', () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      const { result } = renderHook(() => useSlideout({ 
        preventCloseOnUnsaved: true 
      }));
      
      act(() => {
        result.current.open({ name: 'John' });
      });
      
      act(() => {
        result.current.updateData({ age: 30 });
      });
      
      act(() => {
        result.current.close();
      });
      
      expect(confirmSpy).toHaveBeenCalled();
      expect(result.current.isOpen).toBe(false);
      
      confirmSpy.mockRestore();
    });

    it('should allow close without confirmation when no unsaved changes', () => {
      const confirmSpy = vi.spyOn(window, 'confirm');
      const { result } = renderHook(() => useSlideout({ 
        preventCloseOnUnsaved: true 
      }));
      
      act(() => {
        result.current.open({ name: 'John' });
      });
      
      expect(result.current.canClose).toBe(true);
      
      act(() => {
        result.current.close();
      });
      
      expect(confirmSpy).not.toHaveBeenCalled();
      expect(result.current.isOpen).toBe(false);
      
      confirmSpy.mockRestore();
    });

    it('should allow close when prevention is disabled', () => {
      const confirmSpy = vi.spyOn(window, 'confirm');
      const { result } = renderHook(() => useSlideout({ 
        preventCloseOnUnsaved: false 
      }));
      
      act(() => {
        result.current.open({ name: 'John' });
      });
      
      act(() => {
        result.current.updateData({ age: 30 });
      });
      
      expect(result.current.canClose).toBe(true);
      
      act(() => {
        result.current.close();
      });
      
      expect(confirmSpy).not.toHaveBeenCalled();
      expect(result.current.isOpen).toBe(false);
      
      confirmSpy.mockRestore();
    });
  });

  describe('Cleanup', () => {
    it('should clear auto-save timer on close', () => {
      // jsdom does not implement window.confirm; the hook consults it because
      // preventCloseOnUnsaved defaults to true and the panel has unsaved changes.
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      const onSave = vi.fn();
      const { result } = renderHook(() => useSlideout({ 
        autoSave: true, 
        autoSaveDelay: 1000,
        onSave 
      }));
      
      act(() => {
        result.current.open({ name: 'John' });
      });
      
      act(() => {
        result.current.updateData({ age: 30 });
      });
      
      // Close before auto-save triggers
      act(() => {
        result.current.close();
      });
      
      confirmSpy.mockRestore();
      
      // Advance time past auto-save delay
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      
      // Auto-save should not have been called
      expect(onSave).not.toHaveBeenCalled();
    });

    it('should clear auto-save timer on unmount', () => {
      const onSave = vi.fn();
      const { result, unmount } = renderHook(() => useSlideout({ 
        autoSave: true, 
        autoSaveDelay: 1000,
        onSave 
      }));
      
      act(() => {
        result.current.open({ name: 'John' });
      });
      
      act(() => {
        result.current.updateData({ age: 30 });
      });
      
      unmount();
      
      // Advance time past auto-save delay
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      
      // Auto-save should not have been called
      expect(onSave).not.toHaveBeenCalled();
    });
  });

  describe('Screen Reader Announcements', () => {
    it('should announce when slideout opens', () => {
      const { result } = renderHook(() => useSlideout());
      
      act(() => {
        result.current.open();
      });
      
      expect(announceToScreenReader).toHaveBeenCalledWith('Form panel opened', 'polite');
    });

    it('should announce when slideout closes', () => {
      const { result } = renderHook(() => useSlideout());
      
      act(() => {
        result.current.open();
      });
      
      act(() => {
        result.current.close();
      });
      
      expect(announceToScreenReader).toHaveBeenCalledWith('Form panel closed', 'polite');
    });

    it('should announce successful save', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useSlideout({ onSave }));
      
      act(() => {
        result.current.open({ name: 'John' });
      });
      
      await act(async () => {
        await result.current.save();
      });
      
      expect(announceToScreenReader).toHaveBeenCalledWith('Changes saved successfully', 'polite');
    });

    it('should announce save failure', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const onSave = vi.fn().mockRejectedValue(new Error('Save failed'));
      const { result } = renderHook(() => useSlideout({ onSave }));
      
      act(() => {
        result.current.open({ name: 'John' });
      });
      
      await act(async () => {
        await result.current.save();
      });
      
      expect(announceToScreenReader).toHaveBeenCalledWith('Save failed', 'assertive');
      consoleSpy.mockRestore();
    });
  });
});
