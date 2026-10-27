import { logger } from '@/utils/logging';

/**
 * Tab State Deriver
 * 
 * Derives tab state (title, metadata, etc.) from URLs.
 * Centralizes the logic for resolving tab information from URL patterns.
 */

import { useTranslation } from 'react-i18next';
import { canonicalTabUrl } from './moduleDashboardUrl';
import type { Tab, URLParseResult } from './types';

// Module display names mapping
const MODULE_NAMES: Record<string, string> = {
  dashboard: 'navigation:dashboard.title',
  academics: 'navigation:academics.title',
  administration: 'navigation:administration.title',
  admissions: 'navigation:admissions.title',
  finance: 'navigation:finance.title',
  hr: 'navigation:hr.title',
  inventory: 'navigation:inventory.title',
  library: 'navigation:library.title',
  nutrition: 'navigation:nutrition.title',
  reports: 'navigation:reports.title',
  settings: 'navigation:settings.title',
  audit: 'navigation:audit.title'
};

// Entity display names mapping
const ENTITY_NAMES: Record<string, string> = {
  students: 'entities.students',
  teachers: 'entities.teachers',
  classes: 'entities.classes',
  subjects: 'entities.subjects',
  attendance: 'entities.attendance',
  exams: 'entities.exams',
  marks: 'entities.marks',
  timetable: 'entities.timetable',
  fees: 'entities.fees',
  payments: 'entities.payments',
  inventory: 'entities.inventory',
  books: 'entities.books',
  loans: 'entities.loans',
  meals: 'entities.meals',
  users: 'entities.users'
};

export class TabStateDeriver {
  private t: (key: string, options?: any) => string;

  constructor(translate: (key: string, options?: any) => string) {
    this.t = translate;
  }

  /**
   * Derive a tab from a URL
   */
  deriveTab(requestedUrl: string, options?: import('./types').TabOptions): Tab {
    // A module's dashboard is its root page; the old /module/dashboard spelling lands on the same tab.
    const url = canonicalTabUrl(requestedUrl);
    const parsed = this.parseURL(url);
    const { module, entity, entityId, view } = parsed;

    // Generate deterministic ID based on content
    const id = this.generateTabId(module, entity, entityId);

    // Resolve title
    let title = options?.title || this.resolveTitle(module, entity, entityId, view);
    
    // Clean up translation keys from title if they leak through. i18next returns
    // the raw key (never throws) when a key is missing, so guard against every
    // known key namespace bleeding into a tab title.
    if (title.startsWith('navigation:')) {
      title = this.capitalize(title.replace('navigation:', '').split('.')[1] || title);
    } else if (title.startsWith('entities.')) {
      title = this.capitalize(title.replace('entities.', ''));
    } else if (title.startsWith('tabs.')) {
      title = this.capitalize(title.replace('tabs.', ''));
    }

    // Resolve subtitle if viewing specific entity
    const subtitle = entityId ? this.resolveSubtitle(module, entity, entityId) : undefined;

    // Determine if should be pinned
    const pinned = options?.pinned ?? (module === 'dashboard');

    // Resolve icon based on module
    const icon = options?.icon || this.resolveIcon(module, entity);

    return {
      id,
      url,
      title,
      subtitle,
      module,
      entity,
      entityId,
      view,
      isDirty: false,
      pinned,
      icon,
      metadata: {
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        ...options?.metadata
      }
    };
  }

  /**
   * Derive multiple tabs from URLs
   */
  deriveTabs(urls: string[]): Tab[] {
    return urls.map(url => this.deriveTab(url));
  }

  /**
   * Update existing tab with new URL (preserving metadata)
   */
  updateTabUrl(tab: Tab, newUrl: string): Tab {
    const newTab = this.deriveTab(newUrl, {
      title: tab.title,
      pinned: tab.pinned
    });

    // Preserve metadata
    return {
      ...newTab,
      id: tab.id, // Keep same ID
      isDirty: tab.isDirty,
      metadata: {
        createdAt: tab.metadata?.createdAt || newTab.metadata?.createdAt || Date.now(),
        ...(tab.metadata || {}),
        ...(newTab.metadata || {}),
        lastAccessed: Date.now()
      }
    };
  }

  /**
   * Generate a deterministic tab ID — no Date.now() for list/dashboard so reload
   * restores same ID and dedup via isSameEntity works.
   */
  generateTabId(module: string, entity?: string, entityId?: string): string {
    if (entityId) {
      return `tab-${module}-${entity}-${entityId}`;
    }
    if (entity) {
      return `tab-${module}-${entity}-list`;
    }
    return `tab-${module}-dashboard`;
  }

