'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Card,
  Label,
  Column,
  CardDependency,
  GanttTask,
  CardPriority,
  GanttViewSettings,
} from '@/types/database';

// =====================================================
// Exported Types
// =====================================================

export interface GanttFilter {
  assignees?: string[];
  priorities?: CardPriority[];
  columns?: string[];
  labels?: string[];
  search?: string;
}

export type GanttGroupBy = 'none' | 'column' | 'assignee' | 'priority';
export type GanttZoomLevel = 'day' | 'week' | 'month' | 'quarter';

export interface UseGanttDataReturn {
  tasks: GanttTask[];
  dependencies: CardDependency[];
  loading: boolean;
  error: string | null;
  fetchTasks: () => Promise<void>;
  updateTaskDates: (
    taskId: string,
    start: Date,
    end: Date
  ) => Promise<boolean>;
  addDependency: (
    predecessorId: string,
    successorId: string,
    type?: string
  ) => Promise<boolean>;
  removeDependency: (dependencyId: string) => Promise<boolean>;
  groupedTasks: Map<string, GanttTask[]>;
}

interface UseGanttDataOptions {
  filters?: GanttFilter;
  settings?: GanttViewSettings;
}

// =====================================================
// Hook Implementation
// =====================================================

export function useGanttData(
  boardId: string,
  options: UseGanttDataOptions = {}
): UseGanttDataReturn {
  const { user } = useAuth();
  const { filters, settings } = options;

  const [tasks, setTasks] = useState<GanttTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [dependencies, setDependencies] = useState<CardDependency[]>([]);

  // Fetch columns for the board
  useEffect(() => {
    const fetchColumns = async () => {
      const { data } = await supabase
        .from('columns')
        .select('*')
        .eq('board_id', boardId)
        .order('position');

      if (data) setColumns(data);
    };
    fetchColumns();
  }, [boardId]);

  // Fetch tasks (cards with dates)
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch cards
      let query = supabase
        .from('cards')
        .select(`
          *,
          card_labels (
            label_id,
            labels (*)
          )
        `)
        .eq('board_id', boardId);

      // Apply filters
      if (filters?.assignees && filters.assignees.length > 0) {
        query = query.in('assignee', filters.assignees);
      }
      if (filters?.priorities && filters.priorities.length > 0) {
        query = query.in('priority', filters.priorities);
      }
      if (filters?.columns && filters.columns.length > 0) {
        query = query.in('column_id', filters.columns);
      }
      if (filters?.search) {
        query = query.or(
          `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
        );
      }

      // Apply sorting
      if (settings?.sortBy) {
        query = query.order(settings.sortBy, {
          ascending: settings.sortDirection === 'asc',
        });
      }

      const { data: cards, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Fetch dependencies
      const cardIds = (cards || []).map((c) => c.id);
      let fetchedDependencies: CardDependency[] = [];
      
      if (cardIds.length > 0) {
        const { data: deps } = await supabase
          .from('card_dependencies')
          .select('*')
          .or(`predecessor_id.in.(${cardIds.join(',')}),successor_id.in.(${cardIds.join(',')})`);

        fetchedDependencies = deps || [];
        setDependencies(fetchedDependencies);
      }

      // Transform cards to Gantt tasks
      const ganttTasks: GanttTask[] = (cards || [])
        .filter((card) => {
          // Filter by labels (client-side)
          if (filters?.labels && filters.labels.length > 0) {
            const cardLabelIds = (card.card_labels || []).map(
              (cl: { label_id: string }) => cl.label_id
            );
            return filters.labels.some((labelId: string) => cardLabelIds.includes(labelId));
          }
          return true;
        })
        .map((card) => {
          const column = columns.find((c) => c.id === card.column_id);
          const labels = (card.card_labels || [])
            .map((cl: { labels: Label }) => cl.labels)
            .filter(Boolean);

          // Calculate progress based on column position (simplified)
          const columnIndex = columns.findIndex((c) => c.id === card.column_id);
          const progress =
            columns.length > 1
              ? Math.round((columnIndex / (columns.length - 1)) * 100)
              : 0;

          // Get task dependencies
          const taskDeps = fetchedDependencies
            .filter((d) => d.successor_id === card.id)
            .map((d) => d.predecessor_id);

          // Determine colors based on priority
          let backgroundColor = '#3b82f6';
          let borderColor = '#2563eb';

          switch (card.priority) {
            case 'critical':
              backgroundColor = '#ef4444';
              borderColor = '#dc2626';
              break;
            case 'high':
              backgroundColor = '#f97316';
              borderColor = '#ea580c';
              break;
            case 'medium':
              backgroundColor = '#3b82f6';
              borderColor = '#2563eb';
              break;
            case 'low':
              backgroundColor = '#6b7280';
              borderColor = '#4b5563';
              break;
          }

          return {
            id: card.id,
            title: card.title,
            start_date: card.start_date,
            end_date: card.end_date,
            due_date: card.due_date,
            progress,
            type: 'task' as const,
            dependencies: taskDeps,
            description: card.description,
            board_id: card.board_id,
            column_id: card.column_id,
            column_name: column?.title || 'Unknown',
            priority: card.priority as CardPriority | null,
            assignee: card.assignee,
            labels,
            backgroundColor,
            borderColor,
          };
        });

      setTasks(ganttTasks);
    } catch (err) {
      console.error('Error fetching Gantt tasks:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  }, [boardId, columns, filters, settings]);

  // Initial fetch
  useEffect(() => {
    if (columns.length > 0) {
      fetchTasks();
    }
  }, [fetchTasks, columns.length]);

  // Update task dates (drag/resize)
  const updateTaskDates = useCallback(
    async (taskId: string, start: Date, end: Date): Promise<boolean> => {
      if (!user) return false;

      try {
        const { error: updateError } = await supabase
          .from('cards')
          .update({
            start_date: start.toISOString(),
            due_date: end.toISOString(),
          })
          .eq('id', taskId);

        if (updateError) throw updateError;

        // Optimistically update local state
        setTasks((prev) =>
          prev.map((task) =>
            task.id === taskId
              ? { 
                  ...task, 
                  start_date: start.toISOString(), 
                  end_date: end.toISOString(),
                  due_date: end.toISOString(),
                }
              : task
          )
        );

        return true;
      } catch (err) {
        console.error('Error updating task dates:', err);
        setError(err instanceof Error ? err.message : 'Failed to update dates');
        return false;
      }
    },
    [user]
  );

  // Add dependency
  const addDependency = useCallback(
    async (
      predecessorId: string,
      successorId: string,
      type: string = 'finish_to_start'
    ): Promise<boolean> => {
      try {
        const { error: insertError } = await supabase
          .from('card_dependencies')
          .insert({
            predecessor_id: predecessorId,
            successor_id: successorId,
            dependency_type: type,
          });

        if (insertError) throw insertError;

        // Update local state
        setDependencies((prev) => [
          ...prev,
          {
            id: `temp-${Date.now()}`,
            predecessor_id: predecessorId,
            successor_id: successorId,
            dependency_type: type as CardDependency['dependency_type'],
            lag_days: 0,
            created_at: new Date().toISOString(),
          },
        ]);

        // Update tasks with new dependency
        setTasks((prev) =>
          prev.map((task) =>
            task.id === successorId
              ? { ...task, dependencies: [...(task.dependencies || []), predecessorId] }
              : task
          )
        );

        return true;
      } catch (err) {
        console.error('Error adding dependency:', err);
        setError(err instanceof Error ? err.message : 'Failed to add dependency');
        return false;
      }
    },
    []
  );

  // Remove dependency
  const removeDependency = useCallback(async (dependencyId: string): Promise<boolean> => {
    try {
      const dep = dependencies.find((d) => d.id === dependencyId);
      
      const { error: deleteError } = await supabase
        .from('card_dependencies')
        .delete()
        .eq('id', dependencyId);

      if (deleteError) throw deleteError;

      // Update local state
      setDependencies((prev) => prev.filter((d) => d.id !== dependencyId));

      // Update tasks to remove dependency
      if (dep) {
        setTasks((prev) =>
          prev.map((task) =>
            task.id === dep.successor_id
              ? {
                  ...task,
                  dependencies: (task.dependencies || []).filter(
                    (d) => d !== dep.predecessor_id
                  ),
                }
              : task
          )
        );
      }

      return true;
    } catch (err) {
      console.error('Error removing dependency:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove dependency');
      return false;
    }
  }, [dependencies]);

  // Grouped tasks (by column, assignee, or priority)
  const groupedTasks = useMemo(() => {
    const map = new Map<string, GanttTask[]>();
    const groupBy = settings?.groupBy || 'none';

    if (groupBy === 'none') {
      map.set('all', tasks);
      return map;
    }

    for (const task of tasks) {
      let key: string;

      switch (groupBy) {
        case 'column':
          key = task.column_name;
          break;
        case 'assignee':
          key = task.assignee || 'Unassigned';
          break;
        case 'priority':
          key = task.priority || 'None';
          break;
        default:
          key = 'all';
      }

      const existing = map.get(key) || [];
      map.set(key, [...existing, task]);
    }

    return map;
  }, [tasks, settings?.groupBy]);

  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`gantt-cards-${boardId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cards',
          filter: `board_id=eq.${boardId}`,
        },
        () => {
          // Refetch on any card change
          fetchTasks();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'card_dependencies',
        },
        () => {
          // Refetch on dependency changes
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [boardId, fetchTasks]);

  return {
    tasks,
    dependencies,
    loading,
    error,
    fetchTasks,
    updateTaskDates,
    addDependency,
    removeDependency,
    groupedTasks,
  };
}
