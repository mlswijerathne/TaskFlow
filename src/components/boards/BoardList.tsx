'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Board, BoardTemplate } from '@/types/database';
import { Plus, LayoutDashboard, Loader2, Trash2, Edit2, LayoutTemplate } from 'lucide-react';
import { TemplateGalleryModal } from '@/components/templates';
import { useBoardTemplates } from '@/hooks';

export function BoardList() {
  const { user } = useAuth();
  const router = useRouter();
  const { createBoardFromTemplate } = useBoardTemplates();
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [newBoardDescription, setNewBoardDescription] = useState('');

  useEffect(() => {
    if (user) {
      fetchBoards();
    }
  }, [user]);

  const fetchBoards = async () => {
    try {
      const { data, error } = await supabase
        .from('boards')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBoards(data || []);
    } catch (err) {
      console.error('Error fetching boards:', err);
    } finally {
      setLoading(false);
    }
  };

  const createBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newBoardTitle.trim()) return;

    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('boards')
        .insert({
          title: newBoardTitle.trim(),
          description: newBoardDescription.trim() || null,
          owner: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Create default columns
      if (data) {
        const defaultColumns = ['To Do', 'In Progress', 'Done'];
        await supabase.from('columns').insert(
          defaultColumns.map((title, index) => ({
            board_id: data.id,
            title,
            position: index,
          }))
        );
      }

      setBoards([data, ...boards]);
      setShowCreateModal(false);
      setNewBoardTitle('');
      setNewBoardDescription('');
    } catch (err) {
      console.error('Error creating board:', err);
    } finally {
      setCreating(false);
    }
  };

  const deleteBoard = async (boardId: string) => {
    if (!confirm('Are you sure you want to delete this board? All columns and cards will be deleted.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('boards')
        .delete()
        .eq('id', boardId);

      if (error) throw error;
      setBoards(boards.filter((b) => b.id !== boardId));
    } catch (err) {
      console.error('Error deleting board:', err);
    }
  };

  const openEditModal = (board: Board, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingBoard(board);
    setNewBoardTitle(board.title);
    setNewBoardDescription(board.description || '');
    setShowEditModal(true);
  };

  const updateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBoard || !newBoardTitle.trim()) return;

    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('boards')
        .update({
          title: newBoardTitle.trim(),
          description: newBoardDescription.trim() || null,
        })
        .eq('id', editingBoard.id)
        .select()
        .single();

      if (error) throw error;

      setBoards(boards.map((b) => (b.id === editingBoard.id ? data : b)));
      setShowEditModal(false);
      setEditingBoard(null);
      setNewBoardTitle('');
      setNewBoardDescription('');
    } catch (err) {
      console.error('Error updating board:', err);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Your Boards</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTemplateGallery(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <LayoutTemplate className="w-5 h-5" />
            From Template
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Board
          </button>
        </div>
      </div>

      {boards.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <LayoutDashboard className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No boards yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Create your first board to get started
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Board
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {boards.map((board) => (
            <div
              key={board.id}
              className="group relative bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700"
            >
              <Link href={`/boards/${board.id}`} className="block p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {board.title}
                </h3>
                {board.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {board.description}
                  </p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-4">
                  Created {new Date(board.created_at).toLocaleDateString()}
                </p>
              </Link>
              <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button
                  onClick={(e) => openEditModal(board, e)}
                  className="p-2 text-gray-400 hover:text-blue-500"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    deleteBoard(board.id);
                  }}
                  className="p-2 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Board Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Create New Board
              </h3>
              <form onSubmit={createBoard}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Board Title
                  </label>
                  <input
                    type="text"
                    value={newBoardTitle}
                    onChange={(e) => setNewBoardTitle(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="My Awesome Project"
                  />
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    value={newBoardDescription}
                    onChange={(e) => setNewBoardDescription(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="A brief description of this board..."
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating || !newBoardTitle.trim()}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Board Modal */}
      {showEditModal && editingBoard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Edit Board
              </h3>
              <form onSubmit={updateBoard}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Board Title
                  </label>
                  <input
                    type="text"
                    value={newBoardTitle}
                    onChange={(e) => setNewBoardTitle(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="My Awesome Project"
                  />
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    value={newBoardDescription}
                    onChange={(e) => setNewBoardDescription(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="A brief description of this board..."
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingBoard(null);
                      setNewBoardTitle('');
                      setNewBoardDescription('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating || !newBoardTitle.trim()}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Template Gallery Modal */}
      <TemplateGalleryModal
        isOpen={showTemplateGallery}
        onClose={() => setShowTemplateGallery(false)}
        onSelectTemplate={async (template) => {
          if (template) {
            // Create board from template
            const boardId = await createBoardFromTemplate(template.id, template.name);
            if (boardId) {
              // Refresh boards and navigate to the new board
              await fetchBoards();
              setShowTemplateGallery(false);
              router.push(`/boards/${boardId}`);
            }
          } else {
            // Blank board selected - create a blank board with default columns
            if (!user) return;
            
            const { data, error } = await supabase
              .from('boards')
              .insert({
                title: 'New Board',
                description: null,
                owner: user.id,
              })
              .select()
              .single();

            if (error) {
              console.error('Error creating blank board:', error);
              return;
            }

            // Create default columns
            if (data) {
              const defaultColumns = ['To Do', 'In Progress', 'Done'];
              await supabase.from('columns').insert(
                defaultColumns.map((title, index) => ({
                  board_id: data.id,
                  title,
                  position: index,
                }))
              );
              
              await fetchBoards();
              setShowTemplateGallery(false);
              router.push(`/boards/${data.id}`);
            }
          }
        }}
      />
    </div>
  );
}
