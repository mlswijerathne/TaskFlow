'use client';

import { useState } from 'react';
import { bulkCreateCards, bulkMoveCards, bulkDeleteCards } from '@/lib/edgeFunctions';
import { toast } from 'react-hot-toast';

interface BulkOperationsProps {
  boardId: string;
  columnId?: string;
}

export function BulkOperations({ boardId, columnId }: BulkOperationsProps) {
  const [loading, setLoading] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvText, setCsvText] = useState('');

  const handleBulkImport = async () => {
    if (!columnId) {
      toast.error('Please select a column first');
      return;
    }

    setLoading(true);
    try {
      // Parse CSV text (simple format: title,description,priority)
      const lines = csvText.trim().split('\n');
      const cards = lines.slice(1).map(line => {
        const [title, description, priority] = line.split(',').map(s => s.trim());
        return { title, description, priority };
      });

      const result = await bulkCreateCards(boardId, columnId, cards);
      
      if (result.success) {
        toast.success(`Successfully created ${result.results.successful} cards!`);
        if (result.results.failed > 0) {
          toast.error(`Failed to create ${result.results.failed} cards`);
        }
        setShowImportModal(false);
        setCsvText('');
      }
    } catch (error) {
      console.error('Bulk import failed:', error);
      toast.error(error instanceof Error ? error.message : 'Bulk import failed');
    } finally {
      setLoading(false);
    }
  };

  // Future feature: Bulk move cards between columns
  /* const handleBulkMove = async (cardIds: string[], targetColumnId: string) => {
    setLoading(true);
    try {
      const result = await bulkMoveCards(boardId, cardIds, targetColumnId);
      
      if (result.success) {
        toast.success(`Moved ${result.results.successful} cards successfully!`);
      }
    } catch (error) {
      console.error('Bulk move failed:', error);
      toast.error(error instanceof Error ? error.message : 'Bulk move failed');
    } finally {
      setLoading(false);
    }
  }; */

  // Future feature: Bulk delete cards
  /* const handleBulkDelete = async (cardIds: string[]) => {
    if (!confirm(`Are you sure you want to delete ${cardIds.length} cards? This cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      const result = await bulkDeleteCards(boardId, cardIds);
      
      if (result.success) {
        toast.success(`Deleted ${result.results.successful} cards successfully!`);
      }
    } catch (error) {
      console.error('Bulk delete failed:', error);
      toast.error(error instanceof Error ? error.message : 'Bulk delete failed');
    } finally {
      setLoading(false);
    }
  }; */

  return (
    <>
      <button
        onClick={() => setShowImportModal(true)}
        disabled={loading || !columnId}
        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
      >
        {loading ? 'Processing...' : 'Bulk Import Cards'}
      </button>

      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <h3 className="text-xl font-bold mb-4">Bulk Import Cards</h3>
            
            <p className="text-sm text-gray-600 mb-2">
              Paste CSV data (format: title,description,priority)
            </p>
            
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="title,description,priority
Task 1,Description for task 1,high
Task 2,Description for task 2,medium
Task 3,Description for task 3,low"
              className="w-full h-64 p-3 border rounded font-mono text-sm"
              disabled={loading}
            />
            
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleBulkImport}
                disabled={loading || !csvText.trim()}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
              >
                {loading ? 'Importing...' : 'Import Cards'}
              </button>
              
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setCsvText('');
                }}
                disabled={loading}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
