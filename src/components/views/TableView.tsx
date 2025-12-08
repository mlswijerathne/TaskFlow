'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Card, Label, BoardMember, Column, CardPriority } from '@/types/database';
import { useTableData, TableColumn, TableSortState, TableCard } from '@/hooks/useTableData';

// ============================================================================
// Types
// ============================================================================
interface TableViewProps {
  boardId: string;
  columns: Column[];
  labels: Label[];
  members: BoardMember[];
  onCardClick?: (card: Card) => void;
  onCardUpdate?: (cardId: string, updates: Partial<Card>) => Promise<void>;
}

// ============================================================================
// Icons
// ============================================================================
const Icons = {
  sortAsc: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
    </svg>
  ),
  sortDesc: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
    </svg>
  ),
  filter: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  ),
  checkbox: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  edit: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  delete: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  export: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  spinner: (
    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  ),
  chevronLeft: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  ),
  chevronRight: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  close: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  columns: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
    </svg>
  ),
};

// ============================================================================
// Constants
// ============================================================================
const DEFAULT_COLUMNS: TableColumn[] = [
  { id: 'title', label: 'Title', type: 'text', sortable: true, width: 250 },
  { id: 'column_name', label: 'Status', type: 'select', sortable: true, width: 150 },
  { id: 'priority', label: 'Priority', type: 'priority', sortable: true, width: 100 },
  { id: 'assignee_name', label: 'Assignee', type: 'member', sortable: true, width: 150 },
  { id: 'due_date', label: 'Due Date', type: 'date', sortable: true, width: 120 },
  { id: 'labels', label: 'Labels', type: 'labels', sortable: false, width: 200 },
  { id: 'progress', label: 'Progress', type: 'progress', sortable: true, width: 100 },
  { id: 'created_at', label: 'Created', type: 'date', sortable: true, width: 120 },
];

const priorityOptions = [
  { value: 'urgent', label: 'Urgent', color: 'bg-red-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-500' },
  { value: 'low', label: 'Low', color: 'bg-blue-500' },
  { value: null, label: 'None', color: 'bg-gray-400' },
];

// ============================================================================
// Utility Components
// ============================================================================
interface PriorityBadgeProps {
  priority: string | null;
}

