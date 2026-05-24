import { Stack } from 'expo-router';
import React from 'react';

// Sections tab stack — holds the list and its 5 sub-screens.
export default function SectionsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_left' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="reciter" />
      <Stack.Screen name="mushaf" />
      <Stack.Screen name="qiraat" />
      <Stack.Screen name="scholar" />
      <Stack.Screen name="scholar/[id]" />
      <Stack.Screen name="dawah" />
      <Stack.Screen name="dawah/[month]" />
      <Stack.Screen name="prophet" />
      <Stack.Screen name="queen" />
      <Stack.Screen name="books" />
      <Stack.Screen name="radio" />
    </Stack>
  );
}
