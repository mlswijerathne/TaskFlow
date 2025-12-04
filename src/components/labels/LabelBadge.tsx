'use client';

import { Label } from '@/types/database';

interface LabelBadgeProps {
  label: Label;
  size?: 'sm' | 'md';
  showName?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
}

export function LabelBadge({
  label,
  size = 'md',
  showName = true,
  onClick,
  onRemove,
}: LabelBadgeProps) {
  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[10px]',
    md: 'px-2 py-1 text-xs',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-medium cursor-default ${sizeClasses[size]}`}
      style={{ backgroundColor: label.color + '20', color: label.color }}
      onClick={onClick}
    >
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: label.color }}
      />
      {showName && <span>{label.name}</span>}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 hover:opacity-70 transition-opacity"
        >
          ×
        </button>
      )}
    </span>
  );
}

interface LabelBadgeListProps {
  labels: Label[];
  maxDisplay?: number;
  size?: 'sm' | 'md';
  showNames?: boolean;
}

export function LabelBadgeList({
  labels,
  maxDisplay = 3,
  size = 'sm',
  showNames = false,
}: LabelBadgeListProps) {
  if (labels.length === 0) return null;

  const displayedLabels = labels.slice(0, maxDisplay);
  const remainingCount = labels.length - maxDisplay;

  return (
    <div className="flex flex-wrap gap-1">
      {displayedLabels.map((label) => (
        <LabelBadge key={label.id} label={label} size={size} showName={showNames} />
      ))}
      {remainingCount > 0 && (
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400`}>
          +{remainingCount}
        </span>
      )}
    </div>
  );
}
