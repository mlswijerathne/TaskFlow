'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Card, Label, BoardMember, CalendarEvent, Column } from '@/types/database';
import { useCalendarEvents, CalendarFilter, CalendarRange } from '@/hooks/useCalendarEvents';

// ============================================================================
// Types
// ============================================================================
interface CalendarViewProps {
  boardId: string;
  columns: Column[];
  labels: Label[];
  members: BoardMember[];
  filters?: CalendarFilter;
  onCardClick?: (card: Card) => void;
  onDateClick?: (date: Date) => void;
  onEventDrop?: (cardId: string, newDate: Date) => Promise<void>;
}

type CalendarViewMode = 'month' | 'week' | 'day';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
}

// ============================================================================
// Icons
// ============================================================================
const Icons = {
  chevronLeft: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  ),
  chevronRight: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  calendar: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  clock: (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  spinner: (
    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  ),
  plus: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
  ),
};

// ============================================================================
// Utility Functions
// ============================================================================
function formatDate(date: Date, format: 'short' | 'long' | 'month-year' = 'short'): string {
  const optionsMap: Record<string, Intl.DateTimeFormatOptions> = {
    short: { month: 'short', day: 'numeric' },
    long: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
    'month-year': { month: 'long', year: 'numeric' },
  };
  return date.toLocaleDateString('en-US', optionsMap[format]);
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d;
}

function endOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (6 - day));
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function getDaysInMonth(date: Date): CalendarDay[] {
  const today = new Date();
  const firstDay = startOfMonth(date);
  const lastDay = endOfMonth(date);
  const startDate = startOfWeek(firstDay);
  const endDate = endOfWeek(lastDay);

  const days: CalendarDay[] = [];
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    days.push({
      date: new Date(currentDate),
      isCurrentMonth: currentDate.getMonth() === date.getMonth(),
      isToday: isSameDay(currentDate, today),
      events: [],
    });
    currentDate = addDays(currentDate, 1);
  }

  return days;
}

function getWeekDays(date: Date): CalendarDay[] {
  const today = new Date();
  const start = startOfWeek(date);
  const days: CalendarDay[] = [];

  for (let i = 0; i < 7; i++) {
    const d = addDays(start, i);
    days.push({
      date: d,
      isCurrentMonth: true,
      isToday: isSameDay(d, today),
      events: [],
    });
  }

  return days;
}

function getPriorityColor(priority: string | null): string {
  switch (priority) {
    case 'urgent': return 'border-l-red-500 bg-red-50 dark:bg-red-900/20';
    case 'high': return 'border-l-orange-500 bg-orange-50 dark:bg-orange-900/20';
    case 'medium': return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
    case 'low': return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20';
    default: return 'border-l-gray-300 bg-gray-50 dark:bg-gray-800';
  }
}

// ============================================================================
// Event Card Component
// ============================================================================
interface EventCardProps {
  event: CalendarEvent;
  isCompact?: boolean;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  isDragging?: boolean;
}

