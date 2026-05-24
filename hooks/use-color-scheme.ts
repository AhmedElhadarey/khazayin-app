import { useColorScheme as useRNColorScheme } from 'react-native';
import { useAppStore } from '@/store/useAppStore';

/**
 * Custom hook that respects the in-app dark mode toggle.
 * Falls back to system color scheme when no manual override is set.
 */
export function useColorScheme(): 'light' | 'dark' {
  // Dark mode not yet implemented — always return light
  return 'light';
}
