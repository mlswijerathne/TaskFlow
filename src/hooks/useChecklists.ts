'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Checklist, ChecklistItem, ChecklistWithItems } from '@/types/database';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface UseChecklistsReturn {
  checklists: ChecklistWithItems[];
  loading: boolean;
  error: string | null;
  totalItems: number;
  completedItems: number;
  progressPercent: number;
  createChecklist: (title?: string) => Promise<Checklist | null>;
  updateChecklist: (checklistId: string, title: string) => Promise<boolean>;
  deleteChecklist: (checklistId: string) => Promise<boolean>;
  addChecklistItem: (checklistId: string, title: string) => Promise<ChecklistItem | null>;
  updateChecklistItem: (itemId: string, updates: { title?: string; completed?: boolean }) => Promise<boolean>;
  toggleChecklistItem: (itemId: string, completed: boolean) => Promise<boolean>;
  deleteChecklistItem: (itemId: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

/**
 * Hook to manage checklists for a specific card
 */
export function useChecklists(cardId: string): UseChecklistsReturn {
  const [checklists, setChecklists] = useState<ChecklistWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate totals
  const totalItems = checklists.reduce((sum, cl) => sum + cl.items.length, 0);
  const completedItems = checklists.reduce(
    (sum, cl) => sum + cl.items.filter(item => item.completed).length,
    0
  );
  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const fetchChecklists = useCallback(async () => {
    if (!cardId) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch checklists
      const { data: checklistsData, error: checklistsError } = await supabase
        .from('checklists')
        .select('*')
        .eq('card_id', cardId)
        .order('position');

      if (checklistsError) throw checklistsError;

      if (!checklistsData || checklistsData.length === 0) {
        setChecklists([]);
        setLoading(false);
        return;
      }

      // Fetch all checklist items for these checklists
      const checklistIds = checklistsData.map(cl => cl.id);
      const { data: itemsData, error: itemsError } = await supabase
        .from('checklist_items')
        .select('*')
        .in('checklist_id', checklistIds)
        .order('position');

      if (itemsError) throw itemsError;

      // Combine checklists with their items
      const checklistsWithItems: ChecklistWithItems[] = checklistsData.map(cl => ({
        ...cl,
        items: (itemsData || []).filter(item => item.checklist_id === cl.id),
      }));

      setChecklists(checklistsWithItems);
    } catch (err) {
      console.error('Error fetching checklists:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch checklists');
    } finally {
      setLoading(false);
    }
  }, [cardId]);

  useEffect(() => {
    fetchChecklists();
  }, [fetchChecklists]);

  // Realtime subscription for checklist changes
  useEffect(() => {
    if (!cardId) return;

    const channel = supabase
      .channel(`checklists-${cardId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'checklists',
          filter: `card_id=eq.${cardId}`,
        },
        (payload: RealtimePostgresChangesPayload<Checklist>) => {
          handleChecklistChange(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cardId]);

  // Realtime subscription for checklist item changes
  useEffect(() => {
    if (!cardId || checklists.length === 0) return;

    const checklistIds = checklists.map(cl => cl.id);
    
    const channels = checklistIds.map(checklistId => {
      return supabase
        .channel(`checklist-items-${checklistId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'checklist_items',
            filter: `checklist_id=eq.${checklistId}`,
          },
          (payload: RealtimePostgresChangesPayload<ChecklistItem>) => {
            handleItemChange(checklistId, payload);
          }
        )
        .subscribe();
    });

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardId, checklists.length]);

  const handleChecklistChange = (payload: RealtimePostgresChangesPayload<Checklist>) => {
    const { eventType, new: newChecklist, old: oldChecklist } = payload;

    if (eventType === 'INSERT' && newChecklist) {
      setChecklists(prev => [...prev, { ...(newChecklist as Checklist), items: [] }]);
    } else if (eventType === 'UPDATE' && newChecklist) {
      setChecklists(prev =>
        prev.map(cl =>
          cl.id === (newChecklist as Checklist).id
            ? { ...cl, ...(newChecklist as Checklist) }
            : cl
        )
      );
    } else if (eventType === 'DELETE' && oldChecklist) {
      setChecklists(prev => prev.filter(cl => cl.id !== (oldChecklist as Checklist).id));
    }
  };

  const handleItemChange = (
    checklistId: string,
    payload: RealtimePostgresChangesPayload<ChecklistItem>
  ) => {
    const { eventType, new: newItem, old: oldItem } = payload;

    setChecklists(prev =>
      prev.map(cl => {
        if (cl.id !== checklistId) return cl;

        let updatedItems = [...cl.items];

        if (eventType === 'INSERT' && newItem) {
          updatedItems = [...updatedItems, newItem as ChecklistItem].sort(
            (a, b) => a.position - b.position
          );
        } else if (eventType === 'UPDATE' && newItem) {
          updatedItems = updatedItems.map(item =>
            item.id === (newItem as ChecklistItem).id ? (newItem as ChecklistItem) : item
          );
        } else if (eventType === 'DELETE' && oldItem) {
          updatedItems = updatedItems.filter(item => item.id !== (oldItem as ChecklistItem).id);
        }

        return { ...cl, items: updatedItems };
      })
    );
  };

  const createChecklist = async (title: string = 'Checklist'): Promise<Checklist | null> => {
    try {
      const position = checklists.length;
      
      const { data, error: createError } = await supabase
        .from('checklists')
        .insert({ card_id: cardId, title, position })
        .select()
        .single();

      if (createError) throw createError;

      return data;
    } catch (err) {
      console.error('Error creating checklist:', err);
      setError(err instanceof Error ? err.message : 'Failed to create checklist');
      return null;
    }
  };

  const updateChecklist = async (checklistId: string, title: string): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('checklists')
        .update({ title })
        .eq('id', checklistId);

      if (updateError) throw updateError;

      return true;
    } catch (err) {
      console.error('Error updating checklist:', err);
      setError(err instanceof Error ? err.message : 'Failed to update checklist');
      return false;
    }
  };

  const deleteChecklist = async (checklistId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('checklists')
        .delete()
        .eq('id', checklistId);

      if (deleteError) throw deleteError;

      return true;
    } catch (err) {
      console.error('Error deleting checklist:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete checklist');
      return false;
    }
  };

  const addChecklistItem = async (
    checklistId: string,
    title: string
  ): Promise<ChecklistItem | null> => {
    try {
      const checklist = checklists.find(cl => cl.id === checklistId);
      const position = checklist ? checklist.items.length : 0;

      const { data, error: insertError } = await supabase
        .from('checklist_items')
        .insert({ checklist_id: checklistId, title, position })
        .select()
        .single();

      if (insertError) throw insertError;

      return data;
    } catch (err) {
      console.error('Error adding checklist item:', err);
      setError(err instanceof Error ? err.message : 'Failed to add checklist item');
      return null;
    }
  };

  const updateChecklistItem = async (
    itemId: string,
    updates: { title?: string; completed?: boolean }
  ): Promise<boolean> => {
    try {
      const updateData: Record<string, unknown> = { ...updates };
      
      // Set completed_at timestamp if completing the item
      if (updates.completed !== undefined) {
        updateData.completed_at = updates.completed ? new Date().toISOString() : null;
      }

      const { error: updateError } = await supabase
        .from('checklist_items')
        .update(updateData)
        .eq('id', itemId);

      if (updateError) throw updateError;

      return true;
    } catch (err) {
      console.error('Error updating checklist item:', err);
      setError(err instanceof Error ? err.message : 'Failed to update checklist item');
      return false;
    }
  };

  const toggleChecklistItem = async (itemId: string, completed: boolean): Promise<boolean> => {
    return updateChecklistItem(itemId, { completed });
  };

  const deleteChecklistItem = async (itemId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('checklist_items')
        .delete()
        .eq('id', itemId);

      if (deleteError) throw deleteError;

      return true;
    } catch (err) {
      console.error('Error deleting checklist item:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete checklist item');
      return false;
    }
  };

  return {
    checklists,
    loading,
    error,
    totalItems,
    completedItems,
    progressPercent,
    createChecklist,
    updateChecklist,
    deleteChecklist,
    addChecklistItem,
    updateChecklistItem,
    toggleChecklistItem,
    deleteChecklistItem,
    refetch: fetchChecklists,
  };
}

