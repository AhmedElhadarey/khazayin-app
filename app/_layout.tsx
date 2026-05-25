import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { I18nManager, LogBox, Platform } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useBackgroundRefresh } from '@/hooks/useBackgroundRefresh';
import { ToastOverlay } from '@/components/khazain';
import { useProgressStore } from '@/store/progressStore';
import { useWirdStore } from '@/store/wirdStore';
import { bootstrapNotificationHandler } from '@/services/notificationScheduler';
import { registerCacheRoot } from '@/services/cacheFacade';
import 'react-native-reanimated';

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);
LogBox.ignoreLogs(['Require cycle:']);

// Register the image-cache root with the cacheFacade so the Settings "Clear
// Cache" action knows what to clear. Idempotent (deduped by id).
registerCacheRoot({
  id: 'expo-image',
  kind: 'image',
  clear: async () => {
    ExpoImage.clearMemoryCache();
    await ExpoImage.clearDiskCache();
    return 0;
  },
});

SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore — splash may already have been hidden in dev reloads.
});



export const unstable_settings = {
  anchor: '(tabs)',
};

const KhazayinLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.light.primary,
    background: Colors.light.background,
    card: Colors.light.surface,
    text: Colors.light.text,
    border: Colors.light.border,
    notification: Colors.light.secondary,
  },
};

const KhazayinDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.dark.primary,
    background: Colors.dark.background,
    card: Colors.dark.surface,
    text: Colors.dark.text,
    border: Colors.dark.border,
    notification: Colors.dark.secondary,
  },
};

function useOnboardingRedirect() {
  const [isReady, setIsReady] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    AsyncStorage.getItem('has_seen_onboarding').then((value) => {
      setNeedsOnboarding(value !== 'true');
      setIsReady(true);
    });
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const inOnboarding = segments[0] === 'onboarding';

    if (needsOnboarding && !inOnboarding) {
      router.replace('/onboarding');
    }
  }, [isReady, needsOnboarding, segments]);
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  useOnboardingRedirect();
  useBackgroundRefresh();

  const [fontsLoaded, fontError] = useFonts({
    Amiri: require('../assets/fonts/Amiri-Regular.ttf'),
    'Amiri-Bold': require('../assets/fonts/Amiri-Bold.ttf'),
    NotoSansArabic: require('../assets/fonts/NotoSansArabic-VF.ttf'),
    NotoNaskhArabic: require('../assets/fonts/NotoNaskhArabic-VF.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded, fontError]);

  // Progress-tracking hydration. Failures fall back to zero values so the
  // Library tab never crashes if the DB layer mis-initializes.
  useEffect(() => {
    if (!fontsLoaded) return;
    bootstrapNotificationHandler();
    Promise.all([
      useProgressStore.getState().hydrate(),
      useWirdStore.getState().hydrate(),
    ]).catch((err) => {
      console.warn('[khazayin] progress hydration failed', err);
    });
  }, [fontsLoaded]);

  // Env preflight — warn once at root mount if the API base URL is not
  // configured. The app will run on mockAdapter silently; this log reminds
  // developers to set EXPO_PUBLIC_API_BASE in .env.local when testing HTTP mode.
  useEffect(() => {
    if (!process.env.EXPO_PUBLIC_API_BASE) {
      console.warn(
        '[khazayin] EXPO_PUBLIC_API_BASE not set — running on mockAdapter. Set the env var to activate HTTP mode.',
      );
    }
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? KhazayinDarkTheme : KhazayinLightTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor:
              colorScheme === 'dark'
                ? Colors.dark.background
                : Colors.light.background,
          },
          animation: Platform.OS === 'android' ? 'slide_from_right' : 'default',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen
          name="resource/[id]"
          options={{
            headerShown: false,
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="category/[id]"
          options={{
            headerShown: false,
            presentation: 'card',
          }}
        />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen
          name="contact"
          options={{
            headerShown: false,
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="about"
          options={{
            headerShown: false,
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="note-editor"
          options={{
            headerShown: false,
            presentation: 'transparentModal',
            animation: 'fade',
          }}
        />
        <Stack.Screen
          name="notes-viewer"
          options={{
            headerShown: false,
            presentation: 'transparentModal',
            animation: 'fade',
          }}
        />
        <Stack.Screen
          name="telegram-sheet"
          options={{
            headerShown: false,
            presentation: 'transparentModal',
            animation: 'fade',
          }}
        />
        <Stack.Screen
          name="youtube-sheet"
          options={{
            headerShown: false,
            presentation: 'transparentModal',
            animation: 'fade',
          }}
        />
        <Stack.Screen
          name="share-sheet"
          options={{
            headerShown: false,
            presentation: 'transparentModal',
            animation: 'fade',
          }}
        />
        <Stack.Screen
          name="search"
          options={{
            headerShown: false,
            presentation: 'modal',
            animation: Platform.OS === 'android' ? 'slide_from_left' : 'default',
          }}
        />
        <Stack.Screen
          name="settings-qiraa"
          options={{
            headerShown: false,
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="settings-reciter"
          options={{
            headerShown: false,
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="settings-font-size"
          options={{
            headerShown: false,
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
      </Stack>
      <ToastOverlay />
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
