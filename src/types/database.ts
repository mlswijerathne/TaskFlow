export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Role types for board members
export type BoardMemberRole = 'owner' | 'editor' | 'viewer';

// Priority types for cards
export type CardPriority = 'low' | 'medium' | 'high' | 'critical';

// Template category types
export type TemplateCategory = 'agile' | 'marketing' | 'product' | 'engineering' | 'sales' | 'hr' | 'custom';

// Template categories array for iteration
export const TEMPLATE_CATEGORIES: TemplateCategory[] = ['agile', 'marketing', 'product', 'engineering', 'sales', 'hr', 'custom'];

// Board view types
export type BoardViewType = 'board' | 'calendar' | 'gantt' | 'table';

// Alias for components expecting ViewType
export type ViewType = BoardViewType;

// Dependency types for Gantt
export type DependencyType = 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';

// Activity action types
export type ActivityAction =
  | 'card_created'
  | 'card_moved'
  | 'card_updated'
  | 'card_assigned'
  | 'card_deleted'
  | 'due_date_changed'
  | 'priority_changed'
  | 'label_added'
  | 'label_removed'
  | 'checklist_created'
  | 'checklist_deleted'
  | 'checklist_item_added'
  | 'checklist_item_toggled'
  | 'checklist_item_deleted'
  | 'column_created'
  | 'column_renamed'
  | 'column_deleted'
  | 'member_added'
  | 'member_removed'
  | 'role_changed';

// Entity types for activity log
export type ActivityEntityType = 'card' | 'column' | 'member' | 'board';

