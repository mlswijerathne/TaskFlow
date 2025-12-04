'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { 
  BoardTemplate, 
  TEMPLATE_CATEGORIES, 
  TemplateWithDetails,
  TemplateColumn,
  TemplateCard as TemplateCardType,
} from '@/types/database';
import { useBoardTemplates } from '@/hooks';

// ============================================================================
// Types
// ============================================================================
interface TemplateGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: BoardTemplate | null) => Promise<void>;
  mode?: 'create' | 'browse';
  currentBoardId?: string;
}

interface TemplateCardProps {
  template: BoardTemplate & Partial<Pick<TemplateWithDetails, 'columns' | 'labels' | 'cards'>>;
  isSelected: boolean;
  onSelect: () => void;
  onPreview: () => void;
}

interface TemplatePreviewProps {
  template: TemplateWithDetails;
  onBack: () => void;
  onUse: () => void;
  isLoading: boolean;
}

// ============================================================================
// Icons
// ============================================================================
const Icons = {
  close: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  blank: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
  ),
  template: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
    </svg>
  ),
  check: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  back: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  ),
  columns: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
    </svg>
  ),
  labels: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  ),
  cards: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
  preview: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  spinner: (
    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  ),
};

// Category icons mapping
const categoryIcons: Record<string, React.ReactNode> = {
  engineering: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  ),
  product: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
  ),
  marketing: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
    </svg>
  ),
  hr: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  sales: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  personal: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  other: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
};

