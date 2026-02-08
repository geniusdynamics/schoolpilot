/**
 * Virtual List Hook
 * 
 * Efficiently renders large lists by only rendering visible items.
 * Uses intersection observer for dynamic height estimation.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

interface VirtualListOptions<T> {
  items: T[];
  itemHeight: number | ((item: T, index: number) => number);
  overscan?: number;
  scrollElement?: HTMLElement | null;
}

interface VirtualListState {
  virtualItems: Array<{
    index: number;
    item: any;
    style: React.CSSProperties;
  }>;
  totalHeight: number;
  startIndex: number;
  endIndex: number;
  scrollTop: number;
}

/**
 * Hook for virtualized lists
 * 
 * @example
 * ```tsx
 * const { virtualItems, totalHeight, containerStyle } = useVirtualList({
 *   items: largeArray,
 *   itemHeight: 50,
 *   overscan: 5,
 * });
 * 
 * return (
 *   <div style={containerStyle}>
 *     {virtualItems.map(({ item, style }) => (
 *       <div key={item.id} style={style}>
 *         {item.content}
 *       </div>
 *     ))}
 *   </div>
 * );
 * ```
 */
export function useVirtualList<T>(options: VirtualListOptions<T>): {
  virtualItems: Array<{ index: number; item: T; style: React.CSSProperties }>;
  totalHeight: number;
  containerStyle: React.CSSProperties;
  scrollToIndex: (index: number) => void;
} {
  const { items, itemHeight, overscan = 3, scrollElement } = options;
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  // Calculate total height
  const totalHeight = useMemo(() => {
    if (typeof itemHeight === 'number') {
      return items.length * itemHeight;
    }
    
    return items.reduce((sum, item, index) => {
      return sum + itemHeight(item, index);
    }, 0);
  }, [items, itemHeight]);

  // Calculate range of visible items
  const { virtualItems, startIndex, endIndex } = useMemo(() => {
    const getItemHeight = typeof itemHeight === 'number' 
      ? () => itemHeight 
      : itemHeight;

    // Find start index
    let start = 0;
    let offset = 0;
    
    if (typeof itemHeight === 'number') {
      start = Math.floor(scrollTop / itemHeight);
      offset = start * itemHeight;
    } else {
      let currentOffset = 0;
      for (let i = 0; i < items.length; i++) {
        const height = getItemHeight(items[i], i);
        if (currentOffset + height > scrollTop) {
          start = i;
          offset = currentOffset;
          break;
        }
        currentOffset += height;
      }
    }

    // Apply overscan
    start = Math.max(0, start - overscan);

    // Find end index
    let end = start;
    let visibleHeight = 0;
    
    while (end < items.length && visibleHeight < containerHeight + (overscan * getItemHeight(items[end], end))) {
      visibleHeight += getItemHeight(items[end], end);
      end++;
    }

    // Create virtual items
    const virtualItems = [];
    let currentOffset = offset;
    
    // Recalculate offset for overscan
    if (typeof itemHeight === 'number') {
      currentOffset = start * itemHeight;
    } else {
      currentOffset = 0;
      for (let i = 0; i < start; i++) {
        currentOffset += getItemHeight(items[i], i);
      }
    }

    for (let i = start; i < end; i++) {
      const height = getItemHeight(items[i], i);
      
      virtualItems.push({
        index: i,
        item: items[i],
        style: {
          position: 'absolute' as const,
          top: currentOffset,
          left: 0,
          right: 0,
          height: typeof itemHeight === 'number' ? itemHeight : undefined,
        },
      });
      
      currentOffset += height;
    }

    return { virtualItems, startIndex: start, endIndex: end };
  }, [items, itemHeight, scrollTop, containerHeight, overscan]);

  // Handle scroll
  useEffect(() => {
    const element = scrollElement || containerRef.current?.parentElement;
    if (!element) return;

    const handleScroll = () => {
      setScrollTop(element.scrollTop);
    };

    // Set initial scroll position
    setScrollTop(element.scrollTop);

    // Set container height
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });
    
    resizeObserver.observe(element);
    element.addEventListener('scroll', handleScroll);

    return () => {
      resizeObserver.disconnect();
      element.removeEventListener('scroll', handleScroll);
    };
  }, [scrollElement]);

  // Scroll to index
  const scrollToIndex = useCallback((index: number) => {
    const element = scrollElement || containerRef.current?.parentElement;
    if (!element) return;

    let offset = 0;
    
    if (typeof itemHeight === 'number') {
      offset = index * itemHeight;
    } else {
      for (let i = 0; i < index && i < items.length; i++) {
        offset += itemHeight(items[i], i);
      }
    }

    element.scrollTo({
      top: offset,
      behavior: 'smooth',
    });
  }, [items, itemHeight, scrollElement]);

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    height: totalHeight,
    width: '100%',
  };

  return {
    virtualItems,
    totalHeight,
    containerStyle,
    scrollToIndex,
  };
}

export default useVirtualList;
