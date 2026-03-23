import { useColorScheme as useRNColorScheme } from 'react-native';
import { useAppStore } from '@/store/useAppStore';

/**
 * Custom hook that respects the in-app dark mode toggle.
 * Falls back to system color scheme when no manual override is set.
 */
export function useColorScheme(): 'light' | 'dark' {
  const systemScheme = useRNColorScheme();
  const isDarkMode = useAppStore((state) => state.isDarkMode);

  // In-app toggle takes precedence over system setting
  return isDarkMode ? 'dark' : (systemScheme ?? 'light');
}
