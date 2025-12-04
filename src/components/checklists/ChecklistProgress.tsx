'use client';

interface ChecklistProgressProps {
  completed: number;
  total: number;
  showText?: boolean;
  size?: 'sm' | 'md';
}

export function ChecklistProgress({
  completed,
  total,
  showText = true,
  size = 'md',
}: ChecklistProgressProps) {
  if (total === 0) return null;

  const percent = Math.round((completed / total) * 100);
  const isComplete = percent === 100;

  const heightClass = size === 'sm' ? 'h-1' : 'h-1.5';
  const textClass = size === 'sm' ? 'text-[10px]' : 'text-xs';

  return (
    <div className="flex items-center gap-2">
      {showText && (
        <span className={`${textClass} text-gray-500 dark:text-gray-400 min-w-[2rem]`}>
          {completed}/{total}
        </span>
      )}
      <div className={`flex-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ${heightClass}`}>
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isComplete
              ? 'bg-green-500'
              : percent >= 50
              ? 'bg-blue-500'
              : 'bg-gray-400 dark:bg-gray-500'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {showText && (
        <span
          className={`${textClass} min-w-[2.5rem] text-right ${
            isComplete
              ? 'text-green-600 dark:text-green-400 font-medium'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          {percent}%
        </span>
      )}
    </div>
  );
}

interface ChecklistProgressBadgeProps {
  completed: number;
  total: number;
}

export function ChecklistProgressBadge({ completed, total }: ChecklistProgressBadgeProps) {
  if (total === 0) return null;

  const isComplete = completed === total;

  return (
    <div
      className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
        isComplete
          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
      }`}
    >
      <svg
        className="w-3 h-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
        />
      </svg>
      <span>{completed}/{total}</span>
    </div>
  );
}
