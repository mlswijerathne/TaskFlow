'use client';

import { BoardMemberRole, BoardMemberWithProfile } from '@/types/database';
import { RoleSelector } from './RoleSelector';
import { useAuth } from '@/contexts/AuthContext';
import { Trash2, User, Loader2 } from 'lucide-react';

interface MemberListProps {
  members: BoardMemberWithProfile[];
  canManageMembers: boolean;
  onRoleChange: (userId: string, newRole: BoardMemberRole) => Promise<{ success: boolean; error?: string }>;
  onRemoveMember: (userId: string) => Promise<{ success: boolean; error?: string }>;
  loading?: boolean;
}

export function MemberList({
  members,
  canManageMembers,
  onRoleChange,
  onRemoveMember,
  loading = false,
}: MemberListProps) {
  const { user } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No members found
      </div>
    );
  }

  const handleRoleChange = async (userId: string, newRole: BoardMemberRole) => {
    const result = await onRoleChange(userId, newRole);
    if (!result.success) {
      alert(result.error || 'Failed to change role');
    }
  };

  const handleRemove = async (userId: string, displayName?: string) => {
    const isCurrentUser = userId === user?.id;
    const confirmMessage = isCurrentUser
      ? 'Are you sure you want to leave this board?'
      : `Are you sure you want to remove ${displayName || 'this member'}?`;

    if (!confirm(confirmMessage)) return;

    const result = await onRemoveMember(userId);
    if (!result.success) {
      alert(result.error || 'Failed to remove member');
    }
  };

  return (
    <div className="max-h-64 overflow-y-auto space-y-2">
      {members.map((member) => {
        const isCurrentUser = member.user_id === user?.id;
        const isOwner = member.role === 'owner';
        const canEditThisMember = canManageMembers && !isOwner;
        const canRemoveThisMember = 
          (canManageMembers && !isOwner) || // Owner can remove non-owners
          (isCurrentUser && !isOwner); // Non-owner can leave

        return (
          <div
            key={member.id}
            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
          >
            <div className="flex items-center gap-3">
              {/* Avatar */}
              {member.user_profile?.avatar_url ? (
                <img
                  src={member.user_profile.avatar_url}
                  alt={member.user_profile.display_name || 'Member'}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </div>
              )}

              {/* Member Info */}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {member.user_profile?.display_name || 'Unknown User'}
                  </span>
                  {isCurrentUser && (
                    <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                      You
                    </span>
                  )}
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {member.user_profile?.email || 'No email'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Role Selector */}
              <RoleSelector
                currentRole={member.role}
                onRoleChange={(newRole) => handleRoleChange(member.user_id, newRole)}
                disabled={!canEditThisMember}
                isOwner={isOwner}
              />

              {/* Remove Button */}
              {canRemoveThisMember && (
                <button
                  onClick={() => handleRemove(member.user_id, member.user_profile?.display_name || undefined)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title={isCurrentUser ? 'Leave board' : 'Remove member'}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
