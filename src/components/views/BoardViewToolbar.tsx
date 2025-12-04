'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Label } from '@/types/database';

// Local ViewType to match toolbar's kanban naming convention
type ViewType = 'kanban' | 'calendar' | 'gantt' | 'table';

// ============================================================================
// Types
// ============================================================================
// BoardMember with email from user_profiles join
interface BoardMemberWithEmail {
  id: string;
  board_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  created_at: string;
  user_email?: string;
}

// Filter type for toolbar
export interface ViewFilter {
  labels?: string[];
  assignees?: string[];
  priority?: string[];
  dateRange?: {
    start?: string;
    end?: string;
  };
  search?: string;
}

interface BoardViewToolbarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  filters: ViewFilter;
  onFiltersChange: (filters: Partial<ViewFilter>) => void;
  labels: Label[];
  members: BoardMemberWithEmail[];
  onSearch?: (query: string) => void;
  onOpenTemplates?: () => void;
  onExport?: (format: 'csv' | 'json' | 'pdf') => void;
  isLoading?: boolean;
  className?: string;
}

interface FilterDropdownProps {
  label: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  activeCount?: number;
}

// ============================================================================
// Icons
// ============================================================================
const Icons = {
  kanban: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
    </svg>
  ),
  calendar: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  gantt: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h6" />
    </svg>
  ),
  table: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  filter: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  ),
  search: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  label: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  ),
  user: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  priority: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
    </svg>
  ),
  date: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  template: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
    </svg>
  ),
  export: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  close: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  check: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  chevronDown: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  ),
};

const viewIcons: Record<ViewType, React.ReactNode> = {
  kanban: Icons.kanban,
  calendar: Icons.calendar,
  gantt: Icons.gantt,
  table: Icons.table,
};

const viewLabels: Record<ViewType, string> = {
  kanban: 'Board',
  calendar: 'Calendar',
  gantt: 'Timeline',
  table: 'Table',
};

const priorityOptions = [
  { value: 'urgent', label: 'Urgent', color: 'bg-red-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-500' },
  { value: 'low', label: 'Low', color: 'bg-blue-500' },
  { value: 'none', label: 'None', color: 'bg-gray-400' },
];

