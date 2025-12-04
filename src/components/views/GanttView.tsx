'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Card, Label, BoardMember, GanttTask, Column } from '@/types/database';
import { useGanttData, GanttFilter, GanttGroupBy, GanttZoomLevel } from '@/hooks/useGanttData';

// ============================================================================
// Types
// ============================================================================
interface GanttViewProps {
  boardId: string;
  columns: Column[];
  labels: Label[];
  members: BoardMember[];
  filters?: GanttFilter;
  onCardClick?: (card: Card) => void;
  onTaskUpdate?: (taskId: string, updates: { start_date?: string; end_date?: string }) => Promise<void>;
}

interface GanttBarProps {
  task: GanttTask;
  startDate: Date;
  dayWidth: number;
  rowHeight: number;
  onResize: (taskId: string, edge: 'start' | 'end', days: number) => void;
  onClick: () => void;
  isSelected: boolean;
}

// ============================================================================
// Icons
// ============================================================================
const Icons = {
  zoomIn: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
    </svg>
  ),
  zoomOut: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
    </svg>
  ),
  today: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  expand: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
    </svg>
  ),
  spinner: (
    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  ),
  group: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  ),
  export: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
};

// ============================================================================
// Utility Functions
// ============================================================================
function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function diffDays(date1: Date, date2: Date): number {
  const diffTime = date1.getTime() - date2.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d;
}

