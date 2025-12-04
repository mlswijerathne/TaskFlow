'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  BoardMember, 
  BoardMemberRole, 
  BoardMemberWithProfile, 
  UserProfile,
  BoardPermissions 
} from '@/types/database';
import { getPermissionsForRole } from '@/lib/permissions';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface UseBoardMembersReturn {
  members: BoardMemberWithProfile[];
  loading: boolean;
  error: string | null;
  currentUserRole: BoardMemberRole | null;
  permissions: BoardPermissions;
  addMember: (email: string, role?: BoardMemberRole) => Promise<{ success: boolean; error?: string }>;
  updateMemberRole: (userId: string, newRole: BoardMemberRole) => Promise<{ success: boolean; error?: string }>;
  removeMember: (userId: string) => Promise<{ success: boolean; error?: string }>;
  refetch: () => Promise<void>;
}

export function useBoardMembers(boardId: string): UseBoardMembersReturn {
  const { user } = useAuth();
  const [members, setMembers] = useState<BoardMemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch members with their profiles
  const fetchMembers = useCallback(async () => {
    if (!boardId) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch board members
      const { data: membersData, error: membersError } = await supabase
        .from('board_members')
        .select('*')
        .eq('board_id', boardId)
        .order('created_at', { ascending: true });

      if (membersError) {
        throw membersError;
      }

      if (!membersData || membersData.length === 0) {
        setMembers([]);
        setLoading(false);
        return;
      }

      // Fetch user profiles for all members
      const userIds = membersData.map(m => m.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('user_profiles')
        .select('*')
        .in('id', userIds);

      if (profilesError) {
        console.warn('Error fetching profiles:', profilesError);
      }

      // Create a map of profiles for quick lookup
      const profilesMap = new Map<string, UserProfile>();
      (profilesData || []).forEach(profile => {
        profilesMap.set(profile.id, profile);
      });

      // Combine members with profiles
      const membersWithProfiles: BoardMemberWithProfile[] = membersData.map(member => ({
        ...member,
        user_profile: profilesMap.get(member.user_id) || null,
      }));

      setMembers(membersWithProfiles);
    } catch (err) {
      console.error('Error fetching board members:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch members');
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  // Initial fetch
  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Set up realtime subscription for member changes
  useEffect(() => {
    if (!boardId) return;

    const channel = supabase
      .channel(`board-members-${boardId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'board_members',
          filter: `board_id=eq.${boardId}`,
        },
        (payload: RealtimePostgresChangesPayload<BoardMember>) => {
          handleMemberChange(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [boardId]);

  const handleMemberChange = async (payload: RealtimePostgresChangesPayload<BoardMember>) => {
    const { eventType, new: newMember, old: oldMember } = payload;

    if (eventType === 'INSERT' && newMember) {
      // Fetch profile for new member
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', (newMember as BoardMember).user_id)
        .single();

      const memberWithProfile: BoardMemberWithProfile = {
        ...(newMember as BoardMember),
        user_profile: profile || null,
      };

      setMembers(prev => [...prev, memberWithProfile]);
    } else if (eventType === 'UPDATE' && newMember) {
      setMembers(prev =>
        prev.map(m =>
          m.id === (newMember as BoardMember).id
            ? { ...m, ...(newMember as BoardMember) }
            : m
        )
      );
    } else if (eventType === 'DELETE' && oldMember) {
      setMembers(prev => prev.filter(m => m.id !== (oldMember as BoardMember).id));
    }
  };

  // Get current user's role
  const currentUserRole = user
    ? (members.find(m => m.user_id === user.id)?.role as BoardMemberRole | undefined) ?? null
    : null;

  // Get permissions based on role
  const permissions = getPermissionsForRole(currentUserRole);

  // Add a member by email
  const addMember = async (
    email: string,
    role: BoardMemberRole = 'viewer'
  ): Promise<{ success: boolean; error?: string }> => {
    if (!permissions.canManageMembers) {
      return { success: false, error: 'Only owners can add members' };
    }

    try {
      // Look up user by email
      const { data: userData, error: userError } = await supabase
        .rpc('get_user_by_email', { p_email: email });

      if (userError || !userData || userData.length === 0) {
        return { success: false, error: 'User not found. Make sure they have signed up.' };
      }

      const targetUser = userData[0];

      // Check if already a member
      const existingMember = members.find(m => m.user_id === targetUser.id);
      if (existingMember) {
        return { success: false, error: 'User is already a member of this board' };
      }

      // Add the member
      const { error: insertError } = await supabase
        .from('board_members')
        .insert({
          board_id: boardId,
          user_id: targetUser.id,
          role: role,
        });

      if (insertError) {
        throw insertError;
      }

      return { success: true };
    } catch (err) {
      console.error('Error adding member:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to add member' 
      };
    }
  };

  // Update a member's role
  const updateMemberRole = async (
    userId: string,
    newRole: BoardMemberRole
  ): Promise<{ success: boolean; error?: string }> => {
    if (!permissions.canManageMembers) {
      return { success: false, error: 'Only owners can change roles' };
    }

    const targetMember = members.find(m => m.user_id === userId);
    if (!targetMember) {
      return { success: false, error: 'Member not found' };
    }

    if (targetMember.role === 'owner') {
      return { success: false, error: 'Cannot change owner role' };
    }

    if (newRole === 'owner') {
      return { success: false, error: 'Cannot assign owner role' };
    }

    try {
      const { error: updateError } = await supabase
        .from('board_members')
        .update({ role: newRole })
        .eq('board_id', boardId)
        .eq('user_id', userId);

      if (updateError) {
        throw updateError;
      }

      return { success: true };
    } catch (err) {
      console.error('Error updating member role:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to update role' 
      };
    }
  };

  // Remove a member
  const removeMember = async (
    userId: string
  ): Promise<{ success: boolean; error?: string }> => {
    const targetMember = members.find(m => m.user_id === userId);
    if (!targetMember) {
      return { success: false, error: 'Member not found' };
    }

    const isCurrentUser = userId === user?.id;

    // Check if user can remove this member
    if (!isCurrentUser && !permissions.canManageMembers) {
      return { success: false, error: 'Only owners can remove members' };
    }

    if (targetMember.role === 'owner') {
      // Check if there's only one owner
      const ownerCount = members.filter(m => m.role === 'owner').length;
      if (ownerCount <= 1) {
        return { success: false, error: 'Cannot remove the only owner' };
      }
    }

    try {
      const { error: deleteError } = await supabase
        .from('board_members')
        .delete()
        .eq('board_id', boardId)
        .eq('user_id', userId);

      if (deleteError) {
        throw deleteError;
      }

      return { success: true };
    } catch (err) {
      console.error('Error removing member:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to remove member' 
      };
    }
  };

  return {
    members,
    loading,
    error,
    currentUserRole,
    permissions,
    addMember,
    updateMemberRole,
    removeMember,
    refetch: fetchMembers,
  };
}
