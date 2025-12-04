'use client';

import { BoardMemberRole, BoardPermissions } from '@/types/database';

/**
 * Get permissions based on board member role
 */
export function getPermissionsForRole(role: BoardMemberRole | null): BoardPermissions {
  if (!role) {
    return {
      canEditBoard: false,
      canEditColumns: false,
      canEditCards: false,
      canManageMembers: false,
      canUploadAttachments: false,
      canDeleteBoard: false,
      role: null,
    };
  }

  switch (role) {
    case 'owner':
      return {
        canEditBoard: true,
        canEditColumns: true,
        canEditCards: true,
        canManageMembers: true,
        canUploadAttachments: true,
        canDeleteBoard: true,
        role: 'owner',
      };
    case 'editor':
      return {
        canEditBoard: false,
        canEditColumns: true,
        canEditCards: true,
        canManageMembers: false,
        canUploadAttachments: true,
        canDeleteBoard: false,
        role: 'editor',
      };
    case 'viewer':
      return {
        canEditBoard: false,
        canEditColumns: false,
        canEditCards: false,
        canManageMembers: false,
        canUploadAttachments: false,
        canDeleteBoard: false,
        role: 'viewer',
      };
    default:
      return {
        canEditBoard: false,
        canEditColumns: false,
        canEditCards: false,
        canManageMembers: false,
        canUploadAttachments: false,
        canDeleteBoard: false,
        role: null,
      };
  }
}

/**
 * Check if user can perform a specific action
 */
export function canPerformAction(
  permissions: BoardPermissions,
  action: 'editBoard' | 'editColumns' | 'editCards' | 'manageMembers' | 'uploadAttachments' | 'deleteBoard'
): boolean {
  switch (action) {
    case 'editBoard':
      return permissions.canEditBoard;
    case 'editColumns':
      return permissions.canEditColumns;
    case 'editCards':
      return permissions.canEditCards;
    case 'manageMembers':
      return permissions.canManageMembers;
    case 'uploadAttachments':
      return permissions.canUploadAttachments;
    case 'deleteBoard':
      return permissions.canDeleteBoard;
    default:
      return false;
  }
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: BoardMemberRole): string {
  switch (role) {
    case 'owner':
      return 'Owner';
    case 'editor':
      return 'Editor';
    case 'viewer':
      return 'Viewer';
    default:
      return 'Unknown';
  }
}

/**
 * Get role description
 */
export function getRoleDescription(role: BoardMemberRole): string {
  switch (role) {
    case 'owner':
      return 'Can manage board settings, members, and all content';
    case 'editor':
      return 'Can create, edit, and delete cards and columns';
    case 'viewer':
      return 'Can only view the board (read-only)';
    default:
      return 'Unknown role';
  }
}

/**
 * Get available roles for assignment (owners can't be changed)
 */
export function getAssignableRoles(): BoardMemberRole[] {
  return ['editor', 'viewer'];
}

/**
 * Check if a role can be changed to another role
 */
export function canChangeRole(
  currentUserRole: BoardMemberRole | null,
  targetMemberRole: BoardMemberRole,
  newRole: BoardMemberRole
): boolean {
  // Only owners can change roles
  if (currentUserRole !== 'owner') {
    return false;
  }
  
  // Can't change owner role (there must always be at least one owner)
  if (targetMemberRole === 'owner') {
    return false;
  }
  
  // Can't make someone else an owner through role change
  if (newRole === 'owner') {
    return false;
  }
  
  return true;
}

/**
 * Check if a member can be removed
 */
export function canRemoveMember(
  currentUserRole: BoardMemberRole | null,
  targetMemberRole: BoardMemberRole,
  isCurrentUser: boolean
): boolean {
  // Owners can remove anyone except themselves if they're the only owner
  if (currentUserRole === 'owner') {
    // Can remove other members
    if (!isCurrentUser) {
      return true;
    }
    // Self-removal handled separately (would need to check owner count)
  }
  
  // Non-owners can only leave (remove themselves)
  if (isCurrentUser && currentUserRole !== 'owner') {
    return true;
  }
  
  return false;
}

/**
 * Permission error messages
 */
export const PermissionErrors = {
  notMember: 'You are not a member of this board',
  viewerCannotEdit: 'Viewers cannot edit this board',
  onlyOwnerCanManageMembers: 'Only the board owner can manage members',
  onlyOwnerCanEditBoard: 'Only the board owner can edit board settings',
  cannotRemoveOnlyOwner: 'Cannot remove the only owner of the board',
  cannotChangeOwnerRole: 'Cannot change the owner role',
} as const;

/**
 * Wrap an action with permission check
 */
export function withPermissionCheck<T extends (...args: unknown[]) => unknown>(
  permissions: BoardPermissions,
  requiredPermission: keyof Omit<BoardPermissions, 'role'>,
  action: T,
  errorMessage?: string
): T {
  return ((...args: unknown[]) => {
    if (!permissions[requiredPermission]) {
      console.warn(errorMessage || `Permission denied: ${requiredPermission}`);
      return null;
    }
    return action(...args);
  }) as T;
}