function formatDate(date: Date, format: 'short' | 'full' = 'short'): string {
  if (format === 'full') {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function getPriorityColor(priority: string | null): string {
  switch (priority) {
    case 'urgent': return 'bg-red-500';
    case 'high': return 'bg-orange-500';
    case 'medium': return 'bg-yellow-500';
    case 'low': return 'bg-blue-500';
    default: return 'bg-indigo-500';
  }
}

function getProgressColor(progress: number): string {
  if (progress >= 100) return 'bg-green-500';
  if (progress >= 75) return 'bg-emerald-500';
  if (progress >= 50) return 'bg-yellow-500';
  if (progress >= 25) return 'bg-orange-500';
  return 'bg-gray-400';
}

// ============================================================================
// Zoom Level Configurations
// ============================================================================
const ZOOM_CONFIGS: Record<GanttZoomLevel, { dayWidth: number; headerFormat: 'day' | 'week' | 'month'; showWeekends: boolean }> = {
  day: { dayWidth: 40, headerFormat: 'day', showWeekends: true },
  week: { dayWidth: 20, headerFormat: 'week', showWeekends: true },
  month: { dayWidth: 8, headerFormat: 'month', showWeekends: false },
  quarter: { dayWidth: 3, headerFormat: 'month', showWeekends: false },
};

const ROW_HEIGHT = 40;

// ============================================================================
// Gantt Bar Component
// ============================================================================
function GanttBar({
  task,
  startDate,
  dayWidth,
  rowHeight,
  onResize,
  onClick,
  isSelected,
}: GanttBarProps) {
  const [isDragging, setIsDragging] = useState<'start' | 'end' | 'move' | null>(null);
  const [dragStartX, setDragStartX] = useState(0);

  const taskStart = task.start_date ? new Date(task.start_date) : new Date();
  const taskEnd = task.end_date ? new Date(task.end_date) : addDays(taskStart, 1);
  
  const left = Math.max(0, diffDays(taskStart, startDate) * dayWidth);
  const width = Math.max(dayWidth, diffDays(taskEnd, taskStart) * dayWidth);

  const handleMouseDown = useCallback((e: React.MouseEvent, edge: 'start' | 'end' | 'move') => {
    e.stopPropagation();
    setIsDragging(edge);
    setDragStartX(e.clientX);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartX;
      const deltaDays = Math.round(deltaX / dayWidth);
      
      if (deltaDays !== 0 && isDragging !== 'move') {
        onResize(task.id, isDragging, deltaDays);
        setDragStartX(e.clientX);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStartX, dayWidth, task.id, onResize]);

  const isOverdue = task.end_date && new Date(task.end_date) < new Date() && task.progress < 100;

  return (
    <div
      className={`
        absolute top-1 h-8 rounded-md cursor-pointer transition-all duration-150
        ${getPriorityColor(task.priority)}
        ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900' : ''}
        ${isOverdue ? 'opacity-80' : ''}
        ${isDragging ? 'opacity-70' : ''}
        group hover:brightness-110
      `}
      style={{
        left: `${left}px`,
        width: `${width}px`,
      }}
      onClick={onClick}
      onMouseDown={(e) => handleMouseDown(e, 'move')}
    >
      {/* Progress fill */}
      <div
        className={`absolute inset-0 rounded-md ${getProgressColor(task.progress)} opacity-30`}
        style={{ width: `${task.progress}%` }}
      />

      {/* Task title */}
      <div className="relative px-2 py-1 text-xs text-white font-medium truncate">
        {task.title}
      </div>

      {/* Resize handles */}
      <div
        className="absolute left-0 top-0 w-2 h-full cursor-ew-resize opacity-0 group-hover:opacity-100 bg-white/30 rounded-l-md"
        onMouseDown={(e) => handleMouseDown(e, 'start')}
      />
      <div
        className="absolute right-0 top-0 w-2 h-full cursor-ew-resize opacity-0 group-hover:opacity-100 bg-white/30 rounded-r-md"
        onMouseDown={(e) => handleMouseDown(e, 'end')}
      />

      {/* Overdue indicator */}
      {isOverdue && (
        <div className="absolute -right-1 -top-1 w-3 h-3 bg-red-600 rounded-full border border-white" />
      )}
    </div>
  );
}

// ============================================================================
// Timeline Header Component
// ============================================================================
interface TimelineHeaderProps {
  startDate: Date;
  dayCount: number;
  dayWidth: number;
  zoomLevel: GanttZoomLevel;
}

function TimelineHeader({ startDate, dayCount, dayWidth, zoomLevel }: TimelineHeaderProps) {
  const today = new Date();
  const config = ZOOM_CONFIGS[zoomLevel];
  
  // Generate header cells based on zoom level
  const headers = useMemo(() => {
    const cells: { date: Date; label: string; width: number; isToday: boolean }[] = [];
    let currentDate = new Date(startDate);
    
    if (config.headerFormat === 'day') {
      for (let i = 0; i < dayCount; i++) {
        cells.push({
          date: new Date(currentDate),
          label: currentDate.getDate().toString(),
          width: dayWidth,
          isToday: isSameDay(currentDate, today),
        });
        currentDate = addDays(currentDate, 1);
      }
    } else if (config.headerFormat === 'week') {
      let weekStart = startOfWeek(startDate);
      while (diffDays(weekStart, startDate) + 7 <= dayCount) {
        const weekEnd = addDays(weekStart, 6);
        cells.push({
          date: new Date(weekStart),
          label: `${formatDate(weekStart)} - ${formatDate(weekEnd)}`,
          width: 7 * dayWidth,
          isToday: isSameDay(weekStart, today) || diffDays(today, weekStart) < 7 && diffDays(today, weekStart) >= 0,
        });
        weekStart = addDays(weekStart, 7);
      }
    } else {
      // Month headers
      let monthStart = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      while (diffDays(monthStart, startDate) <= dayCount) {
        const nextMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
        const daysInMonth = diffDays(nextMonth, monthStart);
        cells.push({
          date: new Date(monthStart),
          label: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          width: daysInMonth * dayWidth,
          isToday: monthStart.getMonth() === today.getMonth() && monthStart.getFullYear() === today.getFullYear(),
        });
        monthStart = nextMonth;
      }
    }
    
    return cells;
  }, [startDate, dayCount, dayWidth, config.headerFormat, today]);

  return (
    <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
      {headers.map((cell, idx) => (
        <div
          key={idx}
          className={`
            flex-shrink-0 px-1 py-2 text-xs font-medium text-center border-r border-gray-200 dark:border-gray-700
            ${cell.isToday ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' : 'text-gray-600 dark:text-gray-400'}
          `}
          style={{ width: `${cell.width}px` }}
        >
          {cell.label}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Task Row Component
// ============================================================================
interface TaskRowProps {
  task: GanttTask;
  startDate: Date;
  dayCount: number;
  dayWidth: number;
  rowHeight: number;
  isSelected: boolean;
  onSelect: () => void;
  onResize: (taskId: string, edge: 'start' | 'end', days: number) => void;
}

function TaskRow({
  task,
  startDate,
  dayCount,
  dayWidth,
  rowHeight,
  isSelected,
  onSelect,
  onResize,
}: TaskRowProps) {
  const today = new Date();

  // Generate grid lines for days
  const gridCells = useMemo(() => {
    const cells: { date: Date; isToday: boolean; isWeekend: boolean }[] = [];
    let currentDate = new Date(startDate);
    
    for (let i = 0; i < dayCount; i++) {
      cells.push({
        date: new Date(currentDate),
        isToday: isSameDay(currentDate, today),
        isWeekend: currentDate.getDay() === 0 || currentDate.getDay() === 6,
      });
      currentDate = addDays(currentDate, 1);
    }
    
    return cells;
  }, [startDate, dayCount, today]);

  return (
    <div className="relative flex" style={{ height: `${rowHeight}px` }}>
      {/* Grid background */}
      {gridCells.map((cell, idx) => (
        <div
          key={idx}
          className={`
            flex-shrink-0 border-r border-gray-100 dark:border-gray-800
            ${cell.isToday ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}
            ${cell.isWeekend ? 'bg-gray-50 dark:bg-gray-900' : ''}
          `}
          style={{ width: `${dayWidth}px` }}
        />
      ))}

      {/* Today marker line */}
      {gridCells.some(c => c.isToday) && (
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
          style={{
            left: `${(gridCells.findIndex(c => c.isToday) + 0.5) * dayWidth}px`,
          }}
        />
      )}

      {/* Gantt bar */}
      <GanttBar
        task={task}
        startDate={startDate}
        dayWidth={dayWidth}
        rowHeight={rowHeight}
        onResize={onResize}
        onClick={onSelect}
        isSelected={isSelected}
      />
    </div>
  );
}

// ============================================================================
// Main Gantt View Component
// ============================================================================
export function GanttView({
  boardId,
  columns,
  labels,
  members,
  filters,
  onCardClick,
  onTaskUpdate,
}: GanttViewProps) {
  const [zoomLevel, setZoomLevel] = useState<GanttZoomLevel>('week');
  const [groupBy, setGroupBy] = useState<GanttGroupBy>('none');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const { tasks, dependencies, loading, error, updateTaskDates } = useGanttData(
    boardId,
    { filters, settings: { groupBy, viewMode: zoomLevel, showDependencies: true, showProgress: true, sortBy: 'start_date', sortDirection: 'asc' } }
  );

  const config = ZOOM_CONFIGS[zoomLevel];

  // Calculate timeline range
  const { startDate, endDate, dayCount } = useMemo(() => {
    const today = new Date();
    let minDate = today;
    let maxDate = addDays(today, 30);

    tasks.forEach(task => {
      if (task.start_date) {
        const start = new Date(task.start_date);
        if (start < minDate) minDate = start;
      }
      if (task.end_date) {
        const end = new Date(task.end_date);
        if (end > maxDate) maxDate = end;
      }
    });

    // Add padding
    minDate = addDays(minDate, -7);
    maxDate = addDays(maxDate, 14);

    const days = diffDays(maxDate, minDate);

    return {
      startDate: minDate,
      endDate: maxDate,
      dayCount: days,
    };
  }, [tasks]);

  // Group tasks if groupBy is set
  const groupedTasks = useMemo(() => {
    if (groupBy === 'none') {
      return [{ key: 'all', label: 'All Tasks', tasks }];
    }

    const groups: Record<string, { label: string; tasks: GanttTask[] }> = {};

    tasks.forEach(task => {
      let key = 'none';
      let label = 'Ungrouped';

      if (groupBy === 'column') {
        key = task.column_id;
        label = task.column_name || 'Unknown Column';
      } else if (groupBy === 'assignee') {
        key = task.assignee || 'unassigned';
        label = task.assignee || 'Unassigned';
      } else if (groupBy === 'priority') {
        key = task.priority || 'none';
        label = task.priority ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1) : 'No Priority';
      }

      if (!groups[key]) {
        groups[key] = { label, tasks: [] };
      }
      groups[key].tasks.push(task);
    });

    return Object.entries(groups).map(([key, value]) => ({
      key,
      label: value.label,
      tasks: value.tasks,
    }));
  }, [tasks, groupBy]);

  const handleZoomIn = useCallback(() => {
    const levels: GanttZoomLevel[] = ['quarter', 'month', 'week', 'day'];
    const currentIndex = levels.indexOf(zoomLevel);
    if (currentIndex < levels.length - 1) {
      setZoomLevel(levels[currentIndex + 1]);
    }
  }, [zoomLevel]);

  const handleZoomOut = useCallback(() => {
    const levels: GanttZoomLevel[] = ['quarter', 'month', 'week', 'day'];
    const currentIndex = levels.indexOf(zoomLevel);
    if (currentIndex > 0) {
      setZoomLevel(levels[currentIndex - 1]);
    }
  }, [zoomLevel]);

  const handleScrollToToday = useCallback(() => {
    if (!timelineRef.current) return;
    
    const today = new Date();
    const todayOffset = diffDays(today, startDate) * config.dayWidth;
    const containerWidth = timelineRef.current.clientWidth;
    
    timelineRef.current.scrollLeft = todayOffset - containerWidth / 2;
  }, [startDate, config.dayWidth]);

  const handleTaskResize = useCallback(async (taskId: string, edge: 'start' | 'end', days: number) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const updates: { start_date?: string; end_date?: string } = {};

    if (edge === 'start' && task.start_date) {
      updates.start_date = addDays(new Date(task.start_date), days).toISOString();
    } else if (edge === 'end' && task.end_date) {
      updates.end_date = addDays(new Date(task.end_date), days).toISOString();
    }

    if (onTaskUpdate) {
      await onTaskUpdate(taskId, updates);
    } else {
      const startDate = updates.start_date ? new Date(updates.start_date) : (task.start_date ? new Date(task.start_date) : new Date());
      const endDate = updates.end_date ? new Date(updates.end_date) : (task.end_date ? new Date(task.end_date) : new Date());
      await updateTaskDates(taskId, startDate, endDate);
    }
  }, [tasks, onTaskUpdate, updateTaskDates]);

  const handleTaskClick = useCallback((task: GanttTask) => {
    setSelectedTaskId(task.id);
    if (onCardClick) {
      // Convert task back to card
      const card: Card = {
        id: task.id,
        board_id: task.board_id,
        column_id: task.column_id,
        title: task.title,
        description: task.description,
        position: 0,
        due_date: task.end_date,
        start_date: task.start_date,
        end_date: task.end_date,
        assignee: task.assignee,
        priority: task.priority || 'medium',
        color: null,
        estimated_hours: null,
        metadata: {},
        created_by: '',
        created_at: '',
      };
      onCardClick(card);
    }
  }, [onCardClick]);

  // Scroll to today on mount
  useEffect(() => {
    if (!loading) {
      handleScrollToToday();
    }
  }, [loading, handleScrollToToday]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600 dark:text-red-400">
        Error loading timeline: {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        {/* Group by selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
            {Icons.group}
            Group by:
          </span>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GanttGroupBy)}
            className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 border-0 rounded-lg
              focus:ring-2 focus:ring-indigo-500"
          >
            <option value="none">None</option>
            <option value="column">Column</option>
            <option value="assignee">Assignee</option>
            <option value="priority">Priority</option>
          </select>
        </div>

        {/* Zoom & navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleScrollToToday}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium
              text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800
              hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {Icons.today}
            Today
          </button>

          <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <button
              onClick={handleZoomOut}
              disabled={zoomLevel === 'quarter'}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-50"
              title="Zoom out"
            >
              {Icons.zoomOut}
            </button>
            <span className="px-2 text-xs font-medium text-gray-600 dark:text-gray-400 capitalize">
              {zoomLevel}
            </span>
            <button
              onClick={handleZoomIn}
              disabled={zoomLevel === 'day'}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-50"
              title="Zoom in"
            >
              {Icons.zoomIn}
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div ref={containerRef} className="flex-1 flex overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 flex flex-col items-center justify-center z-20 gap-3">
            <div className="text-gray-600 dark:text-gray-300">
              {Icons.spinner}
            </div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Loading Gantt view...
            </p>
          </div>
        )}

        {/* Task list sidebar */}
        <div className="w-64 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 overflow-y-auto bg-white dark:bg-gray-900">
          {/* Header */}
          <div className="h-10 px-4 flex items-center border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 sticky top-0">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Tasks ({tasks.length})
            </span>
          </div>

          {/* Task list */}
          {groupedTasks.map((group) => (
            <div key={group.key}>
              {groupBy !== 'none' && (
                <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase sticky top-10">
                  {group.label} ({group.tasks.length})
                </div>
              )}
              {group.tasks.map((task) => (
                <div
                  key={task.id}
                  className={`
                    px-4 flex items-center gap-2 cursor-pointer
                    border-b border-gray-100 dark:border-gray-800
                    hover:bg-gray-50 dark:hover:bg-gray-800
                    ${selectedTaskId === task.id ? 'bg-indigo-50 dark:bg-indigo-900/30' : ''}
                  `}
                  style={{ height: `${ROW_HEIGHT}px` }}
                  onClick={() => handleTaskClick(task)}
                >
                  {/* Priority indicator */}
                  <span className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`} />
                  
                  {/* Task title */}
                  <span className="text-sm text-gray-900 dark:text-white truncate flex-1">
                    {task.title}
                  </span>

                  {/* Progress */}
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {task.progress}%
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Timeline area */}
        <div 
          ref={timelineRef}
          className="flex-1 overflow-x-auto overflow-y-auto"
        >
          {/* Timeline header */}
          <TimelineHeader
            startDate={startDate}
            dayCount={dayCount}
            dayWidth={config.dayWidth}
            zoomLevel={zoomLevel}
          />

          {/* Task rows */}
          <div style={{ minWidth: `${dayCount * config.dayWidth}px` }}>
            {groupedTasks.map((group) => (
              <React.Fragment key={group.key}>
                {groupBy !== 'none' && (
                  <div 
                    className="h-8 bg-gray-100 dark:bg-gray-800"
                    style={{ minWidth: `${dayCount * config.dayWidth}px` }}
                  />
                )}
                {group.tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    startDate={startDate}
                    dayCount={dayCount}
                    dayWidth={config.dayWidth}
                    rowHeight={ROW_HEIGHT}
                    isSelected={selectedTaskId === task.id}
                    onSelect={() => handleTaskClick(task)}
                    onResize={handleTaskResize}
                  />
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>
            {formatDate(startDate, 'full')} - {formatDate(endDate, 'full')}
          </span>
          <span>
            Drag bar edges to resize • Click bar to select • Scroll to navigate
          </span>
        </div>
      </div>
    </div>
  );
}

export default GanttView;
