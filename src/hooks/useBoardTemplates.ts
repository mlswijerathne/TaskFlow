'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  BoardTemplate,
  BoardTemplateWithDetails,
  TemplateCategory,
} from '@/types/database';

interface UseBoardTemplatesReturn {
  templates: BoardTemplate[];
  publicTemplates: BoardTemplate[];
  userTemplates: BoardTemplate[];
  loading: boolean;
  error: string | null;
  fetchTemplates: () => Promise<void>;
  getTemplateDetails: (templateId: string) => Promise<BoardTemplateWithDetails | null>;
  createBoardFromTemplate: (templateId: string, boardTitle: string) => Promise<string | null>;
  saveBoardAsTemplate: (
    boardId: string,
    name: string,
    description: string,
    category: TemplateCategory,
    includeCards?: boolean
  ) => Promise<string | null>;
  deleteTemplate: (templateId: string) => Promise<boolean>;
}

export function useBoardTemplates(): UseBoardTemplatesReturn {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<BoardTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all templates
  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('board_templates')
        .select('*')
        .order('usage_count', { ascending: false });

      if (fetchError) throw fetchError;

      setTemplates(data || []);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Get public templates
  const publicTemplates = templates.filter((t) => t.is_public);

  // Get user's own templates
  const userTemplates = templates.filter((t) => t.created_by === user?.id);

  // Get template with all details
  const getTemplateDetails = useCallback(async (templateId: string): Promise<BoardTemplateWithDetails | null> => {
    try {
      // Fetch template
      const { data: template, error: templateError } = await supabase
        .from('board_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (templateError) throw templateError;

      // Fetch columns
      const { data: columns, error: columnsError } = await supabase
        .from('template_columns')
        .select('*')
        .eq('template_id', templateId)
        .order('position');

      if (columnsError) throw columnsError;

      // Fetch labels
      const { data: labels, error: labelsError } = await supabase
        .from('template_labels')
        .select('*')
        .eq('template_id', templateId);

      if (labelsError) throw labelsError;

      // Fetch cards
      const { data: cards, error: cardsError } = await supabase
        .from('template_cards')
        .select('*')
        .eq('template_id', templateId)
        .order('position');

      if (cardsError) throw cardsError;

      return {
        ...template,
        columns: columns || [],
        labels: labels || [],
        cards: cards || [],
      };
    } catch (err) {
      console.error('Error fetching template details:', err);
      return null;
    }
  }, []);

  // Create board from template using database function
  const createBoardFromTemplate = useCallback(async (
    templateId: string,
    boardTitle: string
  ): Promise<string | null> => {
    if (!user) {
      console.error('Cannot create board from template: user not authenticated');
      return null;
    }

    try {
      console.log('Creating board from template:', { templateId, boardTitle, userId: user.id });
      
      const { data, error: rpcError } = await supabase.rpc('instantiate_template', {
        p_template_id: templateId,
        p_board_title: boardTitle,
        p_user_id: user.id,
      });

      if (rpcError) {
        console.error('RPC Error details:', {
          message: rpcError.message,
          details: rpcError.details,
          hint: rpcError.hint,
          code: rpcError.code,
        });
        throw rpcError;
      }

      console.log('Board created successfully:', data);
      return data as string;
    } catch (err: unknown) {
      const error = err as { message?: string; details?: string; hint?: string; code?: string };
      console.error('Error creating board from template:', {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        raw: err,
      });
      setError(error?.message || 'Failed to create board from template');
      return null;
    }
  }, [user]);

  // Save board as template using database function
  const saveBoardAsTemplate = useCallback(async (
    boardId: string,
    name: string,
    description: string,
    category: TemplateCategory,
    includeCards: boolean = false
  ): Promise<string | null> => {
    if (!user) return null;

    try {
      const { data, error: rpcError } = await supabase.rpc('save_board_as_template', {
        p_board_id: boardId,
        p_template_name: name,
        p_template_description: description,
        p_category: category,
        p_user_id: user.id,
        p_include_cards: includeCards,
      });

      if (rpcError) throw rpcError;

      // Refresh templates list
      await fetchTemplates();

      return data as string;
    } catch (err) {
      console.error('Error saving board as template:', err);
      setError(err instanceof Error ? err.message : 'Failed to save template');
      return null;
    }
  }, [user, fetchTemplates]);

  // Delete template
  const deleteTemplate = useCallback(async (templateId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('board_templates')
        .delete()
        .eq('id', templateId);

      if (deleteError) throw deleteError;

      // Update local state
      setTemplates((prev) => prev.filter((t) => t.id !== templateId));

      return true;
    } catch (err) {
      console.error('Error deleting template:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete template');
      return false;
    }
  }, []);

  return {
    templates,
    publicTemplates,
    userTemplates,
    loading,
    error,
    fetchTemplates,
    getTemplateDetails,
    createBoardFromTemplate,
    saveBoardAsTemplate,
    deleteTemplate,
  };
}
