'use client';

import { CardPriority, PRIORITY_CONFIG } from '@/types/database';
import { ArrowDown, ArrowUp, Flame } from 'lucide-react';

interface PriorityBadgeProps {
  priority: CardPriority;
  size?: 'sm' | 'md';
  showIcon?: boolean;
  showLabel?: boolean;
}

export function PriorityBadge({
  priority,
  size = 'md',
  showIcon = true,
  showLabel = true,
}: PriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority];

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[10px]',
    md: 'px-2 py-1 text-xs',
  };

  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  const getIcon = () => {
    switch (priority) {
      case 'low':
        return <ArrowDown className={iconSize} />;
      case 'medium':
        return null;
      case 'high':
        return <ArrowUp className={iconSize} />;
      case 'critical':
        return <Flame className={iconSize} />;
      default:
        return null;
    }
  };

  // Don't show badge for medium priority (default)
  if (priority === 'medium' && !showLabel) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-medium ${sizeClasses[size]} ${config.bgColor} ${config.color}`}
    >
      {showIcon && getIcon()}
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}

interface PriorityIndicatorProps {
  priority: CardPriority;
}

export function PriorityIndicator({ priority }: PriorityIndicatorProps) {
  if (priority === 'medium' || priority === 'low') return null;

  const iconClass = 'w-3 h-3';

  if (priority === 'critical') {
    return (
      <span className="text-red-500 animate-pulse">
        <Flame className={iconClass} />
      </span>
    );
  }

  if (priority === 'high') {
    return (
      <span className="text-orange-500">
        <ArrowUp className={iconClass} />
      </span>
    );
  }

  return null;
}
