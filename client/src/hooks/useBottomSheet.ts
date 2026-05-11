import { useState, useEffect, useRef } from 'react';

const CLOSE_THRESHOLD = 80;

interface DragHandleProps {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
}

export interface BottomSheetControls {
  mounted: boolean;
  show: boolean;
  isDragging: boolean;
  dragY: number;
  handleClose: () => void;
  dragHandleProps: DragHandleProps;
  backdropOpacity: number;
}

export function useBottomSheet(open: boolean, onClose: () => void): BottomSheetControls {
  const [show, setShow] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragY, setDragY] = useState(0);
  const startYRef = useRef(0);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => setShow(true));
    return () => cancelAnimationFrame(raf);
  }, [open]);

  useEffect(() => {
    return () => {
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    };
  }, []);

  const handleClose = (): void => {
    setShow(false);
    setIsLeaving(true);
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    leaveTimerRef.current = setTimeout(() => {
      setIsLeaving(false);
    }, 300);
    onClose();
  };

  const handleDragStart = (e: React.PointerEvent): void => {
    startYRef.current = e.clientY;
    setIsDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleDragMove = (e: React.PointerEvent): void => {
    if (!isDragging) return;
    setDragY(Math.max(0, e.clientY - startYRef.current));
  };

  const handleDragEnd = (): void => {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragY > CLOSE_THRESHOLD) {
      setDragY(0);
      handleClose();
    } else {
      setDragY(0);
    }
  };

  return {
    mounted: open || show || isLeaving,
    show,
    isDragging,
    dragY,
    handleClose,
    dragHandleProps: {
      onPointerDown: handleDragStart,
      onPointerMove: handleDragMove,
      onPointerUp: handleDragEnd,
      onPointerCancel: handleDragEnd,
    },
    backdropOpacity: show ? Math.max(0, 0.5 - dragY / 400) : 0,
  };
}
