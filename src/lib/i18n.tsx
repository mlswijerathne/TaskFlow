'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// ============================================================================
// Types
// ============================================================================
export type Locale = 'en' | 'es' | 'fr' | 'de' | 'ja' | 'zh';

export interface TranslationValues {
  [key: string]: string | number;
}

export interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, values?: TranslationValues) => string;
  formatDate: (date: Date | string, format?: DateFormat) => string;
  formatNumber: (num: number, options?: Intl.NumberFormatOptions) => string;
  formatRelativeTime: (date: Date | string) => string;
}

export type DateFormat = 'short' | 'medium' | 'long' | 'full' | 'time' | 'datetime';

// ============================================================================
// Translations
// ============================================================================
const translations: Record<Locale, Record<string, string>> = {
  en: {
    // Views
    'views.kanban': 'Board',
    'views.calendar': 'Calendar',
    'views.gantt': 'Timeline',
    'views.table': 'Table',
    
    // Common actions
    'actions.save': 'Save',
    'actions.cancel': 'Cancel',
    'actions.delete': 'Delete',
    'actions.edit': 'Edit',
    'actions.create': 'Create',
    'actions.close': 'Close',
    'actions.search': 'Search',
    'actions.filter': 'Filter',
    'actions.export': 'Export',
    'actions.import': 'Import',
    
    // Board
    'board.addCard': 'Add card',
    'board.addColumn': 'Add column',
    'board.editCard': 'Edit card',
    'board.deleteCard': 'Delete card',
    'board.moveCard': 'Move card',
    'board.cardTitle': 'Card title',
    'board.cardDescription': 'Description',
    'board.noCards': 'No cards in this column',
    'board.cardCount': '{count, plural, =0 {No cards} =1 {1 card} other {{count} cards}}',
    
    // Filters
    'filters.labels': 'Labels',
    'filters.assignee': 'Assignee',
    'filters.priority': 'Priority',
    'filters.dueDate': 'Due date',
    'filters.clearAll': 'Clear all',
    'filters.activeFilters': '{count} active filter(s)',
    
    // Priority
    'priority.urgent': 'Urgent',
    'priority.high': 'High',
    'priority.medium': 'Medium',
    'priority.low': 'Low',
    'priority.none': 'None',
    
    // Calendar
    'calendar.today': 'Today',
    'calendar.month': 'Month',
    'calendar.week': 'Week',
    'calendar.day': 'Day',
    'calendar.events': '{count} event(s)',
    'calendar.noEvents': 'No events',
    'calendar.allDay': 'All day',
    
    // Gantt
    'gantt.zoomIn': 'Zoom in',
    'gantt.zoomOut': 'Zoom out',
    'gantt.groupBy': 'Group by',
    'gantt.noTasks': 'No tasks to display',
    'gantt.progress': '{progress}% complete',
    
    // Table
    'table.noData': 'No data',
    'table.selectAll': 'Select all',
    'table.selected': '{count} selected',
    'table.perPage': 'per page',
    'table.page': 'Page {current} of {total}',
    
    // Templates
    'templates.title': 'Templates',
    'templates.browse': 'Browse templates',
    'templates.create': 'Create board',
    'templates.blank': 'Start from scratch',
    'templates.use': 'Use template',
    'templates.preview': 'Preview',
    'templates.official': 'Official',
    'templates.custom': 'Custom',
    
    // Time relative
    'time.justNow': 'Just now',
    'time.minutesAgo': '{count} minute(s) ago',
    'time.hoursAgo': '{count} hour(s) ago',
    'time.daysAgo': '{count} day(s) ago',
    'time.weeksAgo': '{count} week(s) ago',
    'time.monthsAgo': '{count} month(s) ago',
    
    // Errors
    'error.generic': 'Something went wrong',
    'error.notFound': 'Not found',
    'error.unauthorized': 'Unauthorized',
    'error.network': 'Network error',
    
    // Success messages
    'success.saved': 'Changes saved',
    'success.created': 'Created successfully',
    'success.deleted': 'Deleted successfully',
    'success.copied': 'Copied to clipboard',
  },
  
  es: {
    // Views
    'views.kanban': 'Tablero',
    'views.calendar': 'Calendario',
    'views.gantt': 'Línea de tiempo',
    'views.table': 'Tabla',
    
    // Common actions
    'actions.save': 'Guardar',
    'actions.cancel': 'Cancelar',
    'actions.delete': 'Eliminar',
    'actions.edit': 'Editar',
    'actions.create': 'Crear',
    'actions.close': 'Cerrar',
    'actions.search': 'Buscar',
    'actions.filter': 'Filtrar',
    'actions.export': 'Exportar',
    'actions.import': 'Importar',
    
    // Priority
    'priority.urgent': 'Urgente',
    'priority.high': 'Alta',
    'priority.medium': 'Media',
    'priority.low': 'Baja',
    'priority.none': 'Ninguna',
    
    // Calendar
    'calendar.today': 'Hoy',
    'calendar.month': 'Mes',
    'calendar.week': 'Semana',
    'calendar.day': 'Día',
  },
  
  fr: {
    // Views
    'views.kanban': 'Tableau',
    'views.calendar': 'Calendrier',
    'views.gantt': 'Chronologie',
    'views.table': 'Tableau',
    
    // Common actions
    'actions.save': 'Enregistrer',
    'actions.cancel': 'Annuler',
    'actions.delete': 'Supprimer',
    'actions.edit': 'Modifier',
    'actions.create': 'Créer',
    'actions.close': 'Fermer',
    
    // Priority
    'priority.urgent': 'Urgent',
    'priority.high': 'Haute',
    'priority.medium': 'Moyenne',
    'priority.low': 'Basse',
    'priority.none': 'Aucune',
  },
  
  de: {
    // Views
    'views.kanban': 'Board',
    'views.calendar': 'Kalender',
    'views.gantt': 'Zeitachse',
    'views.table': 'Tabelle',
    
    // Common actions
    'actions.save': 'Speichern',
    'actions.cancel': 'Abbrechen',
    'actions.delete': 'Löschen',
    'actions.edit': 'Bearbeiten',
    'actions.create': 'Erstellen',
    'actions.close': 'Schließen',
  },
  
  ja: {
    // Views
    'views.kanban': 'ボード',
    'views.calendar': 'カレンダー',
    'views.gantt': 'タイムライン',
    'views.table': 'テーブル',
    
    // Common actions
    'actions.save': '保存',
    'actions.cancel': 'キャンセル',
    'actions.delete': '削除',
    'actions.edit': '編集',
    'actions.create': '作成',
    'actions.close': '閉じる',
  },
  
  zh: {
    // Views
    'views.kanban': '看板',
    'views.calendar': '日历',
    'views.gantt': '时间线',
    'views.table': '表格',
    
    // Common actions
    'actions.save': '保存',
    'actions.cancel': '取消',
    'actions.delete': '删除',
    'actions.edit': '编辑',
    'actions.create': '创建',
    'actions.close': '关闭',
  },
};

