'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Card,
  Label,
  Column,
  UserProfile,
  CardPriority,
  ViewState,
  TableViewSettings,
  BulkAction,
  CardUpdate,
} from '@/types/database';

// =====================================================
// Exported Types
// =====================================================

export interface TableColumn {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'member' | 'labels' | 'priority' | 'progress';
  sortable: boolean;
  width?: number;
}

export interface TableSortState {
  column: string;
  direction: 'asc' | 'desc';
}

export interface TableFilterState {
  column: string;
  operator: 'eq' | 'neq' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte';
  value: string | number | Date;
}

// Extended card type for table view
export interface TableCard extends Card {
  labels: Label[];
  column: Column | null;
  assignee_profile: UserProfile | null;
}

interface UseTableDataReturn {
  cards: TableCard[];
  data: TableCard[];  // Alias for cards
  totalCount: number;
  loading: boolean;
  error: string | null;
  page: number;
  pageSize: number;
  sortState: TableSortState | null;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setSort: (sort: TableSortState | null) => void;
  fetchCards: () => Promise<void>;
  updateCard: (cardId: string, updates: CardUpdate) => Promise<boolean>;
  updateCardField: (
    cardId: string,
    field: keyof CardUpdate,
    value: unknown
  ) => Promise<boolean>;
  deleteCard: (cardId: string) => Promise<boolean>;
  bulkUpdateCards: (cardIds: string[], updates: Partial<CardUpdate>) => Promise<{ success: number; failed: number }>;
  bulkDeleteCards: (cardIds: string[]) => Promise<{ success: number; failed: number }>;
  executeBulkAction: (
    cardIds: string[],
    action: BulkAction
  ) => Promise<{ success: number; failed: number }>;
  exportToCsv: () => string;
  exportToCSV: () => string;  // Alias for exportToCsv
  importFromCsv: (
    csvData: string,
    columnMapping: Record<string, string>
  ) => Promise<{ created: number; updated: number; errors: string[] }>;
}

interface UseTableDataOptions {
  filters?: ViewState['filters'];
  settings?: TableViewSettings;
  pageSize?: number;
}

