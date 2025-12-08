'use client';

import { useState } from 'react';
import { X, Settings, Users, Shield } from 'lucide-react';
import { useBoardMembers } from '@/hooks/useBoardMembers';
import { MemberList, AddMemberInput } from '@/components/members';
import { BoardMemberRole } from '@/types/database';

interface BoardSettingsModalProps {
  boardId: string;
  boardTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'members' | 'settings';

export function BoardSettingsModal({
  boardId,
  boardTitle,
  isOpen,
  onClose,
}: BoardSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('members');
  const {
    members,
    loading,
    error,
    currentUserRole,
    permissions,
    addMember,
    updateMemberRole,
    removeMember,
  } = useBoardMembers(boardId);

  if (!isOpen) return null;

  const handleRoleChange = async (userId: string, newRole: BoardMemberRole) => {
    return updateMemberRole(userId, newRole);
  };

  const handleRemoveMember = async (userId: string) => {
    return removeMember(userId);
  };

  const handleAddMember = async (email: string, role?: BoardMemberRole) => {
    return addMember(email, role);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Board Settings
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {boardTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('members')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'members'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <Users className="w-4 h-4" />
            Members ({members.length})
          </button>
          {permissions.canEditBoard && (
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'settings'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <Shield className="w-4 h-4" />
              Settings
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'members' && (
            <div className="space-y-6">
              {/* Add Member Section - Only visible to owners */}
              {permissions.canManageMembers && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    Add Member
                  </h3>
                  <AddMemberInput
                    onAddMember={handleAddMember}
                    disabled={!permissions.canManageMembers}
                  />
                </div>
              )}

              {/* Current Role Display */}
              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm text-blue-700 dark:text-blue-300">
                  Your role: <strong className="capitalize">{currentUserRole || 'None'}</strong>
                </span>
              </div>

              {/* Error Display */}
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Member List */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Board Members
                </h3>
                <MemberList
                  members={members}
                  canManageMembers={permissions.canManageMembers}
                  onRoleChange={handleRoleChange}
                  onRemoveMember={handleRemoveMember}
                  loading={loading}
                />
              </div>
            </div>
          )}

          {activeTab === 'settings' && permissions.canEditBoard && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Board Information
                </h3>
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Board settings configuration will be available here.
                    Currently showing the members management tab.
                  </p>
                </div>
              </div>

              {/* Danger Zone */}
              {permissions.canDeleteBoard && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-3">
                    Danger Zone
                  </h3>
                  <div className="p-4 border border-red-200 dark:border-red-900/50 rounded-lg bg-red-50 dark:bg-red-900/10">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      Once you delete a board, there is no going back. This action cannot be undone.
                    </p>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this board? This action cannot be undone.')) {
                          // Handle board deletion
                          console.log('Delete board');
                        }
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                    >
                      Delete Board
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
