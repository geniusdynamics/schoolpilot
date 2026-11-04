// ABOUTME: Anchored-popup geometry for dropdowns: pin a popup to its trigger with fixed
// ABOUTME: positioning so no overflow-hidden ancestor can clip it, flipping and clamping to the viewport.

import { useCallback, useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';

/** The margin between the trigger's edge and the popup, in pixels. */
const ANCHOR_MARGIN = 6;
/** The breathing room kept between the popup and the viewport edges. */
const VIEWPORT_PADDING = 8;
/** Above every card, sticky bar and modal backdrop the app uses (all z-50). */
const POPUP_Z_INDEX = 60;

export interface AnchorRect {
  readonly top: number;
  readonly left: number;
  readonly bottom: number;
  readonly right: number;
  readonly width: number;
  readonly height: number;
}

export interface PopupPosition {
  /** Fixed-viewport top of the popup, already clamped inside the viewport. */
  readonly top: number;
  /** Fixed-viewport left of the popup, already clamped inside the viewport. */
  readonly left: number;
  readonly placement: 'bottom' | 'top';
  /** The height the popup may use on the chosen side, so its list can scroll instead of overflow. */
  readonly maxHeight: number;
}

/**
 * Where a popup anchored to `trigger` goes: below it when it fits, above it when it does not,
 * clamped horizontally so it never leaves the viewport. Pure geometry — no DOM — so it is
 * testable without layout.
 */
export function computeAnchorPosition(
  trigger: AnchorRect,
  popup: { readonly width: number; readonly height: number },
  viewport: { readonly width: number; readonly height: number },
  options: { readonly margin?: number; readonly padding?: number } = {}
): PopupPosition {
  const margin = options.margin ?? ANCHOR_MARGIN;
  const padding = options.padding ?? VIEWPORT_PADDING;

  const roomBelow = viewport.height - trigger.bottom - margin - padding;
  const roomAbove = trigger.top - margin - padding;
  const below = roomBelow >= popup.height || roomBelow >= roomAbove;

  const sideRoom = below ? roomBelow : roomAbove;
  const maxHeight = Math.max(0, Math.floor(sideRoom));

  const preferredTop = below ? trigger.bottom + margin : trigger.top - margin - popup.height;
  const top = Math.min(
    Math.max(preferredTop, padding),
    Math.max(padding, viewport.height - popup.height - padding)
  );

  const maxLeft = viewport.width - padding - popup.width;
  const left = Math.max(padding, Math.min(trigger.left, Math.max(padding, maxLeft)));

  return { top: Math.round(top), left: Math.round(left), placement: below ? 'bottom' : 'top', maxHeight };
}

/** The style a portalled popup needs: fixed to the viewport, above every surface, trigger-wide. */
export interface AnchoredPopupStyle extends CSSProperties {
  readonly position: 'fixed';
  readonly top: number;
  readonly left: number;
  readonly zIndex: number;
  readonly width: number;
  readonly maxHeight: number | undefined;
}

export interface AnchoredPopup {
  readonly style: AnchoredPopupStyle;
  readonly placement: 'bottom' | 'top';
  /** Re-measures now (call after the popup content changes size). */
  readonly reposition: () => void;
}

/**
 * Pins `popupRef` to `triggerRef` while `open`, re-measuring on scroll (capture, so nested scroll
 * containers are caught wherever they live) and on resize. In jsdom every rect is 0, so tests get
 * a deterministic 0,0 anchor instead of crashing.
 */
export function useAnchoredPopup(
  open: boolean,
  triggerRef: RefObject<HTMLElement | null>,
  popupRef: RefObject<HTMLElement | null>,
  options: { readonly matchWidth?: boolean; readonly minWidth?: number } = {}
): AnchoredPopup {
  const matchWidth = options.matchWidth ?? true;
  const [anchor, setAnchor] = useState<{ top: number; left: number; width: number; maxHeight: number; placement: 'bottom' | 'top' }>({
    top: 0,
    left: 0,
    width: 0,
    maxHeight: 0,
    placement: 'bottom',
  });
  const frame = useRef<number | null>(null);

  const measure = useCallback(() => {
    const trigger = triggerRef.current;
    const popup = popupRef.current;
    if (!trigger || !popup) return;
    const rect = trigger.getBoundingClientRect();
    const popupRect = popup.getBoundingClientRect();
    const position = computeAnchorPosition(
      rect,
      { width: popupRect.width, height: popupRect.height },
      { width: window.innerWidth, height: window.innerHeight }
    );
    const width = matchWidth ? rect.width : popupRect.width;
    setAnchor({
      top: position.top,
      left: position.left,
      width: Math.max(width, options.minWidth ?? 0),
      maxHeight: position.maxHeight,
      placement: position.placement,
    });
  }, [matchWidth, options.minWidth, popupRef, triggerRef]);

  const reposition = useCallback(() => {
    if (frame.current !== null) return;
    frame.current = window.requestAnimationFrame(() => {
      frame.current = null;
      measure();
    });
  }, [measure]);

  useEffect(() => {
    if (!open) return;
    measure();
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
      if (frame.current !== null) {
        window.cancelAnimationFrame(frame.current);
        frame.current = null;
      }
    };
  }, [open, measure, reposition]);

  return {
    style: {
      position: 'fixed',
      top: anchor.top,
      left: anchor.left,
      zIndex: POPUP_Z_INDEX,
      width: anchor.width,
      maxHeight: anchor.maxHeight || undefined,
    },
    placement: anchor.placement,
    reposition,
  };
}
