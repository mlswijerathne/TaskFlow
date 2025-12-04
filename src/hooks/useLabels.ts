'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Label, LabelInsert } from '@/types/database';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface UseLabelsReturn {
  labels: Label[];
  loading: boolean;
  error: string | null;
  createLabel: (name: string, color: string) => Promise<Label | null>;
  updateLabel: (labelId: string, updates: { name?: string; color?: string }) => Promise<boolean>;
  deleteLabel: (labelId: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

interface UseCardLabelsReturn {
  cardLabels: Label[];
  loading: boolean;
  error: string | null;
  assignLabel: (labelId: string) => Promise<boolean>;
  removeLabel: (labelId: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

/**
 * Hook to manage board-level labels
 */
export function useLabels(boardId: string): UseLabelsReturn {
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLabels = useCallback(async () => {
    if (!boardId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('labels')
        .select('*')
        .eq('board_id', boardId)
        .order('name');

      if (fetchError) throw fetchError;

      setLabels(data || []);
    } catch (err) {
      console.error('Error fetching labels:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch labels');
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    fetchLabels();
  }, [fetchLabels]);

  // Realtime subscription for label changes
  useEffect(() => {
    if (!boardId) return;

    const channel = supabase
      .channel(`labels-${boardId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'labels',
          filter: `board_id=eq.${boardId}`,
        },
        (payload: RealtimePostgresChangesPayload<Label>) => {
          handleLabelChange(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [boardId]);

  const handleLabelChange = (payload: RealtimePostgresChangesPayload<Label>) => {
    const { eventType, new: newLabel, old: oldLabel } = payload;

    if (eventType === 'INSERT' && newLabel) {
      setLabels(prev => [...prev, newLabel as Label].sort((a, b) => a.name.localeCompare(b.name)));
    } else if (eventType === 'UPDATE' && newLabel) {
      setLabels(prev =>
        prev.map(l => (l.id === (newLabel as Label).id ? (newLabel as Label) : l))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
    } else if (eventType === 'DELETE' && oldLabel) {
      setLabels(prev => prev.filter(l => l.id !== (oldLabel as Label).id));
    }
  };

  const createLabel = async (name: string, color: string): Promise<Label | null> => {
    try {
      const { data, error: createError } = await supabase
        .from('labels')
        .insert({ board_id: boardId, name, color } as LabelInsert)
        .select()
        .single();

      if (createError) throw createError;

      return data;
    } catch (err) {
      console.error('Error creating label:', err);
      setError(err instanceof Error ? err.message : 'Failed to create label');
      return null;
    }
  };

  const updateLabel = async (
    labelId: string,
    updates: { name?: string; color?: string }
  ): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('labels')
        .update(updates)
        .eq('id', labelId);

      if (updateError) throw updateError;

      return true;
    } catch (err) {
      console.error('Error updating label:', err);
      setError(err instanceof Error ? err.message : 'Failed to update label');
      return false;
    }
  };

  const deleteLabel = async (labelId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('labels')
        .delete()
        .eq('id', labelId);

      if (deleteError) throw deleteError;

      return true;
    } catch (err) {
      console.error('Error deleting label:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete label');
      return false;
    }
  };

  return {
    labels,
    loading,
    error,
    createLabel,
    updateLabel,
    deleteLabel,
    refetch: fetchLabels,
  };
}

/**
 * Hook to manage labels assigned to a specific card
 */
export function useCardLabels(cardId: string, _boardId: string): UseCardLabelsReturn {
  const [cardLabels, setCardLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCardLabels = useCallback(async () => {
    if (!cardId) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch card_labels with joined label data
      const { data, error: fetchError } = await supabase
        .from('card_labels')
        .select(`
          id,
          label_id,
          labels (*)
        `)
        .eq('card_id', cardId);

      if (fetchError) throw fetchError;

      // Extract labels from the joined data
      // Supabase returns labels as an object for single-row joins
      const labels = (data || [])
        .map((cl) => (cl as { labels: Label | Label[] }).labels)
        .map((labelData) => Array.isArray(labelData) ? labelData[0] : labelData)
        .filter((label): label is Label => Boolean(label))
        .sort((a, b) => a.name.localeCompare(b.name));

      setCardLabels(labels);
    } catch (err) {
      console.error('Error fetching card labels:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch card labels');
    } finally {
      setLoading(false);
    }
  }, [cardId]);

  useEffect(() => {
    fetchCardLabels();
  }, [fetchCardLabels]);

  // Realtime subscription for card label changes
  useEffect(() => {
    if (!cardId) return;

    const channel = supabase
      .channel(`card-labels-${cardId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'card_labels',
          filter: `card_id=eq.${cardId}`,
        },
        () => {
          // Refetch on any change since we need the joined label data
          fetchCardLabels();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cardId, fetchCardLabels]);

  const assignLabel = async (labelId: string): Promise<boolean> => {
    try {
      const { error: insertError } = await supabase
        .from('card_labels')
        .insert({ card_id: cardId, label_id: labelId });

      if (insertError) throw insertError;

      return true;
    } catch (err) {
      console.error('Error assigning label:', err);
      setError(err instanceof Error ? err.message : 'Failed to assign label');
      return false;
    }
  };

  const removeLabel = async (labelId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('card_labels')
        .delete()
        .eq('card_id', cardId)
        .eq('label_id', labelId);

      if (deleteError) throw deleteError;

      return true;
    } catch (err) {
      console.error('Error removing label:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove label');
      return false;
    }
  };

  return {
    cardLabels,
    loading,
    error,
    assignLabel,
    removeLabel,
    refetch: fetchCardLabels,
  };
}