export function useTableData(
  boardId: string,
  options: UseTableDataOptions = {}
): UseTableDataReturn {
  const { user } = useAuth();
  const { filters, settings } = options;

  const [cards, setCards] = useState<TableCard[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(settings?.pageSize || 50);
  const [columns, setColumns] = useState<Column[]>([]);
  const [profiles, setProfiles] = useState<Map<string, UserProfile>>(new Map());
  const [sortState, setSortState] = useState<TableSortState | null>(null);

  // Set sort state
  const setSort = useCallback((state: TableSortState | null) => {
    setSortState(state);
  }, []);

  // Fetch columns
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

  // Fetch cards with pagination and filtering
  const fetchCards = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query
      let query = supabase
        .from('cards')
        .select(
          `
          *,
          card_labels (
            label_id,
            labels (*)
          )
        `,
          { count: 'exact' }
        )
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
      if (filters?.dateRange?.start) {
        query = query.gte('due_date', filters.dateRange.start.toISOString());
      }
      if (filters?.dateRange?.end) {
        query = query.lte('due_date', filters.dateRange.end.toISOString());
      }

      // Apply sorting
      if (settings?.sortBy) {
        query = query.order(settings.sortBy, {
          ascending: settings.sortDirection === 'asc',
        });
      } else {
        query = query.order('position', { ascending: true });
      }

      // Apply pagination
      const from = page * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      // Get unique assignee IDs for profile lookup
      const assigneeIds = [
        ...new Set((data || []).map((c) => c.assignee).filter(Boolean)),
      ] as string[];

      // Fetch profiles for assignees
      if (assigneeIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('user_profiles')
          .select('*')
          .in('id', assigneeIds);

        if (profilesData) {
          const profileMap = new Map<string, UserProfile>();
          profilesData.forEach((p) => profileMap.set(p.id, p));
          setProfiles(profileMap);
        }
      }

      // Transform cards
      const tableCards: TableCard[] = (data || [])
        .filter((card) => {
          // Filter by labels (client-side)
          if (filters?.labels && filters.labels.length > 0) {
            const cardLabelIds = (card.card_labels || []).map(
              (cl: { label_id: string }) => cl.label_id
            );
            return filters.labels.some((labelId) =>
              cardLabelIds.includes(labelId)
            );
          }
          return true;
        })
        .map((card) => {
          const column = columns.find((c) => c.id === card.column_id) || null;
          const labels = (card.card_labels || [])
            .map((cl: { labels: Label }) => cl.labels)
            .filter(Boolean);
          const assigneeProfile = card.assignee
            ? profiles.get(card.assignee) || null
            : null;

          return {
            ...card,
            labels,
            column,
            assignee_profile: assigneeProfile,
          };
        });

      setCards(tableCards);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Error fetching table data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch cards');
    } finally {
      setLoading(false);
    }
  }, [boardId, columns, filters, settings, page, pageSize, profiles]);

  // Fetch on dependencies change
  useEffect(() => {
    if (columns.length > 0) {
      fetchCards();
    }
  }, [fetchCards, columns.length, page, pageSize]);

  // Update a single card
  const updateCard = useCallback(
    async (cardId: string, updates: CardUpdate): Promise<boolean> => {
      try {
        const { error: updateError } = await supabase
          .from('cards')
          .update(updates)
          .eq('id', cardId);

        if (updateError) throw updateError;

        // Optimistically update local state
        setCards((prev) =>
          prev.map((card) =>
            card.id === cardId ? { ...card, ...updates } : card
          )
        );

        return true;
      } catch (err) {
        console.error('Error updating card:', err);
        setError(err instanceof Error ? err.message : 'Failed to update card');
        return false;
      }
    },
    []
  );

  // Update a specific field (for inline editing)
  const updateCardField = useCallback(
    async (
      cardId: string,
      field: keyof CardUpdate,
      value: unknown
    ): Promise<boolean> => {
      return updateCard(cardId, { [field]: value } as CardUpdate);
    },
    [updateCard]
  );

  // Delete a single card
  const deleteCard = useCallback(
    async (cardId: string): Promise<boolean> => {
      try {
        const { error: deleteError } = await supabase
          .from('cards')
          .delete()
          .eq('id', cardId);

        if (deleteError) throw deleteError;

        // Optimistically update local state
        setCards((prev) => prev.filter((card) => card.id !== cardId));
        setTotalCount((prev) => prev - 1);

        return true;
      } catch (err) {
        console.error('Error deleting card:', err);
        setError(err instanceof Error ? err.message : 'Failed to delete card');
        return false;
      }
    },
    []
  );

  // Bulk update cards
  const bulkUpdateCards = useCallback(
    async (cardIds: string[], updates: Partial<CardUpdate>): Promise<{ success: number; failed: number }> => {
      try {
        const { error: updateError } = await supabase
          .from('cards')
          .update(updates)
          .in('id', cardIds);

        if (updateError) throw updateError;

        // Optimistically update local state
        setCards((prev) =>
          prev.map((card) =>
            cardIds.includes(card.id) ? { ...card, ...updates } : card
          )
        );

        return { success: cardIds.length, failed: 0 };
      } catch (err) {
        console.error('Error bulk updating cards:', err);
        setError(err instanceof Error ? err.message : 'Failed to bulk update cards');
        return { success: 0, failed: cardIds.length };
      }
    },
    []
  );

  // Bulk delete cards
  const bulkDeleteCards = useCallback(
    async (cardIds: string[]): Promise<{ success: number; failed: number }> => {
      try {
        const { error: deleteError } = await supabase
          .from('cards')
          .delete()
          .in('id', cardIds);

        if (deleteError) throw deleteError;

        // Optimistically update local state
        setCards((prev) => prev.filter((card) => !cardIds.includes(card.id)));
        setTotalCount((prev) => prev - cardIds.length);

        return { success: cardIds.length, failed: 0 };
      } catch (err) {
        console.error('Error bulk deleting cards:', err);
        setError(err instanceof Error ? err.message : 'Failed to bulk delete cards');
        return { success: 0, failed: cardIds.length };
      }
    },
    []
  );

  // Execute bulk action
  const executeBulkAction = useCallback(
    async (
      cardIds: string[],
      action: BulkAction
    ): Promise<{ success: number; failed: number }> => {
      let success = 0;
      let failed = 0;

      try {
        switch (action.type) {
          case 'assign':
            const { error: assignError } = await supabase
              .from('cards')
              .update({ assignee: action.payload as string | null })
              .in('id', cardIds);
            if (assignError) throw assignError;
            success = cardIds.length;
            break;

          case 'set_priority':
            const { error: priorityError } = await supabase
              .from('cards')
              .update({ priority: action.payload as CardPriority })
              .in('id', cardIds);
            if (priorityError) throw priorityError;
            success = cardIds.length;
            break;

          case 'set_due_date':
            const { error: dueDateError } = await supabase
              .from('cards')
              .update({
                due_date: action.payload
                  ? new Date(action.payload as string).toISOString()
                  : null,
              })
              .in('id', cardIds);
            if (dueDateError) throw dueDateError;
            success = cardIds.length;
            break;

          case 'move_to_column':
            const { error: moveError } = await supabase
              .from('cards')
              .update({ column_id: action.payload as string })
              .in('id', cardIds);
            if (moveError) throw moveError;
            success = cardIds.length;
            break;

          case 'add_label':
            for (const cardId of cardIds) {
              const { error } = await supabase.from('card_labels').insert({
                card_id: cardId,
                label_id: action.payload as string,
              });
              if (error) {
                failed++;
              } else {
                success++;
              }
            }
            break;

          case 'remove_label':
            const { error: removeLabelError } = await supabase
              .from('card_labels')
              .delete()
              .in('card_id', cardIds)
              .eq('label_id', action.payload as string);
            if (removeLabelError) throw removeLabelError;
            success = cardIds.length;
            break;

          case 'delete':
            const { error: deleteError } = await supabase
              .from('cards')
              .delete()
              .in('id', cardIds);
            if (deleteError) throw deleteError;
            success = cardIds.length;
            break;
        }

        // Refresh data after bulk action
        await fetchCards();
      } catch (err) {
        console.error('Error executing bulk action:', err);
        failed = cardIds.length - success;
      }

      return { success, failed };
    },
    [fetchCards]
  );

  // Export to CSV
  const exportToCsv = useCallback((): string => {
    const headers = [
      'Title',
      'Description',
      'Status',
      'Priority',
      'Assignee',
      'Due Date',
      'Start Date',
      'Labels',
      'Created At',
    ];

    const rows = cards.map((card) => [
      card.title,
      card.description || '',
      card.column?.title || '',
      card.priority,
      card.assignee_profile?.display_name || card.assignee || '',
      card.due_date || '',
      card.start_date || '',
      card.labels.map((l) => l.name).join('; '),
      card.created_at,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    return csvContent;
  }, [cards]);

  // Import from CSV
  const importFromCsv = useCallback(
    async (
      csvData: string,
      columnMapping: Record<string, string>
    ): Promise<{ created: number; updated: number; errors: string[] }> => {
      if (!user) {
        return { created: 0, updated: 0, errors: ['Not authenticated'] };
      }

      const results = { created: 0, updated: 0, errors: [] as string[] };

      try {
        // Parse CSV
        const lines = csvData.split('\n');
        const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));

        // Get default column
        const defaultColumn = columns[0];
        if (!defaultColumn) {
          results.errors.push('No columns found in board');
          return results;
        }

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          try {
            // Simple CSV parsing (doesn't handle all edge cases)
            const values = line.match(/("([^"]|"")*"|[^,]*)/g) || [];
            const row: Record<string, string> = {};

            headers.forEach((header, index) => {
              const value = values[index]?.trim().replace(/^"|"$/g, '').replace(/""/g, '"') || '';
              row[header] = value;
            });

            // Map CSV columns to card fields
            const cardData: Partial<Card> = {
              board_id: boardId,
              column_id: defaultColumn.id,
              created_by: user.id,
              position: i,
            };

            // Apply column mapping
            if (columnMapping.title && row[columnMapping.title]) {
              cardData.title = row[columnMapping.title];
            } else {
              results.errors.push(`Row ${i}: Missing title`);
              continue;
            }

            if (columnMapping.description && row[columnMapping.description]) {
              cardData.description = row[columnMapping.description];
            }

            if (columnMapping.priority && row[columnMapping.priority]) {
              const priority = row[columnMapping.priority].toLowerCase();
              if (['low', 'medium', 'high', 'critical'].includes(priority)) {
                cardData.priority = priority as CardPriority;
              }
            }

            if (columnMapping.due_date && row[columnMapping.due_date]) {
              const date = new Date(row[columnMapping.due_date]);
              if (!isNaN(date.getTime())) {
                cardData.due_date = date.toISOString();
              }
            }

            if (columnMapping.status && row[columnMapping.status]) {
              const column = columns.find(
                (c) => c.title.toLowerCase() === row[columnMapping.status].toLowerCase()
              );
              if (column) {
                cardData.column_id = column.id;
              }
            }

            // Insert card
            const { error: insertError } = await supabase
              .from('cards')
              .insert(cardData as Card);

            if (insertError) {
              results.errors.push(`Row ${i}: ${insertError.message}`);
            } else {
              results.created++;
            }
          } catch (rowError) {
            results.errors.push(`Row ${i}: Parse error`);
          }
        }

        // Refresh data
        await fetchCards();
      } catch (err) {
        results.errors.push(
          `Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`
        );
      }

      return results;
    },
    [boardId, columns, user, fetchCards]
  );

  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`table-cards-${boardId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cards',
          filter: `board_id=eq.${boardId}`,
        },
        () => {
          fetchCards();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [boardId, fetchCards]);

  return {
    cards,
    data: cards, // Alias for TableView compatibility
    totalCount,
    loading,
    error,
    page,
    pageSize,
    sortState,
    setPage,
    setPageSize,
    setSort,
    fetchCards,
    updateCard,
    updateCardField,
    deleteCard,
    bulkUpdateCards,
    bulkDeleteCards,
    executeBulkAction,
    exportToCsv,
    exportToCSV: exportToCsv, // Alias for TableView compatibility
    importFromCsv,
  };
}
