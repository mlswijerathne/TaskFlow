export { useBoardMembers } from './useBoardMembers';
export { useBoardPresence } from './useBoardPresence';
export { useBoardActivity, formatActivityMessage, getActivityIcon } from './useBoardActivity';
export { useLabels, useCardLabels } from './useLabels';
export { useChecklists, useChecklistProgress } from './useChecklists';

// Phase 4: Multi-view and Templates
export { useViewState } from './useViewState';
export { useBoardTemplates } from './useBoardTemplates';
export { 
  useCalendarEvents,
  type CalendarFilter,
  type CalendarRange,
} from './useCalendarEvents';
export { 
  useGanttData,
  type GanttFilter,
  type GanttGroupBy,
  type GanttZoomLevel,
} from './useGanttData';
export { 
  useTableData,
  type TableCard,
  type TableColumn,
  type TableSortState,
  type TableFilterState,
} from './useTableData';

// Re-export types from database
export { type TemplateWithDetails } from '@/types/database';