function EventCard({ event, isCompact = false, onClick, onDragStart, isDragging }: EventCardProps) {
  const isOverdue = event.due_date && new Date(event.due_date) < new Date() && !event.completed;

  if (isCompact) {
    return (
      <div
        className={`
          px-2 py-1 text-xs rounded cursor-pointer truncate
          border-l-2 ${getPriorityColor(event.priority)}
          ${isOverdue ? 'ring-1 ring-red-400' : ''}
          ${isDragging ? 'opacity-50' : ''}
          hover:ring-1 hover:ring-indigo-400
        `}
        onClick={onClick}
        draggable
        onDragStart={onDragStart}
        title={event.title}
      >
        {event.title}
      </div>
    );
  }

  return (
    <div
      className={`
        p-2 rounded-lg cursor-pointer border-l-4
        ${getPriorityColor(event.priority)}
        ${isOverdue ? 'ring-2 ring-red-400' : ''}
        ${isDragging ? 'opacity-50' : ''}
        hover:ring-2 hover:ring-indigo-400 transition-shadow
      `}
      onClick={onClick}
      draggable
      onDragStart={onDragStart}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium text-sm text-gray-900 dark:text-white line-clamp-2">
          {event.title}
        </span>
        {event.column_name && (
          <span className="text-xs px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-400 whitespace-nowrap">
            {event.column_name}
          </span>
        )}
      </div>
      
      {/* Labels */}
      {event.labels && event.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {event.labels.slice(0, 3).map((label) => (
            <span
              key={label.id}
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: label.color }}
              title={label.name}
            />
          ))}
          {event.labels.length > 3 && (
            <span className="text-xs text-gray-500">+{event.labels.length - 3}</span>
          )}
        </div>
      )}

      {/* Due time */}
      {event.due_date && (
        <div className={`flex items-center gap-1 mt-1 text-xs ${isOverdue ? 'text-red-600' : 'text-gray-500 dark:text-gray-400'}`}>
          {Icons.clock}
          {new Date(event.due_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Month View Component
// ============================================================================
interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onDayClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
  onEventDrop: (eventId: string, date: Date) => void;
}

function MonthView({ currentDate, events, onDayClick, onEventClick, onEventDrop }: MonthViewProps) {
  const [draggedEvent, setDraggedEvent] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<Date | null>(null);

  const days = useMemo(() => {
    const monthDays = getDaysInMonth(currentDate);
    return monthDays.map(day => ({
      ...day,
      events: events.filter(e => {
        const dateStr = e.due_date || e.start_date;
        if (!dateStr) return false;
        const eventDate = new Date(dateStr);
        return isSameDay(eventDate, day.date);
      }),
    }));
  }, [currentDate, events]);

  const handleDragOver = useCallback((e: React.DragEvent, date: Date) => {
    e.preventDefault();
    setDragOverDate(date);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, date: Date) => {
    e.preventDefault();
    if (draggedEvent) {
      onEventDrop(draggedEvent, date);
    }
    setDraggedEvent(null);
    setDragOverDate(null);
  }, [draggedEvent, onEventDrop]);

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="flex flex-col h-full">
      {/* Week day headers */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
        {weekDays.map((day) => (
          <div key={day} className="py-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 grid grid-cols-7 grid-rows-6">
        {days.map((day, idx) => (
          <div
            key={idx}
            className={`
              min-h-[100px] p-1 border-r border-b border-gray-200 dark:border-gray-700
              ${!day.isCurrentMonth ? 'bg-gray-50 dark:bg-gray-900' : 'bg-white dark:bg-gray-800'}
              ${day.isToday ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}
              ${dragOverDate && isSameDay(dragOverDate, day.date) ? 'bg-indigo-100 dark:bg-indigo-900/40' : ''}
              ${idx % 7 === 6 ? 'border-r-0' : ''}
            `}
            onDragOver={(e) => handleDragOver(e, day.date)}
            onDrop={(e) => handleDrop(e, day.date)}
            onClick={() => onDayClick(day.date)}
          >
            {/* Day number */}
            <div className={`
              inline-flex items-center justify-center w-7 h-7 text-sm mb-1
              ${day.isToday 
                ? 'bg-indigo-600 text-white rounded-full' 
                : day.isCurrentMonth 
                  ? 'text-gray-900 dark:text-white' 
                  : 'text-gray-400 dark:text-gray-600'
              }
            `}>
              {day.date.getDate()}
            </div>

            {/* Events */}
            <div className="space-y-1 overflow-y-auto max-h-[80px]">
              {day.events.slice(0, 3).map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  isCompact
                  onClick={() => onEventClick(event)}
                  onDragStart={() => setDraggedEvent(event.id)}
                  isDragging={draggedEvent === event.id}
                />
              ))}
              {day.events.length > 3 && (
                <button className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                  +{day.events.length - 3} more
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Week View Component
// ============================================================================
interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onDayClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
  onEventDrop: (eventId: string, date: Date) => void;
}

function WeekView({ currentDate, events, onDayClick, onEventClick, onEventDrop }: WeekViewProps) {
  const [draggedEvent, setDraggedEvent] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<Date | null>(null);

  const days = useMemo(() => {
    const weekDays = getWeekDays(currentDate);
    return weekDays.map(day => ({
      ...day,
      events: events.filter(e => {
        const dateStr = e.due_date || e.start_date;
        if (!dateStr) return false;
        const eventDate = new Date(dateStr);
        return isSameDay(eventDate, day.date);
      }),
    }));
  }, [currentDate, events]);

  const handleDragOver = useCallback((e: React.DragEvent, date: Date) => {
    e.preventDefault();
    setDragOverDate(date);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, date: Date) => {
    e.preventDefault();
    if (draggedEvent) {
      onEventDrop(draggedEvent, date);
    }
    setDraggedEvent(null);
    setDragOverDate(null);
  }, [draggedEvent, onEventDrop]);

  return (
    <div className="flex h-full">
      {days.map((day, idx) => (
        <div
          key={idx}
          className={`
            flex-1 flex flex-col min-w-[120px] border-r border-gray-200 dark:border-gray-700 last:border-r-0
            ${day.isToday ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'bg-white dark:bg-gray-800'}
            ${dragOverDate && isSameDay(dragOverDate, day.date) ? 'bg-indigo-100 dark:bg-indigo-900/40' : ''}
          `}
          onDragOver={(e) => handleDragOver(e, day.date)}
          onDrop={(e) => handleDrop(e, day.date)}
        >
          {/* Day header */}
          <div 
            className="p-3 text-center border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
            onClick={() => onDayClick(day.date)}
          >
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">
              {day.date.toLocaleDateString('en-US', { weekday: 'short' })}
            </div>
            <div className={`
              inline-flex items-center justify-center w-8 h-8 text-lg font-semibold mt-1
              ${day.isToday 
                ? 'bg-indigo-600 text-white rounded-full' 
                : 'text-gray-900 dark:text-white'
              }
            `}>
              {day.date.getDate()}
            </div>
          </div>

          {/* Events */}
          <div className="flex-1 p-2 overflow-y-auto space-y-2">
            {day.events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onClick={() => onEventClick(event)}
                onDragStart={() => setDraggedEvent(event.id)}
                isDragging={draggedEvent === event.id}
              />
            ))}
            {day.events.length === 0 && (
              <div className="h-full flex items-center justify-center">
                <button 
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  onClick={() => onDayClick(day.date)}
                  title="Add card"
                >
                  {Icons.plus}
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Day View Component
// ============================================================================
interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onHourClick: (date: Date) => void;
}

function DayView({ currentDate, events, onEventClick, onHourClick }: DayViewProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const today = new Date();
  const isToday = isSameDay(currentDate, today);

  const dayEvents = useMemo(() => {
    return events.filter(e => {
      const dateStr = e.due_date || e.start_date;
      if (!dateStr) return false;
      const eventDate = new Date(dateStr);
      return isSameDay(eventDate, currentDate);
    });
  }, [currentDate, events]);

  // Group events by hour
  const eventsByHour = useMemo(() => {
    const grouped: Record<number, CalendarEvent[]> = {};
    dayEvents.forEach(event => {
      const hour = event.due_date 
        ? new Date(event.due_date).getHours()
        : 0;
      if (!grouped[hour]) grouped[hour] = [];
      grouped[hour].push(event);
    });
    return grouped;
  }, [dayEvents]);

  // All-day events (no specific time)
  const allDayEvents = dayEvents.filter(e => !e.due_date && e.start_date);

  return (
    <div className="flex flex-col h-full">
      {/* Day header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className={`text-2xl font-bold ${isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-900 dark:text-white'}`}>
          {formatDate(currentDate, 'long')}
        </h2>
        {isToday && (
          <span className="text-sm text-indigo-600 dark:text-indigo-400">Today</span>
        )}
      </div>

      {/* All-day events */}
      {allDayEvents.length > 0 && (
        <div className="p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">All Day</div>
          <div className="space-y-1">
            {allDayEvents.map(event => (
              <EventCard
                key={event.id}
                event={event}
                onClick={() => onEventClick(event)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Hourly timeline */}
      <div className="flex-1 overflow-y-auto">
        {hours.map((hour) => {
          const hourDate = new Date(currentDate);
          hourDate.setHours(hour, 0, 0, 0);
          const isCurrentHour = isToday && today.getHours() === hour;

          return (
            <div
              key={hour}
              className={`
                flex min-h-[60px] border-b border-gray-100 dark:border-gray-800
                ${isCurrentHour ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}
              `}
            >
              {/* Hour label */}
              <div className="w-16 py-2 px-2 text-right text-xs text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700">
                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
              </div>

              {/* Events for this hour */}
              <div 
                className="flex-1 p-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={() => onHourClick(hourDate)}
              >
                <div className="space-y-1">
                  {(eventsByHour[hour] || []).map(event => (
                    <EventCard
                      key={event.id}
                      event={event}
                      isCompact
                      onClick={() => onEventClick(event)}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Main Calendar View Component
// ============================================================================
export function CalendarView({
  boardId,
  columns,
  labels,
  members,
  filters,
  onCardClick,
  onDateClick,
  onEventDrop,
}: CalendarViewProps) {
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Calculate date range based on view mode
  const dateRange: CalendarRange = useMemo(() => {
    switch (viewMode) {
      case 'month':
        return {
          start: startOfWeek(startOfMonth(currentDate)),
          end: endOfWeek(endOfMonth(currentDate)),
        };
      case 'week':
        return {
          start: startOfWeek(currentDate),
          end: endOfWeek(currentDate),
        };
      case 'day':
        return {
          start: currentDate,
          end: currentDate,
        };
    }
  }, [viewMode, currentDate]);

  const { events, loading, error, updateCardDates } = useCalendarEvents(boardId, { filters, dateRange });

  const handlePrevious = useCallback(() => {
    switch (viewMode) {
      case 'month':
        setCurrentDate(prev => addMonths(prev, -1));
        break;
      case 'week':
        setCurrentDate(prev => addDays(prev, -7));
        break;
      case 'day':
        setCurrentDate(prev => addDays(prev, -1));
        break;
    }
  }, [viewMode]);

  const handleNext = useCallback(() => {
    switch (viewMode) {
      case 'month':
        setCurrentDate(prev => addMonths(prev, 1));
        break;
      case 'week':
        setCurrentDate(prev => addDays(prev, 7));
        break;
      case 'day':
        setCurrentDate(prev => addDays(prev, 1));
        break;
    }
  }, [viewMode]);

  const handleToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const handleEventClick = useCallback((event: CalendarEvent) => {
    if (onCardClick) {
      // Convert event back to card for click handler
      const card: Card = {
        id: event.id,
        column_id: event.column_id,
        board_id: event.board_id,
        title: event.title,
        description: event.description,
        position: 0,
        due_date: event.due_date,
        start_date: event.start_date,
        end_date: event.end_date,
        assignee: event.assignee,
        priority: event.priority || 'medium',
        color: null,
        estimated_hours: null,
        metadata: {},
        created_by: '',
        created_at: '',
      };
      onCardClick(card);
    }
  }, [onCardClick]);

  const handleDayClick = useCallback((date: Date) => {
    if (viewMode === 'month') {
      setViewMode('day');
      setCurrentDate(date);
    } else if (onDateClick) {
      onDateClick(date);
    }
  }, [viewMode, onDateClick]);

  const handleEventDrop = useCallback(async (eventId: string, newDate: Date) => {
    if (onEventDrop) {
      await onEventDrop(eventId, newDate);
    } else {
      await updateCardDates(eventId, newDate, newDate);
    }
  }, [onEventDrop, updateCardDates]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      switch (e.key) {
        case 'ArrowLeft':
          handlePrevious();
          break;
        case 'ArrowRight':
          handleNext();
          break;
        case 't':
          handleToday();
          break;
        case 'm':
          setViewMode('month');
          break;
        case 'w':
          setViewMode('week');
          break;
        case 'd':
          setViewMode('day');
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrevious, handleNext, handleToday]);

  const getHeaderTitle = (): string => {
    switch (viewMode) {
      case 'month':
        return formatDate(currentDate, 'month-year');
      case 'week':
        const weekStart = startOfWeek(currentDate);
        const weekEnd = endOfWeek(currentDate);
        if (weekStart.getMonth() === weekEnd.getMonth()) {
          return `${formatDate(weekStart, 'short')} - ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`;
        }
        return `${formatDate(weekStart, 'short')} - ${formatDate(weekEnd, 'short')}`;
      case 'day':
        return formatDate(currentDate, 'long');
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600 dark:text-red-400">
        Error loading calendar: {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg overflow-hidden">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        {/* Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevious}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Previous"
          >
            {Icons.chevronLeft}
          </button>
          <button
            onClick={handleNext}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Next"
          >
            {Icons.chevronRight}
          </button>
          <button
            onClick={handleToday}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 
              hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            Today
          </button>
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          {getHeaderTitle()}
        </h2>

        {/* View mode switcher */}
        <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
          {(['month', 'week', 'day'] as CalendarViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`
                px-3 py-1.5 text-sm font-medium rounded-md capitalize transition-colors
                ${viewMode === mode
                  ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }
              `}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar Body */}
      <div className="flex-1 overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 flex items-center justify-center z-10">
            {Icons.spinner}
          </div>
        )}

        {viewMode === 'month' && (
          <MonthView
            currentDate={currentDate}
            events={events}
            onDayClick={handleDayClick}
            onEventClick={handleEventClick}
            onEventDrop={handleEventDrop}
          />
        )}

        {viewMode === 'week' && (
          <WeekView
            currentDate={currentDate}
            events={events}
            onDayClick={handleDayClick}
            onEventClick={handleEventClick}
            onEventDrop={handleEventDrop}
          />
        )}

        {viewMode === 'day' && (
          <DayView
            currentDate={currentDate}
            events={events}
            onEventClick={handleEventClick}
            onHourClick={handleDayClick}
          />
        )}
      </div>

      {/* Footer with keyboard shortcuts hint */}
      <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            {Icons.calendar}
            {events.length} events
          </span>
          <span className="hidden sm:inline">
            Press <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">←</kbd> <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">→</kbd> to navigate, 
            <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded ml-1">t</kbd> for today,
            <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded ml-1">m</kbd><kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">w</kbd><kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">d</kbd> to switch views
          </span>
        </div>
      </div>
    </div>
  );
}

export default CalendarView;
