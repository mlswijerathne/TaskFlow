'use client';

import { useCallback, useState, useRef, useEffect } from 'react';
import { ViewType } from '@/types/database';

// ============================================================================
// Types
// ============================================================================
export interface DragData {
  type: 'card' | 'column' | 'event' | 'task' | 'row';
  id: string;
  sourceView: ViewType;
  sourceContainerId?: string;
  originalPosition?: number;
  data?: Record<string, unknown>;
}

export interface DropTarget {
  type: 'column' | 'date' | 'position' | 'row';
  id: string;
  position?: number;
  date?: Date;
}

export interface DragState {
  isDragging: boolean;
  dragData: DragData | null;
  dropTarget: DropTarget | null;
  dragPreview: { x: number; y: number } | null;
}

export interface DragHandlers {
  onDragStart: (data: DragData) => void;
  onDragMove: (x: number, y: number) => void;
  onDragEnd: () => void;
  onDragCancel: () => void;
  setDropTarget: (target: DropTarget | null) => void;
}

export interface DragResult {
  dragData: DragData;
  dropTarget: DropTarget;
}

// ============================================================================
// useDragAndDrop Hook
// ============================================================================
export function useDragAndDrop(
  onDrop?: (result: DragResult) => Promise<void>
): [DragState, DragHandlers] {
  const [state, setState] = useState<DragState>({
    isDragging: false,
    dragData: null,
    dropTarget: null,
    dragPreview: null,
  });

  const handleDragStart = useCallback((data: DragData) => {
    setState({
      isDragging: true,
      dragData: data,
      dropTarget: null,
      dragPreview: null,
    });

    // Add dragging class to body for global cursor
    document.body.classList.add('dragging');
  }, []);

  const handleDragMove = useCallback((x: number, y: number) => {
    setState(prev => ({
      ...prev,
      dragPreview: { x, y },
    }));
  }, []);

  const handleDragEnd = useCallback(async () => {
    const { dragData, dropTarget } = state;

    if (dragData && dropTarget && onDrop) {
      try {
        await onDrop({ dragData, dropTarget });
      } catch (error) {
        console.error('Drop failed:', error);
      }
    }

    setState({
      isDragging: false,
      dragData: null,
      dropTarget: null,
      dragPreview: null,
    });

    document.body.classList.remove('dragging');
  }, [state, onDrop]);

  const handleDragCancel = useCallback(() => {
    setState({
      isDragging: false,
      dragData: null,
      dropTarget: null,
      dragPreview: null,
    });

    document.body.classList.remove('dragging');
  }, []);

  const setDropTarget = useCallback((target: DropTarget | null) => {
    setState(prev => ({
      ...prev,
      dropTarget: target,
    }));
  }, []);

  // Handle escape key to cancel drag
  useEffect(() => {
    if (!state.isDragging) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDragCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.isDragging, handleDragCancel]);

  return [
    state,
    {
      onDragStart: handleDragStart,
      onDragMove: handleDragMove,
      onDragEnd: handleDragEnd,
      onDragCancel: handleDragCancel,
      setDropTarget,
    },
  ];
}

// ============================================================================
// useDropZone Hook
// ============================================================================
export interface UseDropZoneOptions {
  accept: DragData['type'][];
  onDragEnter?: () => void;
  onDragLeave?: () => void;
  onDrop?: (data: DragData) => Promise<void>;
}

export function useDropZone(
  dragState: DragState,
  handlers: DragHandlers,
  target: DropTarget,
  options: UseDropZoneOptions
) {
  const [isOver, setIsOver] = useState(false);
  const elementRef = useRef<HTMLElement | null>(null);

  const canDrop = dragState.isDragging && 
    dragState.dragData && 
    options.accept.includes(dragState.dragData.type);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!canDrop) return;
    
    setIsOver(true);
    handlers.setDropTarget(target);
    options.onDragEnter?.();
  }, [canDrop, handlers, target, options]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!canDrop) return;
    
    handlers.onDragMove(e.clientX, e.clientY);
  }, [canDrop, handlers]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Check if we're leaving to a child element
    if (elementRef.current?.contains(e.relatedTarget as Node)) return;
    
    setIsOver(false);
    handlers.setDropTarget(null);
    options.onDragLeave?.();
  }, [handlers, options]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    
    if (dragState.dragData && options.onDrop) {
      await options.onDrop(dragState.dragData);
    }
    
    handlers.onDragEnd();
  }, [dragState.dragData, options, handlers]);

  return {
    ref: (element: HTMLElement | null) => {
      elementRef.current = element;
    },
    isOver,
    canDrop,
    dropProps: {
      onDragEnter: handleDragEnter,
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
  };
}

// ============================================================================
// useDraggable Hook
// ============================================================================
export interface UseDraggableOptions {
  data: DragData;
  disabled?: boolean;
}

