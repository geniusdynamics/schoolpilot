// ABOUTME: Tests for useTooltip hook functionality and positioning logic
// ABOUTME: Covers state management, positioning calculations, and accessibility features

import { renderHook, act, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { useTooltip } from '@/hooks/useTooltip';

// Mock DOM methods
const mockGetBoundingClientRect = vi.fn();
const mockElement = {
  getBoundingClientRect: mockGetBoundingClientRect
};

describe('useTooltip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    vi.useFakeTimers();
    
    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 768, writable: true });
    
    // Mock getBoundingClientRect
    mockGetBoundingClientRect.mockReturnValue({
      top: 100,
      left: 100,
      bottom: 140,
      right: 200,
      width: 100,
      height: 40
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with correct default values', () => {
    const { result } = renderHook(() => useTooltip());

    expect(result.current.isVisible).toBe(false);
    expect(result.current.position).toBe(null);
    expect(result.current.triggerRef).toBeDefined();
    expect(result.current.tooltipRef).toBeDefined();
  });

  it('should show tooltip after delay', async () => {
    const { result } = renderHook(() => useTooltip({ delay: 100 }));

    act(() => {
      result.current.show();
    });

    expect(result.current.isVisible).toBe(false);

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.isVisible).toBe(true);
  });

  it('should hide tooltip immediately when not interactive', () => {
    const { result } = renderHook(() => useTooltip({ interactive: false }));

    act(() => {
      result.current.show();
      vi.advanceTimersByTime(200);
    });

    expect(result.current.isVisible).toBe(true);

    act(() => {
      result.current.hide();
    });

    expect(result.current.isVisible).toBe(false);
  });

  it('should hide tooltip with delay when interactive', () => {
    const { result } = renderHook(() => useTooltip({ interactive: true }));

    act(() => {
      result.current.show();
      vi.advanceTimersByTime(200);
    });

    expect(result.current.isVisible).toBe(true);

    act(() => {
      result.current.hide();
    });

    expect(result.current.isVisible).toBe(true);

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.isVisible).toBe(false);
  });

  it('should toggle tooltip visibility', () => {
    const { result } = renderHook(() => useTooltip());

    act(() => {
      result.current.toggle();
      vi.advanceTimersByTime(200);
    });

    expect(result.current.isVisible).toBe(true);

    act(() => {
      result.current.toggle();
    });

    expect(result.current.isVisible).toBe(false);
  });

  it('should not show tooltip when disabled', () => {
    const { result } = renderHook(() => useTooltip({ disabled: true }));

    act(() => {
      result.current.show();
      vi.advanceTimersByTime(200);
    });

    expect(result.current.isVisible).toBe(false);
  });

  it('should provide correct trigger props for hover trigger', () => {
    const { result } = renderHook(() => useTooltip({ trigger: 'hover' }));
    const props = result.current.getTriggerProps();

    expect(props.onMouseEnter).toBeDefined();
    expect(props.onMouseLeave).toBeDefined();
    expect(props.onFocus).toBeDefined();
    expect(props.onBlur).toBeDefined();
    expect(props.onClick).toBeUndefined();
  });

  it('should provide correct trigger props for click trigger', () => {
    const { result } = renderHook(() => useTooltip({ trigger: 'click' }));
    const props = result.current.getTriggerProps();

    expect(props.onClick).toBeDefined();
    expect(props.onMouseEnter).toBeUndefined();
    expect(props.onMouseLeave).toBeUndefined();
  });

  it('should provide correct trigger props for focus trigger', () => {
    const { result } = renderHook(() => useTooltip({ trigger: 'focus' }));
    const props = result.current.getTriggerProps();

    expect(props.onFocus).toBeDefined();
    expect(props.onBlur).toBeDefined();
    expect(props.onClick).toBeUndefined();
    expect(props.onMouseEnter).toBeUndefined();
  });

  it('should provide correct tooltip props', () => {
    const { result } = renderHook(() => useTooltip());
    const props = result.current.getTooltipProps();

    expect(props.id).toBe('tooltip');
    expect(props.role).toBe('tooltip');
    expect(props['aria-hidden']).toBe(true);
  });

  it('should provide interactive tooltip props when interactive', () => {
    const { result } = renderHook(() => useTooltip({ interactive: true }));
    const props = result.current.getTooltipProps();

    expect(props.onMouseEnter).toBeDefined();
    expect(props.onMouseLeave).toBeDefined();
  });

  it('should clear timeouts on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    const { result, unmount } = renderHook(() => useTooltip());

    act(() => {
      result.current.show();
    });

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});