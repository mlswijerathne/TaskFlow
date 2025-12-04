'use client';

import { useState } from 'react';
import { BoardMemberRole } from '@/types/database';
import { UserPlus, Loader2 } from 'lucide-react';

interface AddMemberInputProps {
  onAddMember: (email: string, role?: BoardMemberRole) => Promise<{ success: boolean; error?: string }>;
  disabled?: boolean;
}

export function AddMemberInput({ onAddMember, disabled = false }: AddMemberInputProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<BoardMemberRole>('viewer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    const result = await onAddMember(email.trim(), role);

    setLoading(false);

    if (result.success) {
      setSuccess(true);
      setEmail('');
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setError(result.error || 'Failed to add member');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-2">
        <div className="flex-1">
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            placeholder="Enter email address..."
            disabled={disabled || loading}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
          />
        </div>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as BoardMemberRole)}
          disabled={disabled || loading}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
        >
          <option value="viewer">Viewer</option>
          <option value="editor">Editor</option>
        </select>
        <button
          type="submit"
          disabled={disabled || loading || !email.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <UserPlus className="w-4 h-4" />
          )}
          Add
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {success && (
        <p className="text-sm text-green-600 dark:text-green-400">
          Member added successfully!
        </p>
      )}
    </form>
  );
}
