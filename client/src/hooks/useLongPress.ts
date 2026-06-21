import { useCallback, useRef } from 'react';
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';

interface UseLongPressOptions {
  delay?: number;
  disabled?: boolean;
  onLongPress: () => void;
}

const MOVE_THRESHOLD_PX = 10;

export function useLongPress({ delay = 500, disabled = false, onLongPress }: UseLongPressOptions) {
  const timerRef = useRef<number | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const triggeredRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent) => {
      if (disabled || event.pointerType === 'mouse') return;

      startPosRef.current = { x: event.clientX, y: event.clientY };
      clearTimer();
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        triggeredRef.current = true;
        onLongPress();
        if ('vibrate' in navigator) {
          navigator.vibrate(10);
        }
      }, delay);
    },
    [clearTimer, delay, disabled, onLongPress]
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent) => {
      if (!startPosRef.current || timerRef.current === null) return;

      const deltaX = event.clientX - startPosRef.current.x;
      const deltaY = event.clientY - startPosRef.current.y;
      if (Math.hypot(deltaX, deltaY) > MOVE_THRESHOLD_PX) {
        clearTimer();
      }
    },
    [clearTimer]
  );

  const onPointerUp = useCallback(() => {
    startPosRef.current = null;
    clearTimer();
  }, [clearTimer]);

  const consumeLongPress = useCallback(() => {
    if (!triggeredRef.current) return false;
    triggeredRef.current = false;
    return true;
  }, []);

  const onContextMenu = useCallback((event: ReactMouseEvent) => {
    event.preventDefault();
  }, []);

  return {
    longPressHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
      onContextMenu,
    },
    consumeLongPress,
  };
}
