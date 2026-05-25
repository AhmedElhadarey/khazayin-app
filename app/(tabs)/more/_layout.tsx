import { Stack } from 'expo-router';
import React from 'react';

export default function MoreLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_left' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="contact" />
      <Stack.Screen name="about" />
      <Stack.Screen name="archive" />
      <Stack.Screen name="settings-progress" />
    </Stack>
  );
}
