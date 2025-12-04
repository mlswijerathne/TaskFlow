'use client';

import { useState } from 'react';
import { Label, LABEL_COLORS } from '@/types/database';
import { Edit2, Trash2, Plus, X, Loader2 } from 'lucide-react';

interface LabelManagerProps {
  labels: Label[];
  onCreateLabel: (name: string, color: string) => Promise<Label | null>;
  onUpdateLabel: (labelId: string, updates: { name?: string; color?: string }) => Promise<boolean>;
  onDeleteLabel: (labelId: string) => Promise<boolean>;
  disabled?: boolean;
}

export function LabelManager({
  labels,
  onCreateLabel,
  onUpdateLabel,
  onDeleteLabel,
  disabled = false,
}: LabelManagerProps) {
  const [editingLabel, setEditingLabel] = useState<Label | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0]);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!newLabelName.trim() || loading) return;

    setLoading(true);
    try {
      const result = await onCreateLabel(newLabelName.trim(), newLabelColor);
      if (result) {
        setNewLabelName('');
        setNewLabelColor(LABEL_COLORS[0]);
        setShowCreateForm(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingLabel || !editingLabel.name.trim() || loading) return;

    setLoading(true);
    try {
      const result = await onUpdateLabel(editingLabel.id, {
        name: editingLabel.name,
        color: editingLabel.color,
      });
      if (result) {
        setEditingLabel(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (labelId: string) => {
    if (!confirm('Delete this label? It will be removed from all cards.')) return;

    setLoading(true);
    try {
      await onDeleteLabel(labelId);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Board Labels
        </h4>
        {!showCreateForm && !editingLabel && (
          <button
            onClick={() => setShowCreateForm(true)}
            disabled={disabled}
            className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Add Label
          </button>
        )}
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-3">
          <input
            type="text"
            value={newLabelName}
            onChange={(e) => setNewLabelName(e.target.value)}
            placeholder="Label name..."
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <div className="flex flex-wrap gap-1.5">
            {LABEL_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setNewLabelColor(color)}
                className={`w-6 h-6 rounded transition-all ${
                  newLabelColor === color ? 'ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-gray-700' : ''
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowCreateForm(false);
                setNewLabelName('');
              }}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!newLabelName.trim() || loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Create
            </button>
          </div>
        </div>
      )}

      {/* Label List */}
      <div className="space-y-2">
        {labels.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            No labels created yet
          </p>
        ) : (
          labels.map((label) => (
            <div key={label.id}>
              {editingLabel?.id === label.id ? (
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-3">
                  <input
                    type="text"
                    value={editingLabel.name}
                    onChange={(e) =>
                      setEditingLabel({ ...editingLabel, name: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {LABEL_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() =>
                          setEditingLabel({ ...editingLabel, color })
                        }
                        className={`w-6 h-6 rounded transition-all ${
                          editingLabel.color === color
                            ? 'ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-gray-700'
                            : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingLabel(null)}
                      className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpdate}
                      disabled={!editingLabel.name.trim() || loading}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg group">
                  <div
                    className="flex-1 h-8 rounded flex items-center px-3"
                    style={{ backgroundColor: label.color + '30' }}
                  >
                    <span
                      className="text-sm font-medium"
                      style={{ color: label.color }}
                    >
                      {label.name}
                    </span>
                  </div>
                  {!disabled && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditingLabel(label)}
                        className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4 text-gray-500" />
                      </button>
                      <button
                        onClick={() => handleDelete(label.id)}
                        className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
