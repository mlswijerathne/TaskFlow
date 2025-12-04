'use client';

import { use } from 'react';
import { ProtectedRoute } from '@/components/auth';
import { BoardView } from '@/components/boards';

interface BoardPageProps {
  params: Promise<{ id: string }>;
}

export default function BoardPage({ params }: BoardPageProps) {
  const { id } = use(params);
  
  return (
    <ProtectedRoute>
      <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <BoardView boardId={id} />
      </div>
    </ProtectedRoute>
  );
}
