import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Resource } from '../types';

interface AppState {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  favorites: Resource[];
  addFavorite: (resource: Resource) => void;
  removeFavorite: (id: string) => void;
  downloads: Resource[];
  addDownload: (resource: Resource) => void;
  removeDownload: (id: string) => void;
  readingProgress: Record<string, number>; // resourceId -> progress 0-100
  setReadingProgress: (id: string, progress: number) => void;
  listeningProgress: Record<string, number>; // resourceId -> progress 0-100
  setListeningProgress: (id: string, progress: number) => void;
  dailyQuranPage: number;
  setDailyQuranPage: (page: number) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      isDarkMode: false,
      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
      favorites: [],
      addFavorite: (resource) => set((state) => {
        if (!state.favorites.find((r) => r.id === resource.id)) {
          return { favorites: [...state.favorites, resource] };
        }
        return state;
      }),
      removeFavorite: (id) => set((state) => ({
        favorites: state.favorites.filter((r) => r.id !== id),
      })),
      downloads: [],
      addDownload: (resource) => set((state) => {
        if (!state.downloads.find((r) => r.id === resource.id)) {
          return { downloads: [...state.downloads, resource] };
        }
        return state;
      }),
      removeDownload: (id) => set((state) => ({
        downloads: state.downloads.filter((r) => r.id !== id),
      })),
      readingProgress: {},
      setReadingProgress: (id, progress) => set((state) => ({
        readingProgress: { ...state.readingProgress, [id]: progress },
      })),
      listeningProgress: {},
      setListeningProgress: (id, progress) => set((state) => ({
        listeningProgress: { ...state.listeningProgress, [id]: progress },
      })),
      dailyQuranPage: 1,
      setDailyQuranPage: (page) => set({ dailyQuranPage: page }),
    }),
    {
      name: 'khazayin-app-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
