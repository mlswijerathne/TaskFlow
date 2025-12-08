'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Card,
  Label,
  Column,
  CalendarEvent,
  CardPriority,
} from '@/types/database';

// =====================================================
// Exported Types
// =====================================================

export interface CalendarFilter {
  assignees?: string[];
  priorities?: CardPriority[];
  columns?: string[];
  labels?: string[];
  search?: string;
}

export interface CalendarRange {
  start: Date;
  end: Date;
}

export interface UseCalendarEventsReturn {
  events: CalendarEvent[];
  loading: boolean;
  error: string | null;
  fetchEvents: (start: Date, end: Date) => Promise<void>;
  refetch: () => Promise<void>;
  updateCardDates: (cardId: string, start: Date | null, end: Date | null) => Promise<boolean>;
  createCardFromCalendar: (
    date: Date,
    columnId: string,
    title: string
  ) => Promise<string | null>;
}

interface UseCalendarEventsOptions {
  filters?: CalendarFilter;
  dateRange?: { start: Date; end: Date };
}

// =====================================================
// Hook Implementation
// =====================================================

export function useCalendarEvents(
  boardId: string,
  options: UseCalendarEventsOptions = {}
): UseCalendarEventsReturn {
  const { user } = useAuth();
  const { filters, dateRange } = options;
  
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [lastFetchedRange, setLastFetchedRange] = useState<{ start: string; end: string } | null>(null);

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

  // Fetch events (cards with due dates)
  const fetchEvents = useCallback(async (start: Date, end: Date) => {
    try {
      setLoading(true);
      setError(null);

      // Build query for cards with due dates in range
      let query = supabase
        .from('cards')
        .select(`
          *,
          card_labels (
            label_id,
            labels (*)
          )
        `)
        .eq('board_id', boardId)
        .not('due_date', 'is', null)
        .gte('due_date', start.toISOString())
        .lte('due_date', end.toISOString());

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
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data: cards, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Transform cards to calendar events
      const calendarEvents: CalendarEvent[] = (cards || [])
        .filter((card) => {
          // Additional label filtering (needs to be done client-side due to join)
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

          // Determine color based on priority
          let backgroundColor = '#3b82f6'; // Default blue
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

          // Check if card is completed based on checklist progress (for now, assume not completed)
          const completed = false;

          return {
            id: card.id,
            title: card.title,
            start_date: card.start_date,
            end_date: card.end_date,
            due_date: card.due_date,
            description: card.description,
            priority: card.priority as CardPriority | null,
            completed,
            board_id: card.board_id,
            column_id: card.column_id,
            column_name: column?.title || 'Unknown',
            assignee: card.assignee,
            labels,
            backgroundColor,
            borderColor,
          };
        });

      setEvents(calendarEvents);
      setLastFetchedRange({ start: start.toISOString(), end: end.toISOString() });
    } catch (err) {
      console.error('Error fetching calendar events:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch events');
    } finally {
      setLoading(false);
    }
  }, [boardId, columns, filters]);

  // Refetch using last known range
  const refetch = useCallback(async () => {
    if (lastFetchedRange) {
      await fetchEvents(new Date(lastFetchedRange.start), new Date(lastFetchedRange.end));
    } else if (dateRange) {
      await fetchEvents(dateRange.start, dateRange.end);
    }
  }, [lastFetchedRange, dateRange, fetchEvents]);

  // Auto-fetch when dateRange changes
  const startIso = dateRange?.start?.toISOString();
  const endIso = dateRange?.end?.toISOString();
  useEffect(() => {
    if (dateRange && columns.length > 0) {
      fetchEvents(dateRange.start, dateRange.end);
    }
  }, [startIso, endIso, columns.length, fetchEvents, dateRange]);

  // Update card dates (for drag and drop)
  const updateCardDates = useCallback(async (
    cardId: string,
    start: Date | null,
    end: Date | null
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error: updateError } = await supabase
        .from('cards')
        .update({
          start_date: start?.toISOString() || null,
          due_date: end?.toISOString() || null,
        })
        .eq('id', cardId);

      if (updateError) throw updateError;

      // Optimistically update local state
      setEvents((prev) =>
        prev.map((event) =>
          event.id === cardId
            ? {
                ...event,
                start_date: start?.toISOString() || null,
                due_date: end?.toISOString() || null,
              }
            : event
        )
      );

      return true;
    } catch (err) {
      console.error('Error updating card dates:', err);
      setError(err instanceof Error ? err.message : 'Failed to update dates');
      return false;
    }
  }, [user]);

  // Create card from calendar click
  const createCardFromCalendar = useCallback(async (
    date: Date,
    columnId: string,
    title: string
  ): Promise<string | null> => {
    if (!user) return null;

    try {
      // Get max position in column
      const { data: maxPosData } = await supabase
        .from('cards')
        .select('position')
        .eq('column_id', columnId)
        .order('position', { ascending: false })
        .limit(1)
        .single();

      const newPosition = (maxPosData?.position ?? -1) + 1;

      const { data: newCard, error: insertError } = await supabase
        .from('cards')
        .insert({
          board_id: boardId,
          column_id: columnId,
          title,
          due_date: date.toISOString(),
          position: newPosition,
          created_by: user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      return newCard?.id || null;
    } catch (err) {
      console.error('Error creating card:', err);
      setError(err instanceof Error ? err.message : 'Failed to create card');
      return null;
    }
  }, [boardId, user]);

  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`calendar-cards-${boardId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cards',
          filter: `board_id=eq.${boardId}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updatedCard = payload.new as Card;
            
            // Update event in state if due date changed
            setEvents((prev) => {
              const existingIndex = prev.findIndex((e) => e.id === updatedCard.id);
              
              if (updatedCard.due_date) {
                const column = columns.find((c) => c.id === updatedCard.column_id);
                const updatedEvent: CalendarEvent = {
                  id: updatedCard.id,
                  title: updatedCard.title,
                  start_date: updatedCard.start_date,
                  end_date: updatedCard.end_date,
                  due_date: updatedCard.due_date,
                  description: updatedCard.description,
                  priority: updatedCard.priority as CardPriority | null,
                  completed: false,
                  board_id: updatedCard.board_id,
                  column_id: updatedCard.column_id,
                  column_name: column?.title || 'Unknown',
                  assignee: updatedCard.assignee,
                  labels: prev[existingIndex]?.labels || [],
                  backgroundColor: prev[existingIndex]?.backgroundColor,
                  borderColor: prev[existingIndex]?.borderColor,
                };

                if (existingIndex >= 0) {
                  return prev.map((e, i) => (i === existingIndex ? updatedEvent : e));
                } else {
                  return [...prev, updatedEvent];
                }
              } else {
                // Remove event if due date was cleared
                return prev.filter((e) => e.id !== updatedCard.id);
              }
            });
          } else if (payload.eventType === 'DELETE') {
            setEvents((prev) => prev.filter((e) => e.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [boardId, columns]);

  return {
    events,
    loading,
    error,
    fetchEvents,
    refetch,
    updateCardDates,
    createCardFromCalendar,
  };
}