export interface Database {
  public: {
    Tables: {
      boards: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          owner: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          owner: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          owner?: string;
          created_at?: string;
        };
      };
      columns: {
        Row: {
          id: string;
          board_id: string;
          title: string;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          board_id: string;
          title: string;
          position?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          board_id?: string;
          title?: string;
          position?: number;
          created_at?: string;
        };
      };
      cards: {
        Row: {
          id: string;
          column_id: string;
          board_id: string;
          title: string;
          description: string | null;
          assignee: string | null;
          due_date: string | null;
          start_date: string | null;
          end_date: string | null;
          priority: 'low' | 'medium' | 'high' | 'critical';
          color: string | null;
          estimated_hours: number | null;
          metadata: Json;
          position: number;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          column_id: string;
          board_id: string;
          title: string;
          description?: string | null;
          assignee?: string | null;
          due_date?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          priority?: 'low' | 'medium' | 'high' | 'critical';
          color?: string | null;
          estimated_hours?: number | null;
          metadata?: Json;
          position?: number;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          column_id?: string;
          board_id?: string;
          title?: string;
          description?: string | null;
          assignee?: string | null;
          due_date?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          priority?: 'low' | 'medium' | 'high' | 'critical';
          color?: string | null;
          estimated_hours?: number | null;
          metadata?: Json;
          position?: number;
          created_by?: string;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          card_id: string | null;
          type: string;
          payload: Json;
          read: boolean;
          send_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          card_id?: string | null;
          type: string;
          payload?: Json;
          read?: boolean;
          send_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          card_id?: string | null;
          type?: string;
          payload?: Json;
          read?: boolean;
          send_at?: string | null;
          created_at?: string;
        };
      };
      attachments: {
        Row: {
          id: string;
          card_id: string;
          file_name: string;
          file_path: string;
          file_size: number;
          mime_type: string;
          uploaded_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          card_id: string;
          file_name: string;
          file_path: string;
          file_size: number;
          mime_type: string;
          uploaded_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          card_id?: string;
          file_name?: string;
          file_path?: string;
          file_size?: number;
          mime_type?: string;
          uploaded_by?: string;
          created_at?: string;
        };
      };
      board_members: {
        Row: {
          id: string;
          board_id: string;
          user_id: string;
          role: 'owner' | 'editor' | 'viewer';
          created_at: string;
        };
        Insert: {
          id?: string;
          board_id: string;
          user_id: string;
          role: 'owner' | 'editor' | 'viewer';
          created_at?: string;
        };
        Update: {
          id?: string;
          board_id?: string;
          user_id?: string;
          role?: 'owner' | 'editor' | 'viewer';
          created_at?: string;
        };
      };
      board_activity: {
        Row: {
          id: string;
          board_id: string;
          user_id: string;
          action: string;
          entity_type: string;
          entity_id: string | null;
          details: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          board_id: string;
          user_id: string;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          details?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          board_id?: string;
          user_id?: string;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          details?: Json;
          created_at?: string;
        };
      };
      user_profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      labels: {
        Row: {
          id: string;
          board_id: string;
          name: string;
          color: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          board_id: string;
          name: string;
          color?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          board_id?: string;
          name?: string;
          color?: string;
          created_at?: string;
        };
      };
      card_labels: {
        Row: {
          id: string;
          card_id: string;
          label_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          card_id: string;
          label_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          card_id?: string;
          label_id?: string;
          created_at?: string;
        };
      };
      checklists: {
        Row: {
          id: string;
          card_id: string;
          title: string;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          card_id: string;
          title?: string;
          position?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          card_id?: string;
          title?: string;
          position?: number;
          created_at?: string;
        };
      };
      checklist_items: {
        Row: {
          id: string;
          checklist_id: string;
          title: string;
          completed: boolean;
          position: number;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          checklist_id: string;
          title: string;
          completed?: boolean;
          position?: number;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          checklist_id?: string;
          title?: string;
          completed?: boolean;
          position?: number;
          created_at?: string;
          completed_at?: string | null;
        };
      };
      card_dependencies: {
        Row: {
          id: string;
          predecessor_id: string;
          successor_id: string;
          dependency_type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';
          lag_days: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          predecessor_id: string;
          successor_id: string;
          dependency_type?: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';
          lag_days?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          predecessor_id?: string;
          successor_id?: string;
          dependency_type?: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';
          lag_days?: number;
          created_at?: string;
        };
      };
      board_templates: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          category: 'agile' | 'marketing' | 'product' | 'engineering' | 'sales' | 'hr' | 'custom';
          thumbnail_url: string | null;
          is_public: boolean;
          created_by: string | null;
          preview_image_url: string | null;
          usage_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          category?: 'agile' | 'marketing' | 'product' | 'engineering' | 'sales' | 'hr' | 'custom';
          thumbnail_url?: string | null;
          is_public?: boolean;
          created_by?: string | null;
          preview_image_url?: string | null;
          usage_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          category?: 'agile' | 'marketing' | 'product' | 'engineering' | 'sales' | 'hr' | 'custom';
          thumbnail_url?: string | null;
          is_public?: boolean;
          created_by?: string | null;
          preview_image_url?: string | null;
          usage_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      template_columns: {
        Row: {
          id: string;
          template_id: string;
          title: string;
          position: number;
          color: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          template_id: string;
          title: string;
          position?: number;
          color?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          template_id?: string;
          title?: string;
          position?: number;
          color?: string | null;
          created_at?: string;
        };
      };
      template_labels: {
        Row: {
          id: string;
          template_id: string;
          name: string;
          color: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          template_id: string;
          name: string;
          color: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          template_id?: string;
          name?: string;
          color?: string;
          created_at?: string;
        };
      };
      template_cards: {
        Row: {
          id: string;
          template_id: string;
          template_column_id: string;
          title: string;
          description: string | null;
          priority: string;
          position: number;
          estimated_days: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          template_id: string;
          template_column_id: string;
          title: string;
          description?: string | null;
          priority?: string;
          position?: number;
          estimated_days?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          template_id?: string;
          template_column_id?: string;
          title?: string;
          description?: string | null;
          priority?: string;
          position?: number;
          estimated_days?: number | null;
          created_at?: string;
        };
      };
      user_view_preferences: {
        Row: {
          id: string;
          user_id: string;
          board_id: string;
          default_view: 'board' | 'calendar' | 'gantt' | 'table';
          calendar_settings: Json;
          gantt_settings: Json;
          table_settings: Json;
          filters: Json;
          hidden_columns: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          board_id: string;
          default_view?: 'board' | 'calendar' | 'gantt' | 'table';
          calendar_settings?: Json;
          gantt_settings?: Json;
          table_settings?: Json;
          filters?: Json;
          hidden_columns?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          board_id?: string;
          default_view?: 'board' | 'calendar' | 'gantt' | 'table';
          calendar_settings?: Json;
          gantt_settings?: Json;
          table_settings?: Json;
          filters?: Json;
          hidden_columns?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// Convenience types
export type Board = Database['public']['Tables']['boards']['Row'];
export type BoardInsert = Database['public']['Tables']['boards']['Insert'];
export type BoardUpdate = Database['public']['Tables']['boards']['Update'];

export type Column = Database['public']['Tables']['columns']['Row'];
export type ColumnInsert = Database['public']['Tables']['columns']['Insert'];
export type ColumnUpdate = Database['public']['Tables']['columns']['Update'];

export type Card = Database['public']['Tables']['cards']['Row'];
export type CardInsert = Database['public']['Tables']['cards']['Insert'];
export type CardUpdate = Database['public']['Tables']['cards']['Update'];

export type Notification = Database['public']['Tables']['notifications']['Row'];
export type NotificationInsert = Database['public']['Tables']['notifications']['Insert'];
export type NotificationUpdate = Database['public']['Tables']['notifications']['Update'];

export type Attachment = Database['public']['Tables']['attachments']['Row'];
export type AttachmentInsert = Database['public']['Tables']['attachments']['Insert'];
export type AttachmentUpdate = Database['public']['Tables']['attachments']['Update'];

export type BoardMember = Database['public']['Tables']['board_members']['Row'];
export type BoardMemberInsert = Database['public']['Tables']['board_members']['Insert'];
export type BoardMemberUpdate = Database['public']['Tables']['board_members']['Update'];

export type BoardActivity = Database['public']['Tables']['board_activity']['Row'];
export type BoardActivityInsert = Database['public']['Tables']['board_activity']['Insert'];
export type BoardActivityUpdate = Database['public']['Tables']['board_activity']['Update'];

export type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
export type UserProfileInsert = Database['public']['Tables']['user_profiles']['Insert'];
export type UserProfileUpdate = Database['public']['Tables']['user_profiles']['Update'];

export type Label = Database['public']['Tables']['labels']['Row'];
export type LabelInsert = Database['public']['Tables']['labels']['Insert'];
export type LabelUpdate = Database['public']['Tables']['labels']['Update'];

export type CardLabel = Database['public']['Tables']['card_labels']['Row'];
export type CardLabelInsert = Database['public']['Tables']['card_labels']['Insert'];
export type CardLabelUpdate = Database['public']['Tables']['card_labels']['Update'];

export type Checklist = Database['public']['Tables']['checklists']['Row'];
export type ChecklistInsert = Database['public']['Tables']['checklists']['Insert'];
export type ChecklistUpdate = Database['public']['Tables']['checklists']['Update'];

export type ChecklistItem = Database['public']['Tables']['checklist_items']['Row'];
export type ChecklistItemInsert = Database['public']['Tables']['checklist_items']['Insert'];
export type ChecklistItemUpdate = Database['public']['Tables']['checklist_items']['Update'];

// Extended types with relations
export type ColumnWithCards = Column & {
  cards: CardWithDetails[];
};

export type BoardWithColumns = Board & {
  columns: ColumnWithCards[];
};

export type CardWithAttachments = Card & {
  attachments: Attachment[];
};

// Card with all details (labels, checklists)
export type CardWithDetails = Card & {
  labels?: Label[];
  checklists?: ChecklistWithItems[];
  attachments?: Attachment[];
};

// Checklist with items
export type ChecklistWithItems = Checklist & {
  items: ChecklistItem[];
};

// Board member with user profile
export type BoardMemberWithProfile = BoardMember & {
  user_profile: UserProfile | null;
};

// Activity with user profile
export type BoardActivityWithProfile = BoardActivity & {
  user_profile: UserProfile | null;
};

// Presence types for realtime
export interface PresenceState {
  userId: string;
  display_name?: string;
  avatar_url?: string;
  editingCardId?: string | null;
  isTyping?: boolean;
  lastSeen: string;
}

export interface OnlineUser {
  userId: string;
  displayName?: string;
  avatarUrl?: string;
  editingCardId?: string | null;
  isTyping?: boolean;
  lastSeen: string;
}

// Permission types
export interface BoardPermissions {
  canEditBoard: boolean;
  canEditColumns: boolean;
  canEditCards: boolean;
  canManageMembers: boolean;
  canUploadAttachments: boolean;
  canDeleteBoard: boolean;
  role: BoardMemberRole | null;
}

// Priority configuration
export const PRIORITY_CONFIG: Record<CardPriority, { label: string; color: string; bgColor: string; borderColor: string }> = {
  low: {
    label: 'Low',
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-700',
    borderColor: 'border-gray-300 dark:border-gray-600',
  },
  medium: {
    label: 'Medium',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    borderColor: 'border-blue-300 dark:border-blue-700',
  },
  high: {
    label: 'High',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    borderColor: 'border-orange-300 dark:border-orange-700',
  },
  critical: {
    label: 'Critical',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    borderColor: 'border-red-300 dark:border-red-700',
  },
};

// Default label colors
export const LABEL_COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#eab308', // Yellow
  '#84cc16', // Lime
  '#22c55e', // Green
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#a855f7', // Purple
  '#d946ef', // Fuchsia
  '#ec4899', // Pink
  '#64748b', // Slate
];

// =====================================================
// Phase 4: Multi-View Types
// =====================================================

// New table convenience types
export type CardDependency = Database['public']['Tables']['card_dependencies']['Row'];
export type CardDependencyInsert = Database['public']['Tables']['card_dependencies']['Insert'];
export type CardDependencyUpdate = Database['public']['Tables']['card_dependencies']['Update'];

export type BoardTemplate = Database['public']['Tables']['board_templates']['Row'];
export type BoardTemplateInsert = Database['public']['Tables']['board_templates']['Insert'];
export type BoardTemplateUpdate = Database['public']['Tables']['board_templates']['Update'];

export type TemplateColumn = Database['public']['Tables']['template_columns']['Row'];
export type TemplateColumnInsert = Database['public']['Tables']['template_columns']['Insert'];
export type TemplateColumnUpdate = Database['public']['Tables']['template_columns']['Update'];

export type TemplateLabel = Database['public']['Tables']['template_labels']['Row'];
export type TemplateLabelInsert = Database['public']['Tables']['template_labels']['Insert'];
export type TemplateLabelUpdate = Database['public']['Tables']['template_labels']['Update'];

export type TemplateCard = Database['public']['Tables']['template_cards']['Row'];
export type TemplateCardInsert = Database['public']['Tables']['template_cards']['Insert'];
export type TemplateCardUpdate = Database['public']['Tables']['template_cards']['Update'];

export type UserViewPreference = Database['public']['Tables']['user_view_preferences']['Row'];
export type UserViewPreferenceInsert = Database['public']['Tables']['user_view_preferences']['Insert'];
export type UserViewPreferenceUpdate = Database['public']['Tables']['user_view_preferences']['Update'];

// Template with all related data
export type BoardTemplateWithDetails = BoardTemplate & {
  columns: TemplateColumn[];
  labels: TemplateLabel[];
  cards: TemplateCard[];
};

// Alias for convenience
export type TemplateWithDetails = BoardTemplateWithDetails;

// Card with dependencies for Gantt view
export type CardWithDependencies = Card & {
  predecessors?: CardDependency[];
  successors?: CardDependency[];
  labels?: Label[];
  column?: Column;
};

// =====================================================
// Calendar View Types
// =====================================================

export interface CalendarEvent {
  id: string;
  title: string;
  // Card dates
  start_date: string | null;
  end_date: string | null;
  due_date: string | null;
  // Card properties
  description: string | null;
  priority: CardPriority | null;
  completed: boolean;
  // Relationships
  board_id: string;
  column_id: string;
  column_name: string;
  assignee: string | null;
  labels: Label[];
  // Visual properties (for calendar rendering)
  backgroundColor?: string;
  borderColor?: string;
}

export interface CalendarViewSettings {
  defaultView: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek';
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday
  showWeekends: boolean;
  slotDuration: string; // '00:30:00' etc.
  businessHours?: {
    daysOfWeek: number[];
    startTime: string;
    endTime: string;
  };
}

// =====================================================
// Gantt View Types
// =====================================================

export interface GanttTask {
  id: string;
  title: string;
  // Date fields
  start_date: string | null;
  end_date: string | null;
  due_date: string | null;
  // Progress
  progress: number; // 0-100
  type: 'task' | 'milestone' | 'project';
  // Dependencies
  dependencies: string[]; // Array of predecessor task IDs
  // Card properties
  description: string | null;
  board_id: string;
  column_id: string;
  column_name: string;
  priority: CardPriority | null;
  assignee: string | null;
  labels: Label[];
  // Visual properties
  backgroundColor?: string;
  borderColor?: string;
}

export interface GanttViewSettings {
  viewMode: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
  showDependencies: boolean;
  showProgress: boolean;
  groupBy: 'none' | 'column' | 'assignee' | 'priority';
  sortBy: 'start_date' | 'due_date' | 'priority' | 'title';
  sortDirection: 'asc' | 'desc';
}

// =====================================================
// Table View Types
// =====================================================

export interface TableColumn {
  id: string;
  key: keyof Card | 'labels' | 'column' | 'assignee_profile';
  label: string;
  visible: boolean;
  width?: number;
  sortable: boolean;
  filterable: boolean;
  editable: boolean;
}

export interface TableViewSettings {
  columns: TableColumn[];
  pageSize: number;
  sortBy: string | null;
  sortDirection: 'asc' | 'desc';
  groupBy: string | null;
}

export interface TableFilter {
  column: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'between';
  value: string | string[] | number | number[] | boolean | Date | Date[];
}

export interface BulkAction {
  type: 'assign' | 'set_priority' | 'set_due_date' | 'add_label' | 'remove_label' | 'move_to_column' | 'delete';
  payload: Json;
}

// =====================================================
// View State Types
// =====================================================

export interface ViewState {
  currentView: BoardViewType;
  filters: {
    labels: string[];
    assignees: string[];
    priorities: CardPriority[];
    dateRange: {
      start: Date | null;
      end: Date | null;
    } | null;
    search: string;
    columns: string[];
  };
  calendarSettings: CalendarViewSettings;
  ganttSettings: GanttViewSettings;
  tableSettings: TableViewSettings;
}

export const DEFAULT_VIEW_STATE: ViewState = {
  currentView: 'board',
  filters: {
    labels: [],
    assignees: [],
    priorities: [],
    dateRange: null,
    search: '',
    columns: [],
  },
  calendarSettings: {
    defaultView: 'dayGridMonth',
    weekStartsOn: 1,
    showWeekends: true,
    slotDuration: '00:30:00',
  },
  ganttSettings: {
    viewMode: 'week',
    showDependencies: true,
    showProgress: true,
    groupBy: 'none',
    sortBy: 'start_date',
    sortDirection: 'asc',
  },
  tableSettings: {
    columns: [],
    pageSize: 50,
    sortBy: null,
    sortDirection: 'asc',
    groupBy: null,
  },
};

// Default table columns configuration
export const DEFAULT_TABLE_COLUMNS: TableColumn[] = [
  { id: 'title', key: 'title', label: 'Title', visible: true, sortable: true, filterable: true, editable: true },
  { id: 'column', key: 'column', label: 'Status', visible: true, sortable: true, filterable: true, editable: true },
  { id: 'priority', key: 'priority', label: 'Priority', visible: true, sortable: true, filterable: true, editable: true },
  { id: 'assignee', key: 'assignee_profile', label: 'Assignee', visible: true, sortable: true, filterable: true, editable: true },
  { id: 'due_date', key: 'due_date', label: 'Due Date', visible: true, sortable: true, filterable: true, editable: true },
  { id: 'start_date', key: 'start_date', label: 'Start Date', visible: false, sortable: true, filterable: true, editable: true },
  { id: 'labels', key: 'labels', label: 'Labels', visible: true, sortable: false, filterable: true, editable: true },
  { id: 'created_at', key: 'created_at', label: 'Created', visible: false, sortable: true, filterable: true, editable: false },
  { id: 'description', key: 'description', label: 'Description', visible: false, sortable: false, filterable: true, editable: true },
];

// Template category icons and colors
export const TEMPLATE_CATEGORY_CONFIG: Record<TemplateCategory, { label: string; icon: string; color: string }> = {
  agile: { label: 'Agile', icon: '🏃', color: 'bg-blue-100 text-blue-800' },
  marketing: { label: 'Marketing', icon: '📣', color: 'bg-pink-100 text-pink-800' },
  product: { label: 'Product', icon: '🎯', color: 'bg-purple-100 text-purple-800' },
  engineering: { label: 'Engineering', icon: '⚙️', color: 'bg-gray-100 text-gray-800' },
  sales: { label: 'Sales', icon: '💰', color: 'bg-green-100 text-green-800' },
  hr: { label: 'HR', icon: '👥', color: 'bg-orange-100 text-orange-800' },
  custom: { label: 'Custom', icon: '✨', color: 'bg-indigo-100 text-indigo-800' },
};

// View icons and labels
export const VIEW_CONFIG: Record<BoardViewType, { label: string; icon: string; shortcut: string }> = {
  board: { label: 'Board', icon: 'Columns', shortcut: '1' },
  calendar: { label: 'Calendar', icon: 'Calendar', shortcut: '2' },
  gantt: { label: 'Timeline', icon: 'GanttChart', shortcut: '3' },
  table: { label: 'Table', icon: 'Table', shortcut: '4' },
};

// Alias for VIEW_CONFIG for backwards compatibility
export const VIEW_ICONS = VIEW_CONFIG;
