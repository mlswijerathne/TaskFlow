'use client';

import { useState, useEffect } from 'react';
import { Card, Label, CardPriority, OnlineUser } from '@/types/database';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from '@/lib/supabase/client';
import { Calendar, Trash2, Edit2, X, Check, Paperclip, Maximize2 } from 'lucide-react';
import { CardDetailModal } from './CardDetailModal';
import { LabelBadgeList } from '@/components/labels';
import { ChecklistProgressBadge } from '@/components/checklists';
import { PriorityIndicator } from '@/components/priority';
import { CardEditingIndicator } from '@/components/presence';

interface KanbanCardProps {
  card: Card;
  isDragging?: boolean;
  canEdit?: boolean;
  boardId: string;
  onEditingCard?: (cardId: string | null) => void;
  getUsersEditingCard?: (cardId: string) => OnlineUser[];
}

export function KanbanCard({ card, isDragging, canEdit = true, boardId, onEditingCard, getUsersEditingCard }: KanbanCardProps) {
  const [editing, setEditing] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editTitle, setEditTitle] = useState(card.title);
  const [editDescription, setEditDescription] = useState(card.description || '');
  const [editDueDate, setEditDueDate] = useState(
    card.due_date ? new Date(card.due_date).toISOString().slice(0, 16) : ''
  );
  const [attachmentCount, setAttachmentCount] = useState(0);
  const [labels, setLabels] = useState<Label[]>([]);
  const [checklistStats, setChecklistStats] = useState({ total: 0, completed: 0 });

  // Get users currently editing this card
  const editingUsers = getUsersEditingCard ? getUsersEditingCard(card.id) : [];

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Fetch attachment count
  useEffect(() => {
    const fetchAttachmentCount = async () => {
      const { count } = await supabase
        .from('attachments')
        .select('*', { count: 'exact', head: true })
        .eq('card_id', card.id);
      
      setAttachmentCount(count || 0);
    };
    fetchAttachmentCount();
  }, [card.id]);

  // Fetch labels for this card
  useEffect(() => {
    const fetchLabels = async () => {
      const { data } = await supabase
        .from('card_labels')
        .select(`
          label_id,
          labels (*)
        `)
        .eq('card_id', card.id);

      if (data) {
        const labelData = data
          .map((cl) => (cl as { labels: Label | Label[] }).labels)
          .map((labelData) => Array.isArray(labelData) ? labelData[0] : labelData)
          .filter((label): label is Label => Boolean(label));
        setLabels(labelData);
      }
    };
    fetchLabels();

    // Subscribe to card label changes
    const channel = supabase
      .channel(`card-labels-preview-${card.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'card_labels',
          filter: `card_id=eq.${card.id}`,
        },
        () => fetchLabels()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [card.id]);

  // Fetch checklist progress
  useEffect(() => {
    const fetchChecklistStats = async () => {
      // Get checklists for this card
      const { data: checklists } = await supabase
        .from('checklists')
        .select('id')
        .eq('card_id', card.id);

      if (!checklists || checklists.length === 0) {
        setChecklistStats({ total: 0, completed: 0 });
        return;
      }

      const checklistIds = checklists.map(cl => cl.id);

      // Get total and completed counts
      const { count: totalCount } = await supabase
        .from('checklist_items')
        .select('*', { count: 'exact', head: true })
        .in('checklist_id', checklistIds);

      const { count: completedCount } = await supabase
        .from('checklist_items')
        .select('*', { count: 'exact', head: true })
        .in('checklist_id', checklistIds)
        .eq('completed', true);

      setChecklistStats({
        total: totalCount || 0,
        completed: completedCount || 0,
      });
    };

    fetchChecklistStats();

    // Subscribe to checklist changes
    const channel = supabase
      .channel(`checklist-preview-${card.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'checklists',
          filter: `card_id=eq.${card.id}`,
        },
        () => fetchChecklistStats()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'checklist_items',
        },
        () => fetchChecklistStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [card.id]);

  const isOverdue = card.due_date && new Date(card.due_date) < new Date();
  const isDueSoon = card.due_date && !isOverdue && 
    new Date(card.due_date).getTime() - new Date().getTime() < 24 * 60 * 60 * 1000;

  const priority = (card.priority || 'medium') as CardPriority;

  // Determine border color based on priority and due date
  const getBorderClass = () => {
    if (isOverdue) return 'border-red-500 border-2';
    if (isDueSoon) return 'border-yellow-500 border-2';
    if (priority === 'critical') return 'border-red-400 border-l-4';
    if (priority === 'high') return 'border-orange-400 border-l-4';
    return 'border-gray-200 dark:border-gray-600';
  };

  const handleSave = async () => {
    if (!editTitle.trim()) return;

    await supabase
      .from('cards')
      .update({
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        due_date: editDueDate ? new Date(editDueDate).toISOString() : null,
      })
      .eq('id', card.id);

    setEditing(false);
    if (onEditingCard) onEditingCard(null); // Clear editing status
  };

  const handleStartEditing = () => {
    setEditing(true);
    if (onEditingCard) onEditingCard(card.id); // Broadcast editing status
  };

  const handleCancelEditing = () => {
    setEditing(false);
    setEditTitle(card.title);
    setEditDescription(card.description || '');
    setEditDueDate(card.due_date ? new Date(card.due_date).toISOString().slice(0, 16) : '');
    if (onEditingCard) onEditingCard(null); // Clear editing status
  };

  const handleOpenDetailModal = () => {
    setShowDetailModal(true);
    if (onEditingCard) onEditingCard(card.id); // Broadcast editing status
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    if (onEditingCard) onEditingCard(null); // Clear editing status
  };

  const handleDelete = async () => {
    if (!confirm('Delete this card?')) return;
    await supabase.from('cards').delete().eq('id', card.id);
  };

  if (editing) {
    return (
      <div className="bg-white dark:bg-gray-700 rounded-lg p-3 shadow-sm border border-blue-500">
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-600 text-gray-900 dark:text-white text-sm mb-2"
          autoFocus
        />
        <textarea
          value={editDescription}
          onChange={(e) => setEditDescription(e.target.value)}
          placeholder="Description..."
          rows={2}
          className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-600 text-gray-900 dark:text-white text-sm mb-2 resize-none"
        />
        <div className="mb-2">
          <label className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
            <Calendar className="w-3 h-3" />
            Due Date
          </label>
          <input
            type="datetime-local"
            value={editDueDate}
            onChange={(e) => setEditDueDate(e.target.value)}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
          />
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={handleCancelEditing}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
          <button
            onClick={handleSave}
            className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            <Check className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`group bg-white dark:bg-gray-700 rounded-lg shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${getBorderClass()} ${
          isDragging || isSortableDragging ? 'opacity-50 shadow-lg' : ''
        }`}
      >
        {/* Card Editing Indicator - shows who else is editing this card */}
        {editingUsers.length > 0 && (
          <div className="px-3 pt-2">
            <CardEditingIndicator editingUsers={editingUsers} />
          </div>
        )}

        {/* Labels at top */}
        {labels.length > 0 && (
          <div className="px-3 pt-2">
            <LabelBadgeList labels={labels} maxDisplay={4} size="sm" />
          </div>
        )}

        <div className="p-3 pt-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 flex-1">
              <PriorityIndicator priority={priority} />
              <h4 className="text-sm font-medium text-gray-900 dark:text-white flex-1">
                {card.title}
              </h4>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenDetailModal();
                }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                title="Open details"
              >
                <Maximize2 className="w-3 h-3 text-gray-400" />
              </button>
              {canEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartEditing();
                  }}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                  title="Quick edit"
                >
                  <Edit2 className="w-3 h-3 text-gray-400" />
                </button>
              )}
              {canEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete();
                  }}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                  title="Delete"
                >
                  <Trash2 className="w-3 h-3 text-gray-400 hover:text-red-500" />
                </button>
              )}
            </div>
          </div>

          {card.description && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
              {card.description}
            </p>
          )}

          {/* Footer with indicators */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {card.due_date && (
              <div
                className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${
                  isOverdue
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                    : isDueSoon
                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                <Calendar className="w-3 h-3" />
                <span>
                  {new Date(card.due_date).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            )}
            
            {checklistStats.total > 0 && (
              <ChecklistProgressBadge
                completed={checklistStats.completed}
                total={checklistStats.total}
              />
            )}

            {attachmentCount > 0 && (
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <Paperclip className="w-3 h-3" />
                <span>{attachmentCount}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && (
        <CardDetailModal
          card={card}
          boardId={boardId}
          canEdit={canEdit}
          onClose={handleCloseDetailModal}
          onUpdate={() => {
            // Trigger a refresh by updating attachment count
            const fetchCount = async () => {
              const { count } = await supabase
                .from('attachments')
                .select('*', { count: 'exact', head: true })
                .eq('card_id', card.id);
              setAttachmentCount(count || 0);
            };
            fetchCount();
          }}
        />
      )}
    </>
  );
}
