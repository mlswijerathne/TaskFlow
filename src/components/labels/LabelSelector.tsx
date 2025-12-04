'use client';

import { useState } from 'react';
import { Label, LABEL_COLORS } from '@/types/database';
import { LabelBadge } from './LabelBadge';
import { Check, Plus, X, Loader2 } from 'lucide-react';

interface LabelSelectorProps {
  boardLabels: Label[];
  cardLabels: Label[];
  onAssignLabel: (labelId: string) => Promise<boolean>;
  onRemoveLabel: (labelId: string) => Promise<boolean>;
  onCreateLabel: (name: string, color: string) => Promise<Label | null>;
  disabled?: boolean;
}

export function LabelSelector({
  boardLabels,
  cardLabels,
  onAssignLabel,
  onRemoveLabel,
  onCreateLabel,
  disabled = false,
}: LabelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0]);
  const [loading, setLoading] = useState(false);

  const cardLabelIds = new Set(cardLabels.map(l => l.id));

  const handleToggleLabel = async (label: Label) => {
    if (disabled || loading) return;

    setLoading(true);
    try {
      if (cardLabelIds.has(label.id)) {
        await onRemoveLabel(label.id);
      } else {
        await onAssignLabel(label.id);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLabel = async () => {
    if (!newLabelName.trim() || disabled || loading) return;

    setLoading(true);
    try {
      const newLabel = await onCreateLabel(newLabelName.trim(), newLabelColor);
      if (newLabel) {
        // Optionally auto-assign the new label
        await onAssignLabel(newLabel.id);
        setNewLabelName('');
        setNewLabelColor(LABEL_COLORS[0]);
        setShowCreateForm(false);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Plus className="w-4 h-4" />
        Labels
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => {
              setIsOpen(false);
              setShowCreateForm(false);
            }}
          />
          <div className="absolute left-0 top-full mt-1 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 overflow-hidden">
            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Labels
              </p>
            </div>

            {!showCreateForm ? (
              <>
                <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                  {boardLabels.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-3">
                      No labels yet
                    </p>
                  ) : (
                    boardLabels.map((label) => (
                      <button
                        key={label.id}
                        onClick={() => handleToggleLabel(label)}
                        disabled={loading}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                      >
                        <div
                          className="w-full h-6 rounded flex items-center justify-between px-2"
                          style={{ backgroundColor: label.color + '30' }}
                        >
                          <span
                            className="text-sm font-medium"
                            style={{ color: label.color }}
                          >
                            {label.name}
                          </span>
                          {cardLabelIds.has(label.id) && (
                            <Check
                              className="w-4 h-4"
                              style={{ color: label.color }}
                            />
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>

                <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Create new label
                  </button>
                </div>
              </>
            ) : (
              <div className="p-3 space-y-3">
                <input
                  type="text"
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  placeholder="Label name..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />

                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Select color
                  </p>
                  <div className="grid grid-cols-5 gap-1.5">
                    {LABEL_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setNewLabelColor(color)}
                        className={`w-8 h-8 rounded-lg transition-all ${
                          newLabelColor === color
                            ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-800'
                            : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewLabelName('');
                    }}
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateLabel}
                    disabled={!newLabelName.trim() || loading}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Create'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