export function useDraggable(
  handlers: DragHandlers,
  options: UseDraggableOptions
) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = useCallback((e: React.DragEvent) => {
    if (options.disabled) {
      e.preventDefault();
      return;
    }

    // Set drag data for native DnD
    e.dataTransfer.setData('application/json', JSON.stringify(options.data));
    e.dataTransfer.effectAllowed = 'move';

    // Create custom drag image
    if (e.currentTarget instanceof HTMLElement) {
      const rect = e.currentTarget.getBoundingClientRect();
      const dragImage = e.currentTarget.cloneNode(true) as HTMLElement;
      dragImage.style.position = 'absolute';
      dragImage.style.top = '-1000px';
      dragImage.style.opacity = '0.8';
      document.body.appendChild(dragImage);
      e.dataTransfer.setDragImage(dragImage, e.clientX - rect.left, e.clientY - rect.top);
      
      // Clean up after drag starts
      requestAnimationFrame(() => {
        document.body.removeChild(dragImage);
      });
    }

    setIsDragging(true);
    handlers.onDragStart(options.data);
  }, [options.disabled, options.data, handlers]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    if (e.clientX !== 0 || e.clientY !== 0) {
      handlers.onDragMove(e.clientX, e.clientY);
    }
  }, [handlers]);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    setIsDragging(false);
    if (e.dataTransfer.dropEffect === 'none') {
      handlers.onDragCancel();
    } else {
      handlers.onDragEnd();
    }
  }, [handlers]);

  return {
    isDragging,
    dragProps: {
      draggable: !options.disabled,
      onDragStart: handleDragStart,
      onDrag: handleDrag,
      onDragEnd: handleDragEnd,
    },
  };
}

// ============================================================================
// View-specific Drop Handlers
// ============================================================================

/**
 * Handle drops in Kanban view (card to column)
 */
export function createKanbanDropHandler(
  onMoveCard: (cardId: string, columnId: string, position: number) => Promise<void>
) {
  return async (result: DragResult) => {
    if (result.dragData.type !== 'card') return;
    if (result.dropTarget.type !== 'column') return;

    await onMoveCard(
      result.dragData.id,
      result.dropTarget.id,
      result.dropTarget.position || 0
    );
  };
}

/**
 * Handle drops in Calendar view (event to date)
 */
export function createCalendarDropHandler(
  onReschedule: (cardId: string, newDate: Date) => Promise<void>
) {
  return async (result: DragResult) => {
    if (result.dragData.type !== 'event' && result.dragData.type !== 'card') return;
    if (result.dropTarget.type !== 'date') return;
    if (!result.dropTarget.date) return;

    await onReschedule(result.dragData.id, result.dropTarget.date);
  };
}

/**
 * Handle drops in Gantt view (task resize/move)
 */
export function createGanttDropHandler(
  onUpdateTask: (taskId: string, updates: { start_date?: Date; end_date?: Date }) => Promise<void>
) {
  return async (result: DragResult) => {
    if (result.dragData.type !== 'task') return;
    if (!result.dropTarget.date) return;

    const updates: { start_date?: Date; end_date?: Date } = {};
    
    // Determine if this is a start or end date update based on drag data
    if (result.dragData.data?.resizeEdge === 'start') {
      updates.start_date = result.dropTarget.date;
    } else if (result.dragData.data?.resizeEdge === 'end') {
      updates.end_date = result.dropTarget.date;
    } else {
      // Moving the whole task - calculate offset and update both dates
      const originalStart = result.dragData.data?.originalStart as Date | undefined;
      const originalEnd = result.dragData.data?.originalEnd as Date | undefined;
      
      if (originalStart && originalEnd) {
        const duration = originalEnd.getTime() - originalStart.getTime();
        updates.start_date = result.dropTarget.date;
        updates.end_date = new Date(result.dropTarget.date.getTime() + duration);
      }
    }

    await onUpdateTask(result.dragData.id, updates);
  };
}

/**
 * Handle drops in Table view (row reorder)
 */
export function createTableDropHandler(
  onReorderRow: (rowId: string, newPosition: number) => Promise<void>
) {
  return async (result: DragResult) => {
    if (result.dragData.type !== 'row') return;
    if (result.dropTarget.type !== 'position') return;
    if (result.dropTarget.position === undefined) return;

    await onReorderRow(result.dragData.id, result.dropTarget.position);
  };
}

// ============================================================================
// Drag Preview Component
// ============================================================================
export interface DragPreviewProps {
  state: DragState;
  children: React.ReactNode;
}

export function DragPreview({ state, children }: DragPreviewProps) {
  if (!state.isDragging || !state.dragPreview) return null;

  return (
    <div
      className="fixed pointer-events-none z-50"
      style={{
        left: state.dragPreview.x,
        top: state.dragPreview.y,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Cross-View Drag Context
// ============================================================================
export interface CrossViewDragContextValue {
  state: DragState;
  handlers: DragHandlers;
  registerView: (viewType: ViewType, onDrop: (result: DragResult) => Promise<void>) => void;
  unregisterView: (viewType: ViewType) => void;
}

// This would be used with React Context for cross-view drag support
// Example usage:
// <CrossViewDragProvider>
//   <BoardViewToolbar />
//   <CurrentViewComponent />
// </CrossViewDragProvider>

const dndUtils = {
  useDragAndDrop,
  useDropZone,
  useDraggable,
  createKanbanDropHandler,
  createCalendarDropHandler,
  createGanttDropHandler,
  createTableDropHandler,
  DragPreview,
};

export default dndUtils;