// ============================================================================
// Filter Dropdown Component
// ============================================================================
function FilterDropdown({ 
  label, 
  icon, 
  isOpen, 
  onToggle, 
  children,
  activeCount 
}: FilterDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        if (isOpen) onToggle();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onToggle]);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={onToggle}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
          transition-colors duration-200
          ${isOpen || activeCount
            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          }
        `}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {icon}
        <span>{label}</span>
        {activeCount ? (
          <span className="ml-1 px-1.5 py-0.5 text-xs bg-indigo-600 text-white rounded-full">
            {activeCount}
          </span>
        ) : null}
        {Icons.chevronDown}
      </button>

      {isOpen && (
        <div 
          className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-gray-800 
            rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 
            z-50 max-h-80 overflow-y-auto"
          role="listbox"
        >
          {children}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Toolbar Component
// ============================================================================
export function BoardViewToolbar({
  currentView,
  onViewChange,
  filters,
  onFiltersChange,
  labels,
  members,
  onSearch,
  onOpenTemplates,
  onExport,
  isLoading = false,
  className = '',
}: BoardViewToolbarProps) {
  const [searchQuery, setSearchQuery] = useState(filters.search || '');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== filters.search) {
        onFiltersChange({ search: searchQuery || undefined });
        onSearch?.(searchQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, filters.search, onFiltersChange, onSearch]);

  // Keyboard shortcut for search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleDropdown = useCallback((dropdown: string) => {
    setOpenDropdown(prev => prev === dropdown ? null : dropdown);
  }, []);

  const handleLabelToggle = useCallback((labelId: string) => {
    const currentLabels = filters.labels || [];
    const newLabels = currentLabels.includes(labelId)
      ? currentLabels.filter(id => id !== labelId)
      : [...currentLabels, labelId];
    onFiltersChange({ labels: newLabels.length ? newLabels : undefined });
  }, [filters.labels, onFiltersChange]);

  const handleAssigneeToggle = useCallback((userId: string) => {
    const currentAssignees = filters.assignees || [];
    const newAssignees = currentAssignees.includes(userId)
      ? currentAssignees.filter(id => id !== userId)
      : [...currentAssignees, userId];
    onFiltersChange({ assignees: newAssignees.length ? newAssignees : undefined });
  }, [filters.assignees, onFiltersChange]);

  const handlePriorityToggle = useCallback((priority: string) => {
    const currentPriority = filters.priority || [];
    const newPriority = currentPriority.includes(priority)
      ? currentPriority.filter(p => p !== priority)
      : [...currentPriority, priority];
    onFiltersChange({ priority: newPriority.length ? newPriority : undefined });
  }, [filters.priority, onFiltersChange]);

  const handleDateRangeChange = useCallback((type: 'start' | 'end', date: string) => {
    const currentRange = filters.dateRange || {};
    onFiltersChange({
      dateRange: {
        ...currentRange,
        [type]: date || undefined,
      },
    });
  }, [filters.dateRange, onFiltersChange]);

  const clearAllFilters = useCallback(() => {
    setSearchQuery('');
    onFiltersChange({
      labels: undefined,
      assignees: undefined,
      priority: undefined,
      dateRange: undefined,
      search: undefined,
    });
  }, [onFiltersChange]);

  const hasActiveFilters = !!(
    filters.labels?.length ||
    filters.assignees?.length ||
    filters.priority?.length ||
    filters.dateRange?.start ||
    filters.dateRange?.end ||
    filters.search
  );

  const totalActiveFilters = 
    (filters.labels?.length || 0) +
    (filters.assignees?.length || 0) +
    (filters.priority?.length || 0) +
    (filters.dateRange?.start || filters.dateRange?.end ? 1 : 0);

  return (
    <div className={`flex flex-col gap-3 p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Top Row: View Tabs + Search + Actions */}
      <div className="flex items-center justify-between gap-4">
        {/* View Switcher */}
        <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg" role="tablist">
          {(Object.keys(viewLabels) as ViewType[]).map((view) => (
            <button
              key={view}
              onClick={() => onViewChange(view)}
              disabled={isLoading}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium
                transition-all duration-200
                ${currentView === view
                  ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
              role="tab"
              aria-selected={currentView === view}
              aria-controls={`${view}-panel`}
              title={`Switch to ${viewLabels[view]} view (Press ${(Object.keys(viewLabels) as ViewType[]).indexOf(view) + 1})`}
            >
              {viewIcons[view]}
              <span className="hidden sm:inline">{viewLabels[view]}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {Icons.search}
            </span>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search cards... (⌘F)"
              className="w-full pl-9 pr-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 
                border border-transparent rounded-lg
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                placeholder-gray-500 dark:placeholder-gray-400"
              aria-label="Search cards"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Clear search"
              >
                {Icons.close}
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {onOpenTemplates && (
            <button
              onClick={onOpenTemplates}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium
                text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800
                hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Templates"
            >
              {Icons.template}
              <span className="hidden sm:inline">Templates</span>
            </button>
          )}

          {onExport && (
            <div className="relative">
              <button
                onClick={() => toggleDropdown('export')}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium
                  text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800
                  hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Export"
              >
                {Icons.export}
                <span className="hidden sm:inline">Export</span>
              </button>
              
              {openDropdown === 'export' && (
                <div className="absolute top-full right-0 mt-1 w-40 bg-white dark:bg-gray-800 
                  rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50"
                >
                  {(['csv', 'json', 'pdf'] as const).map((format) => (
                    <button
                      key={format}
                      onClick={() => {
                        onExport(format);
                        setOpenDropdown(null);
                      }}
                      className="w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300
                        hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg"
                    >
                      Export as {format.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
          {Icons.filter}
          Filters:
        </span>

        {/* Label Filter */}
        <FilterDropdown
          label="Labels"
          icon={Icons.label}
          isOpen={openDropdown === 'labels'}
          onToggle={() => toggleDropdown('labels')}
          activeCount={filters.labels?.length}
        >
          <div className="p-2">
            {labels.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 px-2 py-1">No labels</p>
            ) : (
              labels.map((label) => (
                <button
                  key={label.id}
                  onClick={() => handleLabelToggle(label.id)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <span 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: label.color }}
                  />
                  <span className="flex-1 text-sm text-left text-gray-700 dark:text-gray-300">
                    {label.name}
                  </span>
                  {filters.labels?.includes(label.id) && (
                    <span className="text-indigo-600 dark:text-indigo-400">{Icons.check}</span>
                  )}
                </button>
              ))
            )}
          </div>
        </FilterDropdown>

        {/* Assignee Filter */}
        <FilterDropdown
          label="Assignee"
          icon={Icons.user}
          isOpen={openDropdown === 'assignees'}
          onToggle={() => toggleDropdown('assignees')}
          activeCount={filters.assignees?.length}
        >
          <div className="p-2">
            {members.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 px-2 py-1">No members</p>
            ) : (
              <>
                <button
                  onClick={() => handleAssigneeToggle('unassigned')}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <span className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs">
                    ?
                  </span>
                  <span className="flex-1 text-sm text-left text-gray-700 dark:text-gray-300">
                    Unassigned
                  </span>
                  {filters.assignees?.includes('unassigned') && (
                    <span className="text-indigo-600 dark:text-indigo-400">{Icons.check}</span>
                  )}
                </button>
                {members.map((member) => (
                  <button
                    key={member.user_id}
                    onClick={() => handleAssigneeToggle(member.user_id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <span className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-xs text-white">
                      {member.user_email?.[0]?.toUpperCase() || '?'}
                    </span>
                    <span className="flex-1 text-sm text-left text-gray-700 dark:text-gray-300 truncate">
                      {member.user_email || 'Unknown'}
                    </span>
                    {filters.assignees?.includes(member.user_id) && (
                      <span className="text-indigo-600 dark:text-indigo-400">{Icons.check}</span>
                    )}
                  </button>
                ))}
              </>
            )}
          </div>
        </FilterDropdown>

        {/* Priority Filter */}
        <FilterDropdown
          label="Priority"
          icon={Icons.priority}
          isOpen={openDropdown === 'priority'}
          onToggle={() => toggleDropdown('priority')}
          activeCount={filters.priority?.length}
        >
          <div className="p-2">
            {priorityOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handlePriorityToggle(option.value)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <span className={`w-3 h-3 rounded-full ${option.color}`} />
                <span className="flex-1 text-sm text-left text-gray-700 dark:text-gray-300">
                  {option.label}
                </span>
                {filters.priority?.includes(option.value) && (
                  <span className="text-indigo-600 dark:text-indigo-400">{Icons.check}</span>
                )}
              </button>
            ))}
          </div>
        </FilterDropdown>

        {/* Date Range Filter */}
        <FilterDropdown
          label="Due Date"
          icon={Icons.date}
          isOpen={openDropdown === 'dateRange'}
          onToggle={() => toggleDropdown('dateRange')}
          activeCount={filters.dateRange?.start || filters.dateRange?.end ? 1 : 0}
        >
          <div className="p-3 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                From
              </label>
              <input
                type="date"
                value={filters.dateRange?.start || ''}
                onChange={(e) => handleDateRangeChange('start', e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 
                  rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                To
              </label>
              <input
                type="date"
                value={filters.dateRange?.end || ''}
                onChange={(e) => handleDateRangeChange('end', e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 
                  rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <button
              onClick={() => onFiltersChange({ dateRange: undefined })}
              className="w-full px-2 py-1.5 text-sm text-indigo-600 dark:text-indigo-400 
                hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded"
            >
              Clear dates
            </button>
          </div>
        </FilterDropdown>

        {/* Clear All Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 dark:text-red-400
              hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
          >
            {Icons.close}
            Clear all ({totalActiveFilters})
          </button>
        )}
      </div>
    </div>
  );
}

export default BoardViewToolbar;
