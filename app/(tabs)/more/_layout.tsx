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
      <Stack.Screen name="community/index" />
      <Stack.Screen name="community/guidelines" />
      <Stack.Screen name="community/create" />
      <Stack.Screen name="community/join" />
      <Stack.Screen name="community/group/[id]" />
    </Stack>
  );
}