/**
 * Lightweight hook to get just checklist progress for a card (for card preview)
 */
export function useChecklistProgress(cardId: string): {
  totalItems: number;
  completedItems: number;
  progressPercent: number;
  loading: boolean;
} {
  const [stats, setStats] = useState({
    totalItems: 0,
    completedItems: 0,
    progressPercent: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchProgress = useCallback(async () => {
    if (!cardId) return;

    try {
      // Fetch checklists for this card
      const { data: checklists, error: checklistsError } = await supabase
        .from('checklists')
        .select('id')
        .eq('card_id', cardId);

      if (checklistsError) throw checklistsError;

      if (!checklists || checklists.length === 0) {
        setStats({ totalItems: 0, completedItems: 0, progressPercent: 0 });
        setLoading(false);
        return;
      }

      const checklistIds = checklists.map(cl => cl.id);

      // Count total and completed items
      const { count: totalCount, error: totalError } = await supabase
        .from('checklist_items')
        .select('*', { count: 'exact', head: true })
        .in('checklist_id', checklistIds);

      if (totalError) throw totalError;

      const { count: completedCount, error: completedError } = await supabase
        .from('checklist_items')
        .select('*', { count: 'exact', head: true })
        .in('checklist_id', checklistIds)
        .eq('completed', true);

      if (completedError) throw completedError;

      const total = totalCount || 0;
      const completed = completedCount || 0;
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

      setStats({
        totalItems: total,
        completedItems: completed,
        progressPercent: percent,
      });
    } catch (err) {
      console.error('Error fetching checklist progress:', err);
    } finally {
      setLoading(false);
    }
  }, [cardId]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  // Realtime subscription for changes
  useEffect(() => {
    if (!cardId) return;

    // Subscribe to checklist and checklist_items changes for this card
    const channel = supabase
      .channel(`checklist-progress-${cardId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'checklists',
          filter: `card_id=eq.${cardId}`,
        },
        () => fetchProgress()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'checklist_items',
        },
        () => fetchProgress()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cardId, fetchProgress]);

  return { ...stats, loading };
}
