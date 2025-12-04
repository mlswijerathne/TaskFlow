'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  BoardViewType,
  ViewState,
  DEFAULT_VIEW_STATE,
  CardPriority,
  CalendarViewSettings,
  GanttViewSettings,
  TableViewSettings,
} from '@/types/database';

interface UseViewStateReturn {
  viewState: ViewState;
  currentView: BoardViewType;
  setCurrentView: (view: BoardViewType) => void;
  setFilters: (filters: Partial<ViewState['filters']>) => void;
  clearFilters: () => void;
  setCalendarSettings: (settings: Partial<CalendarViewSettings>) => void;
  setGanttSettings: (settings: Partial<GanttViewSettings>) => void;
  setTableSettings: (settings: Partial<TableViewSettings>) => void;
  savePreferences: () => Promise<void>;
  loadPreferences: () => Promise<void>;
  hasActiveFilters: boolean;
  shareableUrl: string;
}

export function useViewState(boardId: string): UseViewStateReturn {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [viewState, setViewState] = useState<ViewState>(() => {
    // Initialize from URL params if available
    const view = searchParams.get('view') as BoardViewType | null;
    const labels = searchParams.get('labels')?.split(',').filter(Boolean) || [];
    const assignees = searchParams.get('assignees')?.split(',').filter(Boolean) || [];
    const priorities = searchParams.get('priorities')?.split(',').filter(Boolean) as CardPriority[] || [];
    const search = searchParams.get('search') || '';
    const columns = searchParams.get('columns')?.split(',').filter(Boolean) || [];

    return {
      ...DEFAULT_VIEW_STATE,
      currentView: view || DEFAULT_VIEW_STATE.currentView,
      filters: {
        ...DEFAULT_VIEW_STATE.filters,
        labels,
        assignees,
        priorities,
        search,
        columns,
      },
    };
  });

  // Use ref for initialization tracking to avoid triggering effect on first render
  const isInitializedRef = useRef(false);
  useEffect(() => {
    isInitializedRef.current = true;
  }, []);

  // Update URL when view state changes (after initialization)
  useEffect(() => {
    if (!isInitializedRef.current || !viewState?.filters) return;

    const params = new URLSearchParams();
    const filters = viewState.filters;
    
    if (viewState.currentView !== 'board') {
      params.set('view', viewState.currentView);
    }
    if ((filters.labels?.length || 0) > 0) {
      params.set('labels', filters.labels.join(','));
    }
    if ((filters.assignees?.length || 0) > 0) {
      params.set('assignees', filters.assignees.join(','));
    }
    if ((filters.priorities?.length || 0) > 0) {
      params.set('priorities', filters.priorities.join(','));
    }
    if (filters.search) {
      params.set('search', filters.search);
    }
    if ((filters.columns?.length || 0) > 0) {
      params.set('columns', filters.columns.join(','));
    }

    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
    
    router.replace(newUrl, { scroll: false });
  }, [viewState, pathname, router]);

  // Set current view
  const setCurrentView = useCallback((view: BoardViewType) => {
    setViewState((prev) => ({ ...prev, currentView: view }));
  }, []);

  // Set filters
  const setFilters = useCallback((filters: Partial<ViewState['filters']>) => {
    setViewState((prev) => ({
      ...prev,
      filters: { ...prev.filters, ...filters },
    }));
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setViewState((prev) => ({
      ...prev,
      filters: DEFAULT_VIEW_STATE.filters,
    }));
  }, []);

  // Set calendar settings
  const setCalendarSettings = useCallback((settings: Partial<CalendarViewSettings>) => {
    setViewState((prev) => ({
      ...prev,
      calendarSettings: { ...prev.calendarSettings, ...settings },
    }));
  }, []);

  // Set gantt settings
  const setGanttSettings = useCallback((settings: Partial<GanttViewSettings>) => {
    setViewState((prev) => ({
      ...prev,
      ganttSettings: { ...prev.ganttSettings, ...settings },
    }));
  }, []);

  // Set table settings
  const setTableSettings = useCallback((settings: Partial<TableViewSettings>) => {
    setViewState((prev) => ({
      ...prev,
      tableSettings: { ...prev.tableSettings, ...settings },
    }));
  }, []);

  // Save preferences to database
  const savePreferences = useCallback(async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_view_preferences')
        .upsert({
          user_id: user.id,
          board_id: boardId,
          default_view: viewState.currentView,
          calendar_settings: viewState.calendarSettings as unknown as Record<string, unknown>,
          gantt_settings: viewState.ganttSettings as unknown as Record<string, unknown>,
          table_settings: viewState.tableSettings as unknown as Record<string, unknown>,
          filters: viewState.filters as unknown as Record<string, unknown>,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        // Silently ignore if table doesn't exist or permission issues - preferences are optional
        if (error.code === '406' || error.message?.includes('406')) {
          return;
        }
        console.warn('Could not save preferences:', error.code, error.message);
      }
    } catch (err) {
      console.warn('Error saving view preferences:', err);
    }
  }, [user, boardId, viewState]);

  // Load preferences from database
  const loadPreferences = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_view_preferences')
        .select('*')
        .eq('user_id', user.id)
        .eq('board_id', boardId)
        .maybeSingle();

      // PGRST116 = not found, 406/no rows = table or data doesn't exist
      if (error) {
        // Silently ignore table-not-found errors - preferences are optional
        if (error.code === 'PGRST116' || error.code === '406' || error.message?.includes('406')) {
          return;
        }
        console.warn('View preferences not available:', error.code, error.message);
        return;
      }

      if (data) {
        // Only apply saved preferences if no URL params override them
        const hasUrlParams = searchParams.has('view') || searchParams.has('labels') || 
          searchParams.has('assignees') || searchParams.has('priorities');

        if (!hasUrlParams) {
          setViewState((prev) => ({
            ...prev,
            currentView: data.default_view || prev.currentView,
            calendarSettings: (data.calendar_settings as CalendarViewSettings) || prev.calendarSettings,
            ganttSettings: (data.gantt_settings as GanttViewSettings) || prev.ganttSettings,
            tableSettings: (data.table_settings as TableViewSettings) || prev.tableSettings,
          }));
        }
      }
    } catch (err) {
      console.error('Error loading view preferences:', err);
    }
  }, [user, boardId, searchParams]);

  // Load preferences on mount - useEffect is appropriate here as we're
  // synchronizing with an external system (database)
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (mounted) {
        await loadPreferences();
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [loadPreferences]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    const filters = viewState?.filters;
    if (!filters) return false;
    
    return (
      (filters.labels?.length || 0) > 0 ||
      (filters.assignees?.length || 0) > 0 ||
      (filters.priorities?.length || 0) > 0 ||
      (filters.columns?.length || 0) > 0 ||
      (filters.search || '') !== '' ||
      filters.dateRange !== null
    );
  }, [viewState?.filters]);

  // Generate shareable URL
  const shareableUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    
    const params = new URLSearchParams();
    params.set('view', viewState?.currentView || 'board');
    
    const filters = viewState?.filters;
    if (filters) {
      if ((filters.labels?.length || 0) > 0) {
        params.set('labels', filters.labels.join(','));
      }
      if ((filters.assignees?.length || 0) > 0) {
        params.set('assignees', filters.assignees.join(','));
      }
      if ((filters.priorities?.length || 0) > 0) {
        params.set('priorities', filters.priorities.join(','));
      }
      if (filters.search) {
        params.set('search', filters.search);
      }
    }

    return `${window.location.origin}${pathname}?${params.toString()}`;
  }, [viewState, pathname]);

  // Keyboard shortcuts for view switching
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger if not in an input field
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      // View switching shortcuts (Alt + number)
      if (e.altKey) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            setCurrentView('board');
            break;
          case '2':
            e.preventDefault();
            setCurrentView('calendar');
            break;
          case '3':
            e.preventDefault();
            setCurrentView('gantt');
            break;
          case '4':
            e.preventDefault();
            setCurrentView('table');
            break;
        }
      }

      // Clear filters (Escape)
      if (e.key === 'Escape' && hasActiveFilters) {
        clearFilters();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setCurrentView, clearFilters, hasActiveFilters]);

  return {
    viewState,
    currentView: viewState.currentView,
    setCurrentView,
    setFilters,
    clearFilters,
    setCalendarSettings,
    setGanttSettings,
    setTableSettings,
    savePreferences,
    loadPreferences,
    hasActiveFilters,
    shareableUrl,
  };
}