  /**
   * Parse a URL into structured components
   */
  parseURL(url: string): URLParseResult {
    try {
      const urlObj = new URL(canonicalTabUrl(url), window.location.origin);
      const pathname = urlObj.pathname;
      const parts = pathname.split('/').filter(Boolean);

      const module = parts[0] || 'dashboard';
      const entity = parts[1];
      const entityId = parts[2];
      const view = urlObj.searchParams.get('view') || 
                   (entityId ? 'detail' : entity ? 'list' : 'dashboard');

      return {
        pathname,
        module,
        entity,
        entityId,
        view,
        params: urlObj.searchParams
      };
    } catch (error) {
      logger.error('Error parsing URL:', url, error);
      return {
        pathname: '/dashboard',
        module: 'dashboard',
        params: new URLSearchParams()
      };
    }
  }

  /**
   * Check if two URLs refer to the same entity — for list views also checks
   * search params so `/students?page=1` vs `?page=2` are considered distinct.
   */
  isSameEntity(url1: string, url2: string): boolean {
    const p1 = this.parseURL(url1);
    const p2 = this.parseURL(url2);
    const sameBase = p1.module === p2.module && p1.entity === p2.entity && p1.entityId === p2.entityId;
    if (!sameBase) return false;
    // For list views (no entityId), differentiate by query string
    if (!p1.entityId && !p2.entityId) {
      try {
        const u1 = new URL(url1, window.location.origin);
        const u2 = new URL(url2, window.location.origin);
        return u1.search === u2.search;
      } catch { return true; }
    }
    return true;
  }

  /**
   * Get a display title for a URL
   */
  getURLTitle(url: string): string {
    const parsed = this.parseURL(url);
    return this.resolveTitle(parsed.module, parsed.entity, parsed.entityId, parsed.view);
  }

  private resolveTitle(
    module: string, 
    entity?: string, 
    entityId?: string, 
    view?: string
  ): string {
    // Try to use i18n translation
    try {
      if (entityId) {
        // Viewing specific entity
        const entityName = this.getEntityName(entity);
        if (view === 'edit') {
          return this.t('tabs.editEntity', { entity: entityName });
        }
        return this.t('tabs.viewEntity', { entity: entityName });
      }

      if (entity) {
        // List view
        return this.getEntityName(entity);
      }

      // Module dashboard
      return this.getModuleName(module);
    } catch {
      // Fallback to simple formatting
      return this.fallbackTitle(module, entity, view);
    }
  }

  private resolveSubtitle(module: string, entity?: string, entityId?: string): string | undefined {
    // Could fetch entity name from store/cache here
    // For now, return the ID as subtitle
    if (entityId) {
      return `#${entityId}`;
    }
    return undefined;
  }

  private resolveIcon(module: string, entity?: string): string {
    if (entity) {
      const entityIconMap: Record<string, string> = {
        'dashboard': 'BarChart3',
        'applications': 'ClipboardList',
        'new-application': 'Plus',
        'review-queue': 'Eye',
        'interviews': 'Users',
        'students': 'Users',
        'teachers': 'Users',
        'classes': 'GraduationCap',
        'subjects': 'BookOpen',
        'attendance': 'CheckCircle',
        'exams': 'FileText',
        'fees': 'DollarSign',
        'payments': 'CreditCard',
        'inventory': 'Archive',
        'books': 'BookOpen',
        'meals': 'CakeSlice',
        'users': 'Users',
        'settings': 'Settings',
      };
      
      if (entityIconMap[entity]) {
        return entityIconMap[entity];
      }
    }

    const iconMap: Record<string, string> = {
      dashboard: 'Home',
      academics: 'GraduationCap',
      administration: 'Users',
      admissions: 'GraduationCap',
      finance: 'DollarSign',
      hr: 'Briefcase',
      inventory: 'Archive',
      library: 'BookOpen',
      nutrition: 'CakeSlice',
      reports: 'BarChart3',
      settings: 'Settings',
      audit: 'ShieldCheck'
    };

    return iconMap[module] || 'FileText';
  }

  private getModuleName(module: string): string {
    const key = MODULE_NAMES[module];
    if (key) {
      const translated = this.t(key);
      // i18next returns the raw key on a miss instead of throwing, so treat an
      // unresolved key as "not translated" and fall back to a clean label.
      if (translated && translated !== key) {
        return translated;
      }
    }
    return this.capitalize(module);
  }

  private getEntityName(entity?: string): string {
    if (!entity) return '';

    const key = ENTITY_NAMES[entity];
    if (key) {
      const translated = this.t(key);
      // i18next returns the raw key on a miss instead of throwing, so treat an
      // unresolved key as "not translated" and fall back to a clean label.
      if (translated && translated !== key) {
        return translated;
      }
    }
    return this.capitalize(entity);
  }

  private fallbackTitle(module: string, entity?: string, view?: string): string {
    const parts: string[] = [];
    
    parts.push(this.capitalize(module));
    
    if (entity) {
      parts.push(this.capitalize(entity));
    }
    
    if (view && view !== 'list' && view !== 'detail') {
      parts.push(this.capitalize(view));
    }
    
    return parts.join(' - ');
  }

  private capitalize(str: string): string {
    if (!str) return '';
    return str
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
}

// React hook for convenience
export function useTabStateDeriver(): TabStateDeriver {
  const { t } = useTranslation();
  return new TabStateDeriver(t);
}
