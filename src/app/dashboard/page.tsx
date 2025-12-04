'use client';

import { ProtectedRoute } from '@/components/auth';
import { Header } from '@/components/layout';
import { BoardList } from '@/components/boards';

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <BoardList />
        </main>
      </div>
    </ProtectedRoute>
  );
}
