import { runQiraatRedirect } from '@/services/reciterNavigation';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

// Legacy route, kept for deep links (`khazayinapp://sections/qiraat`) and the
// capture harness. The qiraat list is now a root-level bottom sheet
// (app/qiraat-sheet.tsx). This screen swaps itself for the reciter screen on
// the Qiraa tab, then pushes the sheet over it, so a cold link lands on a
// sheet over the reciter list instead of an empty stack.
//
// Known limitation: a warm link while the reciter screen is already open
// leaves two reciter entries in the sections stack (the replace swaps this
// screen for a second reciter), so back from the first sheet close lands on a
// duplicate reciter screen. Cold links are unaffected.
export default function QiraatRedirect() {
  const router = useRouter();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    runQiraatRedirect({
      replace: (href) => router.replace(href as any),
      push: (href) => router.push(href as any),
    });
  }, [router]);

  return null;
}
