'use client';

import { useState } from 'react';
import { CardPriority, PRIORITY_CONFIG } from '@/types/database';
import { ChevronDown, ArrowDown, ArrowUp, Flame, Minus } from 'lucide-react';

interface PrioritySelectorProps {
  priority: CardPriority;
  onPriorityChange: (priority: CardPriority) => Promise<boolean>;
  disabled?: boolean;
}

const PRIORITIES: CardPriority[] = ['low', 'medium', 'high', 'critical'];

export function PrioritySelector({
  priority,
  onPriorityChange,
  disabled = false,
}: PrioritySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const currentConfig = PRIORITY_CONFIG[priority];

  const getIcon = (p: CardPriority) => {
    const iconClass = 'w-4 h-4';
    switch (p) {
      case 'low':
        return <ArrowDown className={iconClass} />;
      case 'medium':
        return <Minus className={iconClass} />;
      case 'high':
        return <ArrowUp className={iconClass} />;
      case 'critical':
        return <Flame className={iconClass} />;
      default:
        return null;
    }
  };

  const handleSelect = async (newPriority: CardPriority) => {
    if (newPriority === priority || isLoading) {
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const success = await onPriorityChange(newPriority);
      if (success) {
        setIsOpen(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled || isLoading}
        className={`flex items-center gap-2 px-3 py-1.5 text-sm border rounded-lg transition-colors ${
          disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:bg-gray-50 dark:hover:bg-gray-700'
        } ${currentConfig.borderColor} ${currentConfig.bgColor}`}
      >
        <span className={currentConfig.color}>{getIcon(priority)}</span>
        <span className={`font-medium ${currentConfig.color}`}>
          {currentConfig.label}
        </span>
        {!disabled && <ChevronDown className={`w-4 h-4 ${currentConfig.color}`} />}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
            {PRIORITIES.map((p) => {
              const config = PRIORITY_CONFIG[p];
              return (
                <button
                  key={p}
                  onClick={() => handleSelect(p)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                    p === priority ? 'bg-gray-50 dark:bg-gray-700/50' : ''
                  }`}
                >
                  <span className={config.color}>{getIcon(p)}</span>
                  <span className={`font-medium ${config.color}`}>
                    {config.label}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

interface PrioritySelectorInlineProps {
  priority: CardPriority;
  onPriorityChange: (priority: CardPriority) => void;
  disabled?: boolean;
}

export function PrioritySelectorInline({
  priority,
  onPriorityChange,
  disabled = false,
}: PrioritySelectorInlineProps) {
  const getIcon = (p: CardPriority) => {
    const iconClass = 'w-4 h-4';
    switch (p) {
      case 'low':
        return <ArrowDown className={iconClass} />;
      case 'medium':
        return <Minus className={iconClass} />;
      case 'high':
        return <ArrowUp className={iconClass} />;
      case 'critical':
        return <Flame className={iconClass} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex gap-1">
      {PRIORITIES.map((p) => {
        const config = PRIORITY_CONFIG[p];
        const isSelected = p === priority;
        return (
          <button
            key={p}
            onClick={() => !disabled && onPriorityChange(p)}
            disabled={disabled}
            className={`p-2 rounded-lg transition-all ${
              isSelected
                ? `${config.bgColor} ${config.borderColor} border-2`
                : 'border-2 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={config.label}
          >
            <span className={isSelected ? config.color : 'text-gray-400'}>
              {getIcon(p)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