// ============================================================================
// Template Card Component
// ============================================================================
function TemplateCard({ template, isSelected, onSelect, onPreview }: TemplateCardProps) {
  const columnCount = template.columns?.length || 0;
  const labelCount = template.labels?.length || 0;
  const cardCount = template.cards?.length || 0;

  return (
    <div
      className={`
        relative p-4 border-2 rounded-xl cursor-pointer transition-all duration-200
        ${isSelected
          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
        }
      `}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-white">
          {Icons.check}
        </div>
      )}

      {/* Template icon & category */}
      <div className="flex items-start justify-between mb-3">
        <div className={`
          p-2 rounded-lg
          ${template.is_public
            ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400'
            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
          }
        `}>
          {categoryIcons[template.category] || categoryIcons.other}
        </div>
        {template.is_public && (
          <span className="px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 rounded-full">
            Official
          </span>
        )}
      </div>

      {/* Template name & description */}
      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
        {template.name}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
        {template.description || 'No description'}
      </p>

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1">
          {Icons.columns}
          {columnCount} columns
        </span>
        <span className="flex items-center gap-1">
          {Icons.labels}
          {labelCount} labels
        </span>
        {cardCount > 0 && (
          <span className="flex items-center gap-1">
            {Icons.cards}
            {cardCount} cards
          </span>
        )}
      </div>

      {/* Preview button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onPreview();
        }}
        className="mt-3 flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
      >
        {Icons.preview}
        Preview
      </button>
    </div>
  );
}

// ============================================================================
// Template Preview Component
// ============================================================================
function TemplatePreview({ template, onBack, onUse, isLoading }: TemplatePreviewProps) {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          {Icons.back}
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {template.name}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {template.description}
          </p>
        </div>
        <button
          onClick={onUse}
          disabled={isLoading}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 
            disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isLoading && Icons.spinner}
          Use this template
        </button>
      </div>

      {/* Preview content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Columns preview */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Columns ({template.columns?.length || 0})
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {template.columns?.sort((a, b) => a.position - b.position).map((column) => (
              <div
                key={column.id}
                className="flex-shrink-0 w-64 bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center gap-2 mb-2">
                  {column.color && (
                    <span 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: column.color }}
                    />
                  )}
                  <span className="font-medium text-gray-900 dark:text-white">
                    {column.title}
                  </span>
                </div>
                {/* Sample cards for this column */}
                <div className="space-y-2">
                  {template.cards
                    ?.filter((card: TemplateCardType) => card.template_column_id === column.id)
                    .map((card: TemplateCardType, idx: number) => (
                      <div
                        key={idx}
                        className="p-2 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300"
                      >
                        {card.title}
                      </div>
                    ))
                  }
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Labels preview */}
        {template.labels && template.labels.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Labels ({template.labels.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {template.labels.map((label) => (
                <span
                  key={label.id}
                  className="px-3 py-1 text-sm rounded-full text-white"
                  style={{ backgroundColor: label.color }}
                >
                  {label.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Category & metadata */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Category</span>
            <p className="font-medium text-gray-900 dark:text-white capitalize">
              {template.category}
            </p>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Type</span>
            <p className="font-medium text-gray-900 dark:text-white">
              {template.is_public ? 'Public Template' : 'Custom Template'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Modal Component
// ============================================================================
export function TemplateGalleryModal({
  isOpen,
  onClose,
  onSelectTemplate,
  mode = 'create',
  currentBoardId,
}: TemplateGalleryModalProps) {
  const { publicTemplates, loading: loadingSystem, getTemplateDetails } = useBoardTemplates();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateWithDetails | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<TemplateWithDetails | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  
  // Use public templates as system templates
  const systemTemplates = publicTemplates;

  // Filter templates by category
  const filteredTemplates = useMemo(() => {
    if (!selectedCategory) return systemTemplates;
    return systemTemplates.filter((t: BoardTemplate) => t.category === selectedCategory);
  }, [systemTemplates, selectedCategory]);

  // Get unique categories from templates
  const availableCategories = useMemo(() => {
    const cats = new Set(systemTemplates.map((t: BoardTemplate) => t.category));
    return TEMPLATE_CATEGORIES.filter(c => cats.has(c));
  }, [systemTemplates]);

  const handleUseTemplate = useCallback(async () => {
    if (!selectedTemplate && previewTemplate) {
      setSelectedTemplate(previewTemplate);
    }
    
    const templateToUse = previewTemplate || selectedTemplate;
    
    if (templateToUse) {
      setIsCreating(true);
      try {
        await onSelectTemplate(templateToUse);
        onClose();
      } catch (error) {
        console.error('Failed to use template:', error);
      } finally {
        setIsCreating(false);
      }
    }
  }, [selectedTemplate, previewTemplate, onSelectTemplate, onClose]);

  const handleStartBlank = useCallback(async () => {
    setIsCreating(true);
    try {
      await onSelectTemplate(null);
      onClose();
    } catch (error) {
      console.error('Failed to create blank board:', error);
    } finally {
      setIsCreating(false);
    }
  }, [onSelectTemplate, onClose]);

  // Handle preview - load template details
  const handlePreviewTemplate = useCallback(async (template: BoardTemplate) => {
    setIsLoadingPreview(true);
    try {
      const details = await getTemplateDetails(template.id);
      if (details) {
        setPreviewTemplate(details);
      }
    } finally {
      setIsLoadingPreview(false);
    }
  }, [getTemplateDetails]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-4xl h-[80vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Loading state for preview */}
        {isLoadingPreview && (
          <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 z-10 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-gray-600 dark:text-gray-400">
              {Icons.spinner}
              <span>Loading template preview...</span>
            </div>
          </div>
        )}
        
        {previewTemplate ? (
          <TemplatePreview
            template={previewTemplate}
            onBack={() => setPreviewTemplate(null)}
            onUse={handleUseTemplate}
            isLoading={isCreating}
          />
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  {mode === 'create' ? 'Create a new board' : 'Browse templates'}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Start from scratch or choose a template to get started quickly
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                {Icons.close}
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 flex overflow-hidden">
              {/* Sidebar - Categories */}
              <div className="w-48 border-r border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
                <h3 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-3">
                  Categories
                </h3>
                <nav className="space-y-1">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`
                      w-full text-left px-3 py-2 text-sm rounded-lg transition-colors
                      ${!selectedCategory
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }
                    `}
                  >
                    All templates
                  </button>
                  {availableCategories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`
                        w-full text-left px-3 py-2 text-sm rounded-lg transition-colors capitalize
                        ${selectedCategory === category
                          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }
                      `}
                    >
                      {category}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Main content - Templates grid */}
              <div className="flex-1 p-6 overflow-y-auto">
                {loadingSystem ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                      {Icons.spinner}
                      Loading templates...
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Blank board option (only in create mode) */}
                    {mode === 'create' && !selectedCategory && (
                      <div
                        className={`
                          relative p-4 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200
                          ${!selectedTemplate
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                          }
                        `}
                        onClick={() => setSelectedTemplate(null)}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-500 dark:text-gray-400">
                            {Icons.blank}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              Start from scratch
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Create a blank board with default columns
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Template cards */}
                    {filteredTemplates.map((template) => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        isSelected={selectedTemplate?.id === template.id}
                        onSelect={() => setSelectedTemplate(template as TemplateWithDetails)}
                        onPreview={() => handlePreviewTemplate(template)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            {mode === 'create' && (
              <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={selectedTemplate ? handleUseTemplate : handleStartBlank}
                  disabled={isCreating}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 
                    disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isCreating && Icons.spinner}
                  {selectedTemplate ? 'Use template' : 'Create blank board'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default TemplateGalleryModal;
