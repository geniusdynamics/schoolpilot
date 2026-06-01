// ABOUTME: Shared color-scheme and module-id helpers used by the secondary sidebar
// ABOUTME: (and now the workspace switcher popup). Centralised so the popup can mirror
// ABOUTME: the secondary sidebar's glassmorphic look in fullwidth mode.

export interface ModuleStyle {
  /** Tailwind background utility (usually a glassmorphic gradient) */
  background: string;
  /** Tailwind border utility */
  border: string;
  /** Tailwind text utility for accents (icons, headings) */
  accent: string;
  /** Tailwind hover background utility */
  hover: string;
  /** Tailwind utility for the currently-active link */
  activeLink: string;
  /** Tailwind utility for hover state of a regular link */
  hoverLink: string;
}

const DEFAULT_MODULE_STYLE: ModuleStyle = {
  background: 'bg-gradient-to-br from-gray-500/10 via-gray-400/8 to-gray-600/12',
  border: 'border-gray-400/20',
  accent: 'text-gray-600',
  hover: 'hover:bg-gray-500/15',
  activeLink: 'border-gray-400 text-gray-600 bg-gray-50/80',
  hoverLink: 'hover:bg-gray-100/60 hover:text-gray-800',
};

const MODULE_COLOR_SCHEMES: Record<string, ModuleStyle> = {
  dashboard: {
    background: 'bg-gradient-to-br from-blue-500/10 via-blue-400/8 to-blue-600/12',
    border: 'border-blue-400/20',
    accent: 'text-blue-600',
    hover: 'hover:bg-blue-500/15',
    activeLink: 'border-blue-400 text-blue-600 bg-blue-50/80',
    hoverLink: 'hover:bg-blue-100/60 hover:text-blue-800',
  },
  administration: {
    background: 'bg-gradient-to-br from-purple-500/10 via-purple-400/8 to-purple-600/12',
    border: 'border-purple-400/20',
    accent: 'text-purple-600',
    hover: 'hover:bg-purple-500/15',
    activeLink: 'border-purple-400 text-purple-600 bg-purple-50/80',
    hoverLink: 'hover:bg-purple-100/60 hover:text-purple-800',
  },
  academics: {
    background: 'bg-gradient-to-br from-green-500/10 via-green-400/8 to-green-600/12',
    border: 'border-green-400/20',
    accent: 'text-green-600',
    hover: 'hover:bg-green-500/15',
    activeLink: 'border-green-400 text-green-600 bg-green-50/80',
    hoverLink: 'hover:bg-green-100/60 hover:text-green-800',
  },
  finance: {
    background: 'bg-gradient-to-br from-yellow-500/10 via-yellow-400/8 to-yellow-600/12',
    border: 'border-yellow-400/20',
    accent: 'text-yellow-600',
    hover: 'hover:bg-yellow-500/15',
    activeLink: 'border-yellow-400 text-yellow-600 bg-yellow-50/80',
    hoverLink: 'hover:bg-yellow-100/60 hover:text-yellow-800',
  },
  hr: {
    background: 'bg-gradient-to-br from-red-500/10 via-red-400/8 to-red-600/12',
    border: 'border-red-400/20',
    accent: 'text-red-600',
    hover: 'hover:bg-red-500/15',
    activeLink: 'border-red-400 text-red-600 bg-red-50/80',
    hoverLink: 'hover:bg-red-100/60 hover:text-red-800',
  },
  inventory: {
    background: 'bg-gradient-to-br from-orange-500/10 via-orange-400/8 to-orange-600/12',
    border: 'border-orange-400/20',
    accent: 'text-orange-600',
    hover: 'hover:bg-orange-500/15',
    activeLink: 'border-orange-400 text-orange-600 bg-orange-50/80',
    hoverLink: 'hover:bg-orange-100/60 hover:text-orange-800',
  },
  library: {
    background: 'bg-gradient-to-br from-indigo-500/10 via-indigo-400/8 to-indigo-600/12',
    border: 'border-indigo-400/20',
    accent: 'text-indigo-600',
    hover: 'hover:bg-indigo-500/15',
    activeLink: 'border-indigo-400 text-indigo-600 bg-indigo-50/80',
    hoverLink: 'hover:bg-indigo-100/60 hover:text-indigo-800',
  },
  reports: {
    background: 'bg-gradient-to-br from-teal-500/10 via-teal-400/8 to-teal-600/12',
    border: 'border-teal-400/20',
    accent: 'text-teal-600',
    hover: 'hover:bg-teal-500/15',
    activeLink: 'border-teal-400 text-teal-600 bg-teal-50/80',
    hoverLink: 'hover:bg-teal-100/60 hover:text-teal-800',
  },
  audit: {
    background: 'bg-gradient-to-br from-pink-500/10 via-pink-400/8 to-pink-600/12',
    border: 'border-pink-400/20',
    accent: 'text-pink-600',
    hover: 'hover:bg-pink-500/15',
    activeLink: 'border-pink-400 text-pink-600 bg-pink-50/80',
    hoverLink: 'hover:bg-pink-100/60 hover:text-pink-800',
  },
  nutrition: {
    background: 'bg-gradient-to-br from-lime-500/10 via-lime-400/8 to-lime-600/12',
    border: 'border-lime-400/20',
    accent: 'text-lime-600',
    hover: 'hover:bg-lime-500/15',
    activeLink: 'border-lime-400 text-lime-600 bg-lime-50/80',
    hoverLink: 'hover:bg-lime-100/60 hover:text-lime-800',
  },
  admissions: {
    background: 'bg-gradient-to-br from-cyan-500/10 via-cyan-400/8 to-cyan-600/12',
    border: 'border-cyan-400/20',
    accent: 'text-cyan-600',
    hover: 'hover:bg-cyan-500/15',
    activeLink: 'border-cyan-400 text-cyan-600 bg-cyan-50/80',
    hoverLink: 'hover:bg-cyan-100/60 hover:text-cyan-800',
  },
  settings: DEFAULT_MODULE_STYLE,
};

/**
 * Get the color-scheme tokens for a module.
 * Falls back to the `settings` scheme for unknown keys.
 */
export const getModuleStyle = (moduleKey: string): ModuleStyle => {
  if (!moduleKey) return DEFAULT_MODULE_STYLE;
  return MODULE_COLOR_SCHEMES[moduleKey] ?? DEFAULT_MODULE_STYLE;
};

/**
 * Normalise a module identifier into its short id.
 * Handles:
 *   - navigation:administration.title -> administration
 *   - /administration -> administration
 *   - administration -> administration
 */
export const normalizeModuleId = (value?: string | null): string => {
  if (!value) return '';
  let clean = value;
  if (clean.startsWith('/')) {
    clean = clean.replace(/^\/+/, '').split('/')[0] ?? '';
  } else {
    clean = clean
      .replace('navigation:', '')
      .replace('module:', '')
      .replace('.title', '')
      .split('.')[0] ?? '';
  }
  return clean;
};

export default {
  getModuleStyle,
  normalizeModuleId,
};
