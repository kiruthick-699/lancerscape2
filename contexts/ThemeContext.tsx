import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  themeMode: 'light' | 'dark' | 'system';
  colors: ThemeColors;
  isHighContrast: boolean;
  toggleHighContrast: () => void;
  fontSize: 'small' | 'medium' | 'large';
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
  spacing: 'compact' | 'comfortable' | 'spacious';
  setSpacing: (spacing: 'compact' | 'comfortable' | 'spacious') => void;
}

interface ThemeColors {
  // Core colors
  background: string;
  surface: string;
  surfaceVariant: string;
  primary: string;
  primaryVariant: string;
  secondary: string;
  secondaryVariant: string;
  
  // Text colors
  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  
  // Semantic colors
  success: string;
  successVariant: string;
  warning: string;
  warningVariant: string;
  error: string;
  errorVariant: string;
  info: string;
  infoVariant: string;
  
  // UI colors
  border: string;
  borderVariant: string;
  divider: string;
  overlay: string;
  shadow: string;
  
  // Accessibility colors
  focus: string;
  selection: string;
  highlight: string;
}

interface ThemeSettings {
  mode: 'light' | 'dark' | 'system';
  highContrast: boolean;
  fontSize: 'small' | 'medium' | 'large';
  spacing: 'compact' | 'comfortable' | 'spacious';
}

// WCAG 2.1 AA compliant color schemes
const lightColors: ThemeColors = {
  // Core colors
  background: '#FFFFFF',
  surface: '#F8FAFC',
  surfaceVariant: '#F1F5F9',
  primary: '#2563EB',
  primaryVariant: '#1D4ED8',
  secondary: '#64748B',
  secondaryVariant: '#475569',
  
  // Text colors (ensuring 4.5:1 contrast ratio)
  text: '#0F172A',
  textSecondary: '#334155',
  textTertiary: '#64748B',
  textInverse: '#FFFFFF',
  
  // Semantic colors
  success: '#059669',
  successVariant: '#047857',
  warning: '#D97706',
  warningVariant: '#B45309',
  error: '#DC2626',
  errorVariant: '#B91C1C',
  info: '#0891B2',
  infoVariant: '#0E7490',
  
  // UI colors
  border: '#E2E8F0',
  borderVariant: '#CBD5E1',
  divider: '#F1F5F9',
  overlay: 'rgba(0, 0, 0, 0.5)',
  shadow: 'rgba(0, 0, 0, 0.1)',
  
  // Accessibility colors
  focus: '#3B82F6',
  selection: '#DBEAFE',
  highlight: '#FEF3C7',
};

const darkColors: ThemeColors = {
  // Core colors
  background: '#0F172A',
  surface: '#1E293B',
  surfaceVariant: '#334155',
  primary: '#3B82F6',
  primaryVariant: '#60A5FA',
  secondary: '#94A3B8',
  secondaryVariant: '#CBD5E1',
  
  // Text colors (ensuring 4.5:1 contrast ratio)
  text: '#F8FAFC',
  textSecondary: '#E2E8F0',
  textTertiary: '#CBD5E1',
  textInverse: '#0F172A',
  
  // Semantic colors
  success: '#10B981',
  successVariant: '#34D399',
  warning: '#F59E0B',
  warningVariant: '#FBBF24',
  error: '#EF4444',
  errorVariant: '#F87171',
  info: '#06B6D4',
  infoVariant: '#22D3EE',
  
  // UI colors
  border: '#334155',
  borderVariant: '#475569',
  divider: '#1E293B',
  overlay: 'rgba(0, 0, 0, 0.7)',
  shadow: 'rgba(0, 0, 0, 0.3)',
  
  // Accessibility colors
  focus: '#60A5FA',
  selection: '#1E40AF',
  highlight: '#92400E',
};

// High contrast variants for better accessibility
const lightHighContrastColors: ThemeColors = {
  ...lightColors,
  text: '#000000',
  textSecondary: '#1A1A1A',
  textTertiary: '#333333',
  border: '#000000',
  borderVariant: '#1A1A1A',
  primary: '#0000CC',
  primaryVariant: '#000099',
  success: '#006600',
  warning: '#CC6600',
  error: '#CC0000',
};

const darkHighContrastColors: ThemeColors = {
  ...darkColors,
  text: '#FFFFFF',
  textSecondary: '#E6E6E6',
  textTertiary: '#CCCCCC',
  border: '#FFFFFF',
  borderVariant: '#E6E6E6',
  primary: '#66B3FF',
  primaryVariant: '#99CCFF',
  success: '#66FF66',
  warning: '#FFCC66',
  error: '#FF6666',
};

