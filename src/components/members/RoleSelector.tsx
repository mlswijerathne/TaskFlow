'use client';

import { useState } from 'react';
import { BoardMemberRole } from '@/types/database';
import { getRoleDisplayName, getRoleDescription, getAssignableRoles } from '@/lib/permissions';
import { ChevronDown, Shield, Edit2, Eye } from 'lucide-react';

interface RoleSelectorProps {
  currentRole: BoardMemberRole;
  onRoleChange: (newRole: BoardMemberRole) => void;
  disabled?: boolean;
  isOwner?: boolean;
}

export function RoleSelector({ 
  currentRole, 
  onRoleChange, 
  disabled = false,
  isOwner = false 
}: RoleSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getRoleIcon = (role: BoardMemberRole) => {
    switch (role) {
      case 'owner':
        return <Shield className="w-4 h-4 text-yellow-500" />;
      case 'editor':
        return <Edit2 className="w-4 h-4 text-blue-500" />;
      case 'viewer':
        return <Eye className="w-4 h-4 text-gray-500" />;
      default:
        return null;
    }
  };

  // If owner, show badge only (no dropdown)
  if (isOwner || currentRole === 'owner') {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-lg text-sm font-medium">
        <Shield className="w-3.5 h-3.5" />
        Owner
      </div>
    );
  }

  const assignableRoles = getAssignableRoles();

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-sm transition-colors ${
          disabled
            ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 cursor-not-allowed'
            : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
        }`}
      >
        {getRoleIcon(currentRole)}
        <span>{getRoleDisplayName(currentRole)}</span>
        {!disabled && <ChevronDown className="w-3.5 h-3.5 ml-0.5" />}
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
            {assignableRoles.map((role) => (
              <button
                key={role}
                onClick={() => {
                  onRoleChange(role);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-left flex items-start gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                  role === currentRole ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
              >
                <div className="mt-0.5">{getRoleIcon(role)}</div>
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {getRoleDisplayName(role)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {getRoleDescription(role)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
