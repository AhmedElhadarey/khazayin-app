import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  I18nManager,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  ChannelsStep,
  OnboardingFooter,
  OnboardingProgress,
  QiraaStep,
  ReciterStep,
  WelcomeStep,
} from '@/components/khazain/onboarding';
import { ONBOARDING_STEP_COUNT, ONBOARDING_STEPS } from '@/constants/settings';
import { KhazainColors } from '@/constants/theme';
import { stopPreview } from '@/services/reciterPreview';
import { useSettingsStore } from '@/store';

const SLIDE_OFFSET = 40;
const SLIDE_DURATION = 280;

export default function OnboardingScreen(): React.ReactElement {
  const router = useRouter();
  const setOnboardingStep = useSettingsStore((s) => s.setOnboardingStep);
  const setOnboardingComplete = useSettingsStore((s) => s.setOnboardingComplete);

  // Resume at the last reached step (read once on mount).
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<number>(() => useSettingsStore.getState().onboardingStep);
  const directionRef = useRef<number>(1);

  const anim = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Animate a slide+fade whenever the step changes (instant when reduce-motion).
  //
  // `anim` rests at 0, which IS the visible state, and the mount does not
  // animate at all. That ordering is load-bearing: this screen is the first
  // thing a fresh install shows, and `forceRTL` flips the layout direction on
  // that first launch, which recreates the activity. A transition running at
  // that moment does not get stopped — it silently stops progressing, so
  // neither the completion callback nor the effect cleanup ever runs, and
  // whatever value it had reached is where it stays. Revealing content with a
  // mount animation therefore stranded the whole step area at partial opacity
  // (measured 0.57-0.61 across rebuilds, against a footer that was outside the
  // animated view and rendered at a clean navy800). Only a real step change
  // animates, and a watchdog settles the value if that run dies too.
  const lastStep = useRef<number | null>(null);
  useEffect(() => {
    const stepChanged = lastStep.current !== null && lastStep.current !== step;
    lastStep.current = step;

    if (!stepChanged || reduceMotion) {
      anim.setValue(0);
      return;
    }
    anim.setValue(1);
    const animation = Animated.timing(anim, {
      toValue: 0,
      duration: SLIDE_DURATION,
      // NOT the native driver, deliberately. `forceRTL` flips the layout
      // direction on the very first launch after install, which recreates the
      // activity. A native-driven value lives outside the shadow tree, so the
      // remounted view came back with the last style JS had rendered —
      // `setValue(1)`, i.e. opacity 0 — and the animation had already finished,
      // so no later frame ever corrected it. Step 0 rendered blank on every
      // fresh install (content mounted, `uiautomator dump` found the text;
      // it was simply invisible). A JS-driven value goes through the shadow
      // tree, so a remount picks up the settled value. 280ms on four steps.
      useNativeDriver: false,
    });
    // Settle to fully-visible whenever the run does not finish. The step area
    // is revealed BY this animation, so an interrupted run leaves real content
    // parked at partial opacity with nothing scheduled to correct it — the
    // first launch after install stopped it at 0.39 (measured: the emblem came
    // back 111,140,165 against a navy800 of 24,75,118) because `forceRTL`
    // recreates the activity mid-flight. Failing open costs a dropped fade;
    // failing closed costs the whole screen.
    animation.start(({ finished }) => {
      if (!finished) anim.setValue(0);
    });
    // The driver can stop producing frames without ever reporting completion,
    // in which case the callback above never fires. This is the only thing
    // that guarantees the content ends up visible.
    const watchdog = setTimeout(() => anim.setValue(0), SLIDE_DURATION + 200);
    return () => {
      clearTimeout(watchdog);
      animation.stop();
      anim.setValue(0);
    };
  }, [step, reduceMotion, anim]);

  const goTo = (next: number): void => {
    void stopPreview();
    const clamped = Math.max(0, Math.min(ONBOARDING_STEP_COUNT - 1, next));
    directionRef.current = clamped > step ? 1 : -1;
    setStep(clamped);
    setOnboardingStep(clamped);
  };

  const finish = (): void => {
    void stopPreview();
    setOnboardingComplete(true);
    router.replace('/(tabs)');
  };

  const onNext = (): void => {
    if (step >= ONBOARDING_STEP_COUNT - 1) {
      finish();
    } else {
      goTo(step + 1);
    }
  };

  const onBack = (): void => {
    if (step > 0) goTo(step - 1);
  };

  const onSkip = (): void => {
    finish();
  };

  const rtlSign = I18nManager.isRTL ? -1 : 1;
  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SLIDE_OFFSET * directionRef.current * rtlSign],
  });
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  return (
    // The inset hook, not the native SafeAreaView: a first run slides this screen up
    // from below the screen, and the native view reads its insets from where it
    // sits, so it would jump as it landed (launch design R6).
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.progressWrap}>
        <OnboardingProgress count={ONBOARDING_STEP_COUNT} index={step} />
      </View>

      <Animated.View style={[styles.stepArea, { opacity, transform: [{ translateX }] }]}>
        {renderStep(step)}
      </Animated.View>

      <View style={styles.footerWrap}>
        <OnboardingFooter
          step={step}
          count={ONBOARDING_STEP_COUNT}
          onBack={onBack}
          onNext={onNext}
          onSkip={onSkip}
        />
      </View>
    </View>
  );
}

/** Step content: welcome → qira'a → reciter → channels (ONBOARDING_STEPS). `step` is always clamped. */
function renderStep(step: number): React.ReactElement {
  switch (ONBOARDING_STEPS[step]) {
    case 'welcome':
      return <WelcomeStep />;
    case 'qiraa':
      return <QiraaStep />;
    case 'reciter':
      return <ReciterStep />;
    case 'channels':
      return <ChannelsStep />;
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: KhazainColors.pageBg,
  },
  progressWrap: {
    paddingTop: 16,
    paddingBottom: 8,
    paddingHorizontal: 24,
  },
  stepArea: {
    flex: 1,
  },
  footerWrap: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    paddingTop: 8,
  },
});
