'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, Attachment, CardPriority } from '@/types/database';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLabels, useCardLabels, useChecklists } from '@/hooks';
import { LabelSelector, LabelBadge } from '@/components/labels';
import { ChecklistSection } from '@/components/checklists';
import { PrioritySelector } from '@/components/priority';
import { 
  X, 
  Calendar, 
  FileText, 
  Paperclip, 
  Trash2, 
  Download,
  Upload,
  Loader2,
  File,
  Image as ImageIcon,
  Lock,
  Tag,
  CheckSquare,
  Plus,
  AlertTriangle
} from 'lucide-react';

interface CardDetailModalProps {
  card: Card;
  boardId: string;
  onClose: () => void;
  onUpdate: () => void;
  canEdit?: boolean;
}

export function CardDetailModal({ card, boardId, onClose, onUpdate, canEdit = true }: CardDetailModalProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || '');
  const [dueDate, setDueDate] = useState(
    card.due_date ? new Date(card.due_date).toISOString().slice(0, 16) : ''
  );
  const [priority, setPriority] = useState<CardPriority>((card.priority as CardPriority) || 'medium');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Labels hooks
  const { labels: boardLabels, createLabel } = useLabels(boardId);
  const { cardLabels, assignLabel, removeLabel } = useCardLabels(card.id, boardId);

  // Checklists hook
  const {
    checklists,
    loading: checklistsLoading,
    createChecklist,
    updateChecklist,
    deleteChecklist,
    addChecklistItem,
    toggleChecklistItem,
    updateChecklistItem,
    deleteChecklistItem,
  } = useChecklists(card.id);

  const fetchAttachments = useCallback(async () => {
    const { data, error } = await supabase
      .from('attachments')
      .select('*')
      .eq('card_id', card.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAttachments(data);
    }
  }, [card.id]);

  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('cards')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          due_date: dueDate ? new Date(dueDate).toISOString() : null,
          priority: priority,
        })
        .eq('id', card.id);

      if (!error) {
        onUpdate();
        onClose();
      }
    } catch (err) {
      console.error('Error saving card:', err);
    } finally {
      setSaving(false);
    }
  };

  const handlePriorityChange = async (newPriority: CardPriority): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('cards')
        .update({ priority: newPriority })
        .eq('id', card.id);

      if (!error) {
        setPriority(newPriority);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error updating priority:', err);
      return false;
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    try {
      // Create unique file path
      const fileExt = file.name.split('.').pop();
      const filePath = `${card.board_id}/${card.id}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('card-attachments')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        alert('Failed to upload file. Make sure the storage bucket is configured.');
        return;
      }

      // Create attachment record
      const { data: attachment, error: dbError } = await supabase
        .from('attachments')
        .insert({
          card_id: card.id,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type || 'application/octet-stream',
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (dbError) {
        console.error('DB error:', dbError);
        // Try to clean up the uploaded file
        await supabase.storage.from('card-attachments').remove([filePath]);
        alert('Failed to save attachment record.');
        return;
      }

      setAttachments([attachment, ...attachments]);
    } catch (err) {
      console.error('Error uploading file:', err);
      alert('An error occurred while uploading the file.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownload = async (attachment: Attachment) => {
    const { data, error } = await supabase.storage
      .from('card-attachments')
      .download(attachment.file_path);

    if (error) {
      console.error('Download error:', error);
      alert('Failed to download file.');
      return;
    }

    // Create download link
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = attachment.file_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDeleteAttachment = async (attachment: Attachment) => {
    if (!confirm('Delete this attachment?')) return;

    try {
      // Delete from storage
      await supabase.storage
        .from('card-attachments')
        .remove([attachment.file_path]);

      // Delete from database
      await supabase
        .from('attachments')
        .delete()
        .eq('id', attachment.id);

      setAttachments(attachments.filter((a) => a.id !== attachment.id));
    } catch (err) {
      console.error('Error deleting attachment:', err);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {canEdit ? 'Edit Card' : 'View Card'}
            </h2>
            {!canEdit && (
              <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                <Lock className="w-3 h-3" />
                Read-only
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <FileText className="w-4 h-4 inline mr-1" />
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => canEdit && setTitle(e.target.value)}
              readOnly={!canEdit}
              className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${!canEdit ? 'opacity-75 cursor-not-allowed' : ''}`}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => canEdit && setDescription(e.target.value)}
              readOnly={!canEdit}
              rows={4}
              placeholder={canEdit ? "Add a description..." : "No description"}
              className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${!canEdit ? 'opacity-75 cursor-not-allowed' : ''}`}
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <AlertTriangle className="w-4 h-4 inline mr-1" />
              Priority
            </label>
            <PrioritySelector
              priority={priority}
              onPriorityChange={handlePriorityChange}
              disabled={!canEdit}
            />
          </div>

          {/* Labels */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Tag className="w-4 h-4 inline mr-1" />
              Labels
            </label>
            {cardLabels.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {cardLabels.map((label) => (
                  <LabelBadge
                    key={label.id}
                    label={label}
                    size="md"
                    showName={true}
                    onRemove={canEdit ? () => removeLabel(label.id) : undefined}
                  />
                ))}
              </div>
            )}
            {canEdit && (
              <LabelSelector
                boardLabels={boardLabels}
                cardLabels={cardLabels}
                onAssignLabel={assignLabel}
                onRemoveLabel={removeLabel}
                onCreateLabel={createLabel}
                disabled={!canEdit}
              />
            )}
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <Calendar className="w-4 h-4 inline mr-1" />
              Due Date
            </label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => canEdit && setDueDate(e.target.value)}
              readOnly={!canEdit}
              className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${!canEdit ? 'opacity-75 cursor-not-allowed' : ''}`}
            />
          </div>

          {/* Checklists */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                <CheckSquare className="w-4 h-4 inline mr-1" />
                Checklists
              </label>
              {canEdit && (
                <button
                  onClick={() => createChecklist('Checklist')}
                  className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <Plus className="w-4 h-4" />
                  Add Checklist
                </button>
              )}
            </div>
            {checklistsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : checklists.length > 0 ? (
              <div className="space-y-3">
                {checklists.map((checklist) => (
                  <ChecklistSection
                    key={checklist.id}
                    checklist={checklist}
                    onUpdateTitle={(title) => updateChecklist(checklist.id, title)}
                    onDelete={() => deleteChecklist(checklist.id)}
                    onAddItem={(title) => addChecklistItem(checklist.id, title).then(item => !!item)}
                    onToggleItem={toggleChecklistItem}
                    onUpdateItem={(itemId, title) => updateChecklistItem(itemId, { title })}
                    onDeleteItem={deleteChecklistItem}
                    disabled={!canEdit}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                No checklists yet
              </p>
            )}
          </div>

          {/* Attachments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Paperclip className="w-4 h-4 inline mr-1" />
              Attachments
            </label>

            {/* Upload button */}
            {canEdit && (
            <div className="mb-3">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className={`inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                  uploading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload File
                  </>
                )}
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Max file size: 10MB
              </p>
            </div>
            )}

            {/* Attachments list */}
            {attachments.length > 0 ? (
              <div className="space-y-2">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="text-gray-500 dark:text-gray-400">
                        {getFileIcon(attachment.mime_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {attachment.file_name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatFileSize(attachment.file_size)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDownload(attachment)}
                        className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                        title="Download"
                      >
                        <Download className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      </button>
                      {canEdit && (
                        <button
                          onClick={() => handleDeleteAttachment(attachment)}
                          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                No attachments yet
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {canEdit ? 'Cancel' : 'Close'}
          </button>
          {canEdit && (
            <button
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Changes
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