// Font size configurations
const fontSizeConfigs = {
  small: {
    base: 14,
    h1: 24,
    h2: 20,
    h3: 18,
    h4: 16,
    body: 14,
    caption: 12,
    button: 14,
  },
  medium: {
    base: 16,
    h1: 28,
    h2: 24,
    h3: 20,
    h4: 18,
    body: 16,
    caption: 14,
    button: 16,
  },
  large: {
    base: 18,
    h1: 32,
    h2: 28,
    h3: 24,
    h4: 20,
    body: 18,
    caption: 16,
    button: 18,
  },
};

// Spacing configurations
const spacingConfigs = {
  compact: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },
  comfortable: {
    xs: 6,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
  },
  spacious: {
    xs: 8,
    sm: 16,
    md: 24,
    lg: 32,
    xl: 40,
    xxl: 48,
  },
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeSettings, setThemeSettings] = useState<ThemeSettings>({
    mode: 'system',
    highContrast: false,
    fontSize: 'medium',
    spacing: 'comfortable',
  });

  // Memoized theme calculation
  const currentTheme = useMemo(() => {
    if (themeSettings.mode === 'system') {
      return systemColorScheme || 'light';
    }
    return themeSettings.mode;
  }, [themeSettings.mode, systemColorScheme]);

  const isDarkMode = currentTheme === 'dark';

  // Memoized colors calculation
  const colors = useMemo(() => {
    let baseColors: ThemeColors;
    
    if (isDarkMode) {
      baseColors = themeSettings.highContrast ? darkHighContrastColors : darkColors;
    } else {
      baseColors = themeSettings.highContrast ? lightHighContrastColors : lightColors;
    }
    
    return baseColors;
  }, [isDarkMode, themeSettings.highContrast]);

  // Memoized font sizes
  const fontSize = useMemo(() => fontSizeConfigs[themeSettings.fontSize], [themeSettings.fontSize]);

  // Memoized spacing
  const spacing = useMemo(() => spacingConfigs[themeSettings.spacing], [themeSettings.spacing]);

  useEffect(() => {
    loadThemeSettings();
  }, []);

  const loadThemeSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('themeSettings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setThemeSettings(prev => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      console.warn('Failed to load theme settings:', error);
    }
  };

  const saveThemeSettings = useCallback(async (newSettings: Partial<ThemeSettings>) => {
    try {
      const updatedSettings = { ...themeSettings, ...newSettings };
      setThemeSettings(updatedSettings);
      await AsyncStorage.setItem('themeSettings', JSON.stringify(updatedSettings));
    } catch (error) {
      console.warn('Failed to save theme settings:', error);
    }
  }, [themeSettings]);

  const toggleTheme = useCallback(() => {
    const newMode = themeSettings.mode === 'light' ? 'dark' : 'light';
    saveThemeSettings({ mode: newMode });
  }, [themeSettings.mode, saveThemeSettings]);

  const setTheme = useCallback((mode: 'light' | 'dark' | 'system') => {
    saveThemeSettings({ mode });
  }, [saveThemeSettings]);

  const toggleHighContrast = useCallback(() => {
    saveThemeSettings({ highContrast: !themeSettings.highContrast });
  }, [themeSettings.highContrast, saveThemeSettings]);

  const setFontSize = useCallback((size: 'small' | 'medium' | 'large') => {
    saveThemeSettings({ fontSize: size });
  }, [saveThemeSettings]);

  const setSpacing = useCallback((newSpacing: 'compact' | 'comfortable' | 'spacious') => {
    saveThemeSettings({ spacing: newSpacing });
  }, [saveThemeSettings]);

  // Context value memoization
  const contextValue = useMemo(() => ({
    isDarkMode,
    toggleTheme,
    setTheme,
    themeMode: themeSettings.mode,
    colors,
    isHighContrast: themeSettings.highContrast,
    toggleHighContrast,
    fontSize,
    setFontSize,
    spacing,
    setSpacing,
  }), [
    isDarkMode,
    toggleTheme,
    setTheme,
    themeSettings.mode,
    colors,
    themeSettings.highContrast,
    toggleHighContrast,
    fontSize,
    setFontSize,
    spacing,
    setSpacing,
  ]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Export font size and spacing configs for use in components
export { fontSizeConfigs, spacingConfigs };