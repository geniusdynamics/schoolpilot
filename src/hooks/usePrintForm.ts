// ABOUTME: usePrintForm hook for print functionality and optimization
// ABOUTME: Provides print triggering, preview, and print-specific utilities

import { useState, useCallback, useEffect, useRef } from 'react';

export interface UsePrintFormOptions {
  /** Document title for print */
  title?: string;
  /** Callback before print starts */
  onBeforePrint?: () => void | Promise<void>;
  /** Callback after print completes */
  onAfterPrint?: () => void;
  /** Callback on print error */
  onError?: (error: Error) => void;
  /** Prepare content before printing */
  prepareContent?: () => void | Promise<void>;
}

export interface UsePrintFormReturn {
  /** Whether currently printing */
  isPrinting: boolean;
  /** Trigger print dialog */
  print: () => Promise<void>;
  /** Print preview mode (can be used to show print styles) */
  isPreviewMode: boolean;
  /** Toggle print preview mode */
  togglePreview: () => void;
  /** Enter print preview mode */
  enterPreview: () => void;
  /** Exit print preview mode */
  exitPreview: () => void;
}

/**
 * usePrintForm - Hook for form printing functionality
 *
 * Provides print triggering, preview mode, and print event handling.
 * Works with PrintForm component for optimized printing.
 *
 * @example
 * const { print, isPrinting, isPreviewMode, togglePreview } = usePrintForm({
 *   title: 'Student Registration Form',
 *   onBeforePrint: () => {
 *     // Hide sensitive data
 *     setHideSensitiveInfo(true);
 *   },
 *   onAfterPrint: () => {
 *     // Restore state
 *     setHideSensitiveInfo(false);
 *   },
 * });
 *
 * return (
 *   <div>
 *     <Button onClick={togglePreview}>
 *       {isPreviewMode ? 'Exit Preview' : 'Preview'}
 *     </Button>
 *     <Button onClick={print} loading={isPrinting}>
 *       Print
 *     </Button>
 *   </div>
 * );
 */
export function usePrintForm({
  title,
  onBeforePrint,
  onAfterPrint,
  onError,
  prepareContent,
}: UsePrintFormOptions = {}): UsePrintFormReturn {
  const [isPrinting, setIsPrinting] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const originalTitleRef = useRef<string>('');

  // Print handler
  const print = useCallback(async () => {
    setIsPrinting(true);

    try {
      // Prepare content if needed
      if (prepareContent) {
        await prepareContent();
      }

      // Call before print callback
      if (onBeforePrint) {
        await onBeforePrint();
      }

      // Set document title for print
      if (title) {
        originalTitleRef.current = document.title;
        document.title = title;
      }

      // Small delay to ensure DOM is ready
      await new Promise(resolve => setTimeout(resolve, 100));

      // Trigger print
      window.print();

    } catch (error) {
      onError?.(error instanceof Error ? error : new Error(String(error)));
    } finally {
      // Restore original title
      if (title && originalTitleRef.current) {
        document.title = originalTitleRef.current;
      }

      setIsPrinting(false);

      // Call after print callback
      if (onAfterPrint) {
        onAfterPrint();
      }
    }
  }, [title, onBeforePrint, onAfterPrint, onError, prepareContent]);

  // Preview mode handlers
  const enterPreview = useCallback(() => {
    setIsPreviewMode(true);
    document.body.classList.add('print-preview-mode');
  }, []);

  const exitPreview = useCallback(() => {
    setIsPreviewMode(false);
    document.body.classList.remove('print-preview-mode');
  }, []);

  const togglePreview = useCallback(() => {
    if (isPreviewMode) {
      exitPreview();
    } else {
      enterPreview();
    }
  }, [isPreviewMode, enterPreview, exitPreview]);

  // Handle browser print events
  useEffect(() => {
    const handleBeforePrint = () => {
      setIsPrinting(true);
      if (onBeforePrint) {
        onBeforePrint();
      }
    };

    const handleAfterPrint = () => {
      setIsPrinting(false);
      if (onAfterPrint) {
        onAfterPrint();
      }
    };

    // Modern browsers use beforeprint/afterprint events
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [onBeforePrint, onAfterPrint]);

  // Cleanup preview mode on unmount
  useEffect(() => {
    return () => {
      document.body.classList.remove('print-preview-mode');
    };
  }, []);

  return {
    isPrinting,
    print,
    isPreviewMode,
    togglePreview,
    enterPreview,
    exitPreview,
  };
}

export default usePrintForm;
