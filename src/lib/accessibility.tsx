'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// ============================================================================
// Types
// ============================================================================
export interface FocusTrapOptions {
  enabled?: boolean;
  initialFocus?: HTMLElement | null;
  returnFocus?: boolean;
}

export interface KeyboardNavigationOptions {
  orientation?: 'horizontal' | 'vertical' | 'grid';
  wrap?: boolean;
  onSelect?: (element: HTMLElement) => void;
  onEscape?: () => void;
}

export interface AnnouncementOptions {
  priority?: 'polite' | 'assertive';
  clearAfter?: number;
}

// ============================================================================
// ARIA Labels & Descriptions
// ============================================================================
export const ARIA_LABELS = {
  // Views
  kanbanView: 'Kanban board view',
  calendarView: 'Calendar view',
  ganttView: 'Timeline view',
  tableView: 'Table view',
  
  // Kanban
  kanbanColumn: (name: string, count: number) => 
    `${name} column, ${count} card${count === 1 ? '' : 's'}`,
  kanbanCard: (title: string, column: string) => 
    `Card: ${title}, in ${column}`,
  addCard: (column: string) => `Add card to ${column}`,
  moveCard: (title: string) => `Move card ${title}`,
  
  // Calendar
  calendarDay: (date: string, count: number) => 
    `${date}, ${count} event${count === 1 ? '' : 's'}`,
  calendarEvent: (title: string, time: string) => 
    `${title} at ${time}`,
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  todayButton: 'Go to today',
  
  // Gantt
  ganttTask: (title: string, start: string, end: string, progress: number) => 
    `Task: ${title}, from ${start} to ${end}, ${progress}% complete`,
  resizeStart: 'Resize start date',
  resizeEnd: 'Resize end date',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  
  // Table
  sortColumn: (column: string, direction: 'ascending' | 'descending' | 'none') => {
    if (direction === 'none') return `Sort by ${column}`;
    return `Sorted by ${column} ${direction}, click to change`;
  },
  selectRow: (title: string) => `Select ${title}`,
  selectAll: 'Select all rows',
  editCell: (column: string, value: string) => `Edit ${column}: ${value}`,
  
  // Filters
  filterByLabel: 'Filter by label',
  filterByAssignee: 'Filter by assignee',
  filterByPriority: 'Filter by priority',
  filterByDate: 'Filter by date range',
  clearFilters: 'Clear all filters',
  activeFilters: (count: number) => `${count} filter${count === 1 ? '' : 's'} active`,
  
  // Actions
  closeModal: 'Close modal',
  openMenu: 'Open menu',
  saveChanges: 'Save changes',
  cancel: 'Cancel',
  delete: 'Delete',
  edit: 'Edit',
};

// ============================================================================
// Screen Reader Announcements
// ============================================================================
let announcerElement: HTMLElement | null = null;

function getAnnouncer(): HTMLElement {
  if (announcerElement) return announcerElement;
  
  announcerElement = document.createElement('div');
  announcerElement.id = 'sr-announcer';
  announcerElement.setAttribute('role', 'status');
  announcerElement.setAttribute('aria-live', 'polite');
  announcerElement.setAttribute('aria-atomic', 'true');
  announcerElement.className = 'sr-only';
  announcerElement.style.cssText = `
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  `;
  document.body.appendChild(announcerElement);
  
  return announcerElement;
}

export function announce(message: string, options: AnnouncementOptions = {}) {
  const { priority = 'polite', clearAfter = 5000 } = options;
  const announcer = getAnnouncer();
  
  // Update aria-live based on priority
  announcer.setAttribute('aria-live', priority);
  
  // Clear and set message (helps with repeated announcements)
  announcer.textContent = '';
  requestAnimationFrame(() => {
    announcer.textContent = message;
  });
  
  // Auto-clear
  if (clearAfter > 0) {
    setTimeout(() => {
      if (announcer.textContent === message) {
        announcer.textContent = '';
      }
    }, clearAfter);
  }
}

