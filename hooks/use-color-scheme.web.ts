import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { useAppStore } from '@/store/useAppStore';

/**
 * Web version: waits for hydration, then respects in-app dark mode toggle.
 */
export function useColorScheme(): 'light' | 'dark' {
  // Dark mode not yet implemented — always return light
  return 'light';
}