function PriorityBadge({ priority }: PriorityBadgeProps) {
  const option = priorityOptions.find(o => o.value === priority) || priorityOptions[4];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white ${option.color}`}>
      {option.label}
    </span>
  );
}

interface ProgressBarProps {
  value: number;
}

function ProgressBar({ value }: ProgressBarProps) {
  const color = value >= 100 ? 'bg-green-500' : value >= 50 ? 'bg-yellow-500' : 'bg-gray-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400 w-8">{value}%</span>
    </div>
  );
}

// ============================================================================
// Editable Cell Component
// ============================================================================
interface EditableCellProps {
  value: string | number | null;
  type: TableColumn['type'];
  options?: { value: string; label: string }[];
  onChange: (value: string | null) => void;
  isEditing: boolean;
  onStartEdit: () => void;
  onEndEdit: () => void;
}

function EditableCell({
  value,
  type,
  options,
  onChange,
  isEditing,
  onStartEdit,
  onEndEdit,
}: EditableCellProps) {
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);
  const [localValue, setLocalValue] = useState(() => value?.toString() || '');

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  // Sync local value when prop value changes (but not on every render)
  const valueStr = value?.toString() || '';
  useEffect(() => {
    setLocalValue(valueStr);
  }, [valueStr]);

  const handleBlur = useCallback(() => {
    if (localValue !== (value?.toString() || '')) {
      onChange(localValue || null);
    }
    onEndEdit();
  }, [localValue, value, onChange, onEndEdit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setLocalValue(value?.toString() || '');
      onEndEdit();
    }
  }, [handleBlur, value, onEndEdit]);

  if (!isEditing) {
    return (
      <div
        className="px-2 py-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
        onClick={onStartEdit}
        onDoubleClick={onStartEdit}
      >
        {type === 'date' && value ? (
          new Date(value as string).toLocaleDateString()
        ) : type === 'priority' ? (
          <PriorityBadge priority={value as string | null} />
        ) : type === 'progress' ? (
          <ProgressBar value={Number(value) || 0} />
        ) : (
          value || <span className="text-gray-400">—</span>
        )}
      </div>
    );
  }

  if (type === 'select' || type === 'priority' || type === 'member') {
    return (
      <select
        ref={inputRef as React.RefObject<HTMLSelectElement>}
        value={localValue}
        onChange={(e) => {
          setLocalValue(e.target.value);
          onChange(e.target.value || null);
          onEndEdit();
        }}
        onBlur={onEndEdit}
        className="w-full px-2 py-1 text-sm bg-white dark:bg-gray-800 border border-indigo-500 rounded focus:outline-none"
      >
        {type === 'priority' ? (
          priorityOptions.map(opt => (
            <option key={opt.value || 'none'} value={opt.value || ''}>
              {opt.label}
            </option>
          ))
        ) : (
          options?.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))
        )}
      </select>
    );
  }

  if (type === 'date') {
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="date"
        value={localValue ? new Date(localValue).toISOString().split('T')[0] : ''}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-full px-2 py-1 text-sm bg-white dark:bg-gray-800 border border-indigo-500 rounded focus:outline-none"
      />
    );
  }

  return (
    <input
      ref={inputRef as React.RefObject<HTMLInputElement>}
      type="text"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className="w-full px-2 py-1 text-sm bg-white dark:bg-gray-800 border border-indigo-500 rounded focus:outline-none"
    />
  );
}

// ============================================================================
// Table Header Component
// ============================================================================
interface TableHeaderProps {
  columns: TableColumn[];
  sortState: TableSortState | null;
  onSort: (columnId: string) => void;
  isAllSelected: boolean;
  onSelectAll: () => void;
}

function TableHeader({
  columns,
  sortState,
  onSort,
  isAllSelected,
  onSelectAll,
}: TableHeaderProps) {
  return (
    <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
      <tr>
        {/* Checkbox column */}
        <th className="w-10 px-3 py-3 border-b border-gray-200 dark:border-gray-700">
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={onSelectAll}
            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
        </th>

        {columns.map((column) => (
          <th
            key={column.id}
            className={`
              px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 
              uppercase tracking-wider border-b border-gray-200 dark:border-gray-700
              ${column.sortable ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none' : ''}
            `}
            style={{ width: column.width }}
            onClick={() => column.sortable && onSort(column.id)}
          >
            <div className="flex items-center gap-1">
              <span>{column.label}</span>
              {column.sortable && sortState?.column === column.id && (
                sortState.direction === 'asc' ? Icons.sortAsc : Icons.sortDesc
              )}
            </div>
          </th>
        ))}

        {/* Actions column */}
        <th className="w-20 px-3 py-3 border-b border-gray-200 dark:border-gray-700" />
      </tr>
    </thead>
  );
}

// ============================================================================
// Table Row Component
// ============================================================================
interface TableRowProps {
  row: TableCard;
  columns: TableColumn[];
  columnOptions: Column[];
  memberOptions: BoardMember[];
  isSelected: boolean;
  onSelect: () => void;
  onClick: () => void;
  onUpdate: (updates: Partial<Card>) => void;
  onDelete: () => void;
}

// Helper to get cell value from TableCard
function getCellValue(row: TableCard, columnId: string): string | number | null {
  switch (columnId) {
    case 'title':
      return row.title;
    case 'description':
      return row.description;
    case 'column_name':
      return row.column?.title || null;
    case 'assignee_name':
      return row.assignee_profile?.display_name || row.assignee || null;
    case 'priority':
      return row.priority;
    case 'due_date':
      return row.due_date;
    case 'start_date':
      return row.start_date;
    case 'end_date':
      return row.end_date;
    case 'created_at':
      return row.created_at;
    case 'position':
      return row.position;
    default:
      return null;
  }
}

function TableRow({
  row,
  columns,
  columnOptions,
  memberOptions,
  isSelected,
  onSelect,
  onClick,
  onUpdate,
  onDelete,
}: TableRowProps) {
  const [editingCell, setEditingCell] = useState<string | null>(null);

  const handleCellChange = useCallback((columnId: string, value: string | null) => {
    const updates: Partial<Card> = {};
    
    if (columnId === 'column_name') {
      const column = columnOptions.find(c => c.title === value);
      if (column) {
        updates.column_id = column.id;
      }
    } else if (columnId === 'assignee_name') {
      const member = memberOptions.find(m => m.user_id === value);
      updates.assignee = member?.user_id || null;
    } else if (columnId === 'priority') {
      if (value && ['low', 'medium', 'high', 'critical'].includes(value)) {
        updates.priority = value as CardPriority;
      }
    } else if (columnId === 'due_date') {
      updates.due_date = value;
    } else if (columnId === 'title') {
      updates.title = value || '';
    }

    onUpdate(updates);
  }, [columnOptions, memberOptions, onUpdate]);

  return (
    <tr
      className={`
        border-b border-gray-100 dark:border-gray-800
        ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}
      `}
    >
      {/* Checkbox */}
      <td className="px-3 py-2">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
      </td>

      {columns.map((column) => (
        <td
          key={column.id}
          className="px-3 py-2 text-sm text-gray-900 dark:text-white"
          style={{ maxWidth: column.width }}
        >
          {column.type === 'labels' ? (
            // Labels are not editable inline
            <div className="flex flex-wrap gap-1">
              {(row.labels as Label[] || []).map((label) => (
                <span
                  key={label.id}
                  className="px-2 py-0.5 text-xs rounded-full text-white"
                  style={{ backgroundColor: label.color }}
                >
                  {label.name}
                </span>
              ))}
            </div>
          ) : (
            <EditableCell
              value={getCellValue(row, column.id)}
              type={column.type}
              options={
                column.id === 'column_name'
                  ? columnOptions.map(c => ({ value: c.title, label: c.title }))
                  : column.id === 'assignee_name'
                  ? memberOptions.map(m => ({ value: m.user_id, label: m.user_id }))
                  : undefined
              }
              onChange={(value) => handleCellChange(column.id, value)}
              isEditing={editingCell === column.id}
              onStartEdit={() => setEditingCell(column.id)}
              onEndEdit={() => setEditingCell(null)}
            />
          )}
        </td>
      ))}

      {/* Actions */}
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          <button
            onClick={onClick}
            className="p-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded"
            title="Edit card"
          >
            {Icons.edit}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('Are you sure you want to delete this card?')) {
                onDelete();
              }
            }}
            className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded"
            title="Delete card"
          >
            {Icons.delete}
          </button>
        </div>
      </td>
    </tr>
  );
}

// ============================================================================
// Main Table View Component
// ============================================================================
export function TableView({
  boardId,
  columns: boardColumns,
  labels: _labels,
  members,
  onCardClick,
  onCardUpdate,
}: TableViewProps) {
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    DEFAULT_COLUMNS.map(c => c.id)
  );
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [showColumnPicker, setShowColumnPicker] = useState(false);

  const {
    data: rows,
    loading,
    error,
    sortState,
    page,
    pageSize,
    totalCount,
    setSort,
    setPage,
    setPageSize,
    updateCard,
    deleteCard,
    bulkUpdateCards,
    bulkDeleteCards,
    exportToCSV,
  } = useTableData(boardId, {
    pageSize: 25,
  });

  const displayColumns = useMemo(() => {
    return DEFAULT_COLUMNS.filter(c => visibleColumns.includes(c.id));
  }, [visibleColumns]);

  const handleSort = useCallback((columnId: string) => {
    if (sortState?.column === columnId) {
      setSort({
        column: columnId,
        direction: sortState.direction === 'asc' ? 'desc' : 'asc',
      });
    } else {
      setSort({ column: columnId, direction: 'asc' });
    }
  }, [sortState, setSort]);

  const handleSelectAll = useCallback(() => {
    if (selectedRows.size === rows.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(rows.map(r => r.id)));
    }
  }, [selectedRows.size, rows]);

  const handleSelectRow = useCallback((rowId: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  }, []);

  const handleRowClick = useCallback((row: TableCard) => {
    if (onCardClick) {
      const card: Card = {
        id: row.id,
        column_id: row.column_id,
        board_id: row.board_id,
        title: row.title,
        description: row.description,
        position: row.position,
        due_date: row.due_date,
        start_date: row.start_date,
        end_date: row.end_date,
        assignee: row.assignee,
        priority: row.priority,
        created_at: row.created_at,
        color: row.color,
        estimated_hours: row.estimated_hours,
        metadata: row.metadata,
        created_by: row.created_by,
      };
      onCardClick(card);
    }
  }, [onCardClick]);

  const handleRowUpdate = useCallback(async (rowId: string, updates: Partial<Card>) => {
    if (onCardUpdate) {
      await onCardUpdate(rowId, updates);
    } else {
      await updateCard(rowId, updates);
    }
  }, [onCardUpdate, updateCard]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedRows.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedRows.size} cards?`)) return;
    
    await bulkDeleteCards(Array.from(selectedRows));
    setSelectedRows(new Set());
  }, [selectedRows, bulkDeleteCards]);

  const handleBulkStatusChange = useCallback(async (columnId: string) => {
    if (selectedRows.size === 0) return;
    
    await bulkUpdateCards(Array.from(selectedRows), { column_id: columnId });
    setSelectedRows(new Set());
  }, [selectedRows, bulkUpdateCards]);

  const totalPages = Math.ceil(totalCount / pageSize);

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600 dark:text-red-400">
        Error loading table: {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        {/* Bulk actions */}
        <div className="flex items-center gap-2">
          {selectedRows.size > 0 && (
            <>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {selectedRows.size} selected
              </span>
              <div className="w-px h-5 bg-gray-300 dark:bg-gray-600" />
              
              {/* Bulk status change */}
              <select
                className="px-2 py-1 text-sm bg-gray-100 dark:bg-gray-800 border-0 rounded-lg
                  focus:ring-2 focus:ring-indigo-500"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    handleBulkStatusChange(e.target.value);
                  }
                }}
              >
                <option value="" disabled>Move to...</option>
                {boardColumns.map(col => (
                  <option key={col.id} value={col.id}>{col.title}</option>
                ))}
              </select>

              <button
                onClick={handleBulkDelete}
                className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400
                  hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
              >
                Delete
              </button>

              <button
                onClick={() => setSelectedRows(new Set())}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {Icons.close}
              </button>
            </>
          )}
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2">
          {/* Column picker */}
          <div className="relative">
            <button
              onClick={() => setShowColumnPicker(!showColumnPicker)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium
                text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800
                hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              {Icons.columns}
              Columns
            </button>

            {showColumnPicker && (
              <div className="absolute top-full right-0 mt-1 w-48 bg-white dark:bg-gray-800 
                rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 p-2"
              >
                {DEFAULT_COLUMNS.map((column) => (
                  <label
                    key={column.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={visibleColumns.includes(column.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setVisibleColumns([...visibleColumns, column.id]);
                        } else {
                          setVisibleColumns(visibleColumns.filter(c => c !== column.id));
                        }
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {column.label}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Export */}
          <button
            onClick={exportToCSV}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium
              text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800
              hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {Icons.export}
            Export
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto relative">
        {loading && (
          <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 flex items-center justify-center z-10">
            {Icons.spinner}
          </div>
        )}

        <table className="w-full">
          <TableHeader
            columns={displayColumns}
            sortState={sortState}
            onSort={handleSort}
            isAllSelected={rows.length > 0 && selectedRows.size === rows.length}
            onSelectAll={handleSelectAll}
          />
          <tbody>
            {rows.map((row) => (
              <TableRow
                key={row.id}
                row={row}
                columns={displayColumns}
                columnOptions={boardColumns}
                memberOptions={members}
                isSelected={selectedRows.has(row.id)}
                onSelect={() => handleSelectRow(row.id)}
                onClick={() => handleRowClick(row)}
                onUpdate={(updates) => handleRowUpdate(row.id, updates)}
                onDelete={() => deleteCard(row.id)}
              />
            ))}
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={displayColumns.length + 2} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                  No cards found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Showing {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, totalCount)} of {totalCount}
          </span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="px-2 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="text-sm text-gray-600 dark:text-gray-400">per page</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage(1)}
            disabled={page === 1}
            className="px-2 py-1 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-50"
          >
            First
          </button>
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="p-1 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-50"
          >
            {Icons.chevronLeft}
          </button>
          
          <span className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300">
            Page {page} of {totalPages}
          </span>

          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages}
            className="p-1 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-50"
          >
            {Icons.chevronRight}
          </button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={page >= totalPages}
            className="px-2 py-1 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-50"
          >
            Last
          </button>
        </div>
      </div>
    </div>
  );
}

export default TableView;