// ============================================================================
// Date Formatting
// ============================================================================
const dateFormatOptions: Record<DateFormat, Intl.DateTimeFormatOptions> = {
  short: { month: 'short', day: 'numeric' },
  medium: { month: 'short', day: 'numeric', year: 'numeric' },
  long: { month: 'long', day: 'numeric', year: 'numeric' },
  full: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
  time: { hour: 'numeric', minute: '2-digit' },
  datetime: { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' },
};

// ============================================================================
// Context
// ============================================================================
const I18nContext = createContext<I18nContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================
interface I18nProviderProps {
  children: ReactNode;
  initialLocale?: Locale;
}

export function I18nProvider({ children, initialLocale = 'en' }: I18nProviderProps) {
  const [locale, setLocale] = useState<Locale>(initialLocale);

  const t = useCallback((key: string, values?: TranslationValues): string => {
    let text = translations[locale]?.[key] || translations.en[key] || key;
    
    // Simple variable interpolation
    if (values) {
      Object.entries(values).forEach(([k, v]) => {
        text = text.replace(new RegExp(`{${k}}`, 'g'), String(v));
      });
      
      // Handle plural forms (simplified)
      const pluralMatch = text.match(/{(\w+), plural, (.+?)}/);
      if (pluralMatch) {
        const [fullMatch, variable, options] = pluralMatch;
        const count = Number(values[variable]) || 0;
        const optionPairs = options.split(/\s+(?==\d+|other)/).filter(Boolean);
        
        let replacement = '';
        for (const pair of optionPairs) {
          const [condition, value] = pair.split(/\s*{/).map(s => s.replace('}', '').trim());
          if (condition === 'other') {
            replacement = value.replace(/\{(\w+)\}/g, (_, v) => String(values[v] || ''));
            break;
          }
          if (condition === `=${count}`) {
            replacement = value.replace(/\{(\w+)\}/g, (_, v) => String(values[v] || ''));
            break;
          }
        }
        text = text.replace(fullMatch, replacement);
      }
    }
    
    return text;
  }, [locale]);

  const formatDate = useCallback((date: Date | string, format: DateFormat = 'medium'): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const localeMap: Record<Locale, string> = {
      en: 'en-US',
      es: 'es-ES',
      fr: 'fr-FR',
      de: 'de-DE',
      ja: 'ja-JP',
      zh: 'zh-CN',
    };
    return new Intl.DateTimeFormat(localeMap[locale], dateFormatOptions[format]).format(d);
  }, [locale]);

  const formatNumber = useCallback((num: number, options?: Intl.NumberFormatOptions): string => {
    const localeMap: Record<Locale, string> = {
      en: 'en-US',
      es: 'es-ES',
      fr: 'fr-FR',
      de: 'de-DE',
      ja: 'ja-JP',
      zh: 'zh-CN',
    };
    return new Intl.NumberFormat(localeMap[locale], options).format(num);
  }, [locale]);

  const formatRelativeTime = useCallback((date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);

    if (diffMins < 1) return t('time.justNow');
    if (diffMins < 60) return t('time.minutesAgo', { count: diffMins });
    if (diffHours < 24) return t('time.hoursAgo', { count: diffHours });
    if (diffDays < 7) return t('time.daysAgo', { count: diffDays });
    if (diffWeeks < 4) return t('time.weeksAgo', { count: diffWeeks });
    return t('time.monthsAgo', { count: diffMonths });
  }, [t]);

  const value: I18nContextValue = {
    locale,
    setLocale,
    t,
    formatDate,
    formatNumber,
    formatRelativeTime,
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================
export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

// ============================================================================
// Standalone Translation Function (for non-component use)
// ============================================================================
export function translate(key: string, locale: Locale = 'en', values?: TranslationValues): string {
  let text = translations[locale]?.[key] || translations.en[key] || key;
  
  if (values) {
    Object.entries(values).forEach(([k, v]) => {
      text = text.replace(new RegExp(`{${k}}`, 'g'), String(v));
    });
  }
  
  return text;
}

// ============================================================================
// Locale Detection
// ============================================================================
export function detectLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  
  // Check localStorage first
  const stored = localStorage.getItem('kanban-locale');
  if (stored && Object.keys(translations).includes(stored)) {
    return stored as Locale;
  }
  
  // Check browser language
  const browserLang = navigator.language.split('-')[0];
  if (Object.keys(translations).includes(browserLang)) {
    return browserLang as Locale;
  }
  
  return 'en';
}

// ============================================================================
// Export all supported locales
// ============================================================================
export const SUPPORTED_LOCALES: { code: Locale; name: string; nativeName: string }[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
];

export default {
  I18nProvider,
  useI18n,
  translate,
  detectLocale,
  SUPPORTED_LOCALES,
};
