/**
 * AgriMonitor Design Theme & Color Palette
 * Deep modern dark-mode tailored for agricultural IoT metrics
 */

export const THEME = {
  colors: {
    background: '#0B1120',
    surface: '#1E293B',
    surfaceLight: '#334155',
    card: '#162032',
    border: '#334155',
    
    // Brand / Primary
    primary: '#10B981',        // Emerald green
    primaryLight: '#34D399',
    primaryDark: '#059669',
    
    // Status / Severity
    optimal: '#10B981',        // Green
    optimalBg: 'rgba(16, 185, 129, 0.15)',
    moderate: '#38BDF8',       // Sky blue
    moderateBg: 'rgba(56, 189, 248, 0.15)',
    warning: '#F59E0B',        // Amber
    warningBg: 'rgba(245, 158, 11, 0.15)',
    critical: '#EF4444',       // Crimson red
    criticalBg: 'rgba(239, 68, 68, 0.15)',
    
    // Text
    textPrimary: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    
    // Accent
    soil: '#D97706',           // Warm amber brown
    water: '#0EA5E9',          // Aqua blue
    temperature: '#F97316',    // Bright orange
    tds: '#A855F7',            // Purple
    ph: '#EC4899',             // Pink
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },
  borderRadius: {
    sm: 6,
    md: 10,
    lg: 14,
    xl: 18,
    full: 9999,
  }
};
