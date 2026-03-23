import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { useAppStore } from '@/store/useAppStore';

/**
 * Web version: waits for hydration, then respects in-app dark mode toggle.
 */
export function useColorScheme(): 'light' | 'dark' {
  const [hasHydrated, setHasHydrated] = useState(false);
  const systemScheme = useRNColorScheme();
  const isDarkMode = useAppStore((state) => state.isDarkMode);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  if (!hasHydrated) {
    return 'light';
  }

  return isDarkMode ? 'dark' : (systemScheme ?? 'light');
}