// ============================================================================
// Focus Management Hook
// ============================================================================
export function useFocusTrap(options: FocusTrapOptions = {}) {
  const { enabled = true, initialFocus, returnFocus = true } = options;
  const containerRef = useRef<HTMLElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    // Store previous focus
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Get all focusable elements
    const getFocusableElements = () => {
      if (!containerRef.current) return [];
      return Array.from(
        containerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);
    };

    // Initial focus
    const focusableElements = getFocusableElements();
    if (initialFocus) {
      initialFocus.focus();
    } else if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    // Handle tab key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      
      const elements = getFocusableElements();
      if (elements.length === 0) return;

      const firstElement = elements[0];
      const lastElement = elements[elements.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      
      // Return focus
      if (returnFocus && previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [enabled, initialFocus, returnFocus]);

  return containerRef;
}

// ============================================================================
// Keyboard Navigation Hook
// ============================================================================
export function useKeyboardNavigation(options: KeyboardNavigationOptions = {}) {
  const { 
    orientation = 'vertical', 
    wrap = true, 
    onSelect, 
    onEscape 
  } = options;
  
  const containerRef = useRef<HTMLElement | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const getNavigableElements = useCallback(() => {
    if (!containerRef.current) return [];
    return Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(
        '[data-navigable="true"]'
      )
    ).filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const elements = getNavigableElements();
    if (elements.length === 0) return;

    const prevKey = orientation === 'horizontal' ? 'ArrowLeft' : 'ArrowUp';
    const nextKey = orientation === 'horizontal' ? 'ArrowRight' : 'ArrowDown';
    const currentIndex = focusedIndex >= 0 ? focusedIndex : 0;

    let newIndex = currentIndex;
    let handled = false;

    switch (e.key) {
      case prevKey:
        newIndex = currentIndex - 1;
        if (newIndex < 0) {
          newIndex = wrap ? elements.length - 1 : 0;
        }
        handled = true;
        break;
      
      case nextKey:
        newIndex = currentIndex + 1;
        if (newIndex >= elements.length) {
          newIndex = wrap ? 0 : elements.length - 1;
        }
        handled = true;
        break;
      
      case 'Home':
        newIndex = 0;
        handled = true;
        break;
      
      case 'End':
        newIndex = elements.length - 1;
        handled = true;
        break;
      
      case 'Enter':
      case ' ':
        if (elements[currentIndex]) {
          onSelect?.(elements[currentIndex]);
        }
        handled = true;
        break;
      
      case 'Escape':
        onEscape?.();
        handled = true;
        break;
    }

    if (handled) {
      e.preventDefault();
      setFocusedIndex(newIndex);
      elements[newIndex]?.focus();
    }
  }, [focusedIndex, getNavigableElements, onEscape, onSelect, orientation, wrap]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    containerRef,
    focusedIndex,
    setFocusedIndex,
    getNavigableElements,
  };
}

// ============================================================================
// Roving Tab Index Hook
// ============================================================================
export function useRovingTabIndex(itemCount: number) {
  const [activeIndex, setActiveIndex] = useState(0);

  const getTabIndex = useCallback((index: number) => {
    return index === activeIndex ? 0 : -1;
  }, [activeIndex]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
    let newIndex = index;

    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        newIndex = (index + 1) % itemCount;
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        newIndex = (index - 1 + itemCount) % itemCount;
        break;
      case 'Home':
        newIndex = 0;
        break;
      case 'End':
        newIndex = itemCount - 1;
        break;
      default:
        return;
    }

    e.preventDefault();
    setActiveIndex(newIndex);
  }, [itemCount]);

  return {
    activeIndex,
    setActiveIndex,
    getTabIndex,
    handleKeyDown,
  };
}

// ============================================================================
// Skip Link Component
// ============================================================================
export function SkipLink({ targetId, children }: { targetId: string; children: React.ReactNode }) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 
        focus:z-50 focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white 
        focus:rounded-lg focus:shadow-lg"
    >
      {children}
    </a>
  );
}

// ============================================================================
// Reduced Motion Hook
// ============================================================================
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}

// ============================================================================
// High Contrast Hook
// ============================================================================
export function useHighContrast(): boolean {
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(forced-colors: active)');
    setHighContrast(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => {
      setHighContrast(e.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return highContrast;
}

// ============================================================================
// Announce Card Movement
// ============================================================================
export function announceCardMoved(
  cardTitle: string, 
  fromColumn: string, 
  toColumn: string, 
  position: number
) {
  announce(
    `Card "${cardTitle}" moved from ${fromColumn} to ${toColumn}, position ${position + 1}`,
    { priority: 'assertive' }
  );
}

export function announceCardCreated(cardTitle: string, column: string) {
  announce(`Card "${cardTitle}" created in ${column}`, { priority: 'polite' });
}

export function announceCardDeleted(cardTitle: string) {
  announce(`Card "${cardTitle}" deleted`, { priority: 'polite' });
}

export function announceViewChanged(viewName: string) {
  announce(`Switched to ${viewName} view`, { priority: 'polite' });
}

export function announceFilterApplied(filterType: string, count: number) {
  announce(`Filter applied: ${filterType}. Showing ${count} items`, { priority: 'polite' });
}

export function announceFiltersCleared() {
  announce('All filters cleared', { priority: 'polite' });
}

// ============================================================================
// Export
// ============================================================================
export default {
  ARIA_LABELS,
  announce,
  useFocusTrap,
  useKeyboardNavigation,
  useRovingTabIndex,
  useReducedMotion,
  useHighContrast,
  SkipLink,
  announceCardMoved,
  announceCardCreated,
  announceCardDeleted,
  announceViewChanged,
  announceFilterApplied,
  announceFiltersCleared,
};
