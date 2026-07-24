import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  I18nManager,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ChannelsStep,
  FEATURE_STEPS,
  FeatureStep,
  OnboardingFooter,
  OnboardingProgress,
  QiraaStep,
  ReciterStep,
  WelcomeStep,
} from '@/components/khazain/onboarding';
import { ONBOARDING_STEP_COUNT } from '@/constants/settings';
import { KhazainColors } from '@/constants/theme';
import { useSettingsStore } from '@/store';

const SLIDE_OFFSET = 40;
const SLIDE_DURATION = 280;

export default function OnboardingScreen(): React.ReactElement {
  const router = useRouter();
  const setOnboardingStep = useSettingsStore((s) => s.setOnboardingStep);
  const setOnboardingComplete = useSettingsStore((s) => s.setOnboardingComplete);

  // Resume at the last reached step (read once on mount).
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
  useEffect(() => {
    if (reduceMotion) {
      anim.setValue(0);
      return;
    }
    anim.setValue(1);
    const animation = Animated.timing(anim, {
      toValue: 0,
      duration: SLIDE_DURATION,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [step, reduceMotion, anim]);

  const goTo = (next: number): void => {
    const clamped = Math.max(0, Math.min(ONBOARDING_STEP_COUNT - 1, next));
    directionRef.current = clamped > step ? 1 : -1;
    setStep(clamped);
    setOnboardingStep(clamped);
  };

  const finish = (): void => {
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
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
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
    </SafeAreaView>
  );
}

/**
 * Step content (track 003): 0 welcome → 1 qira'a → 2 reciter →
 * 3–6 feature showcase (FEATURE_STEPS) → 7 channels.
 */
function renderStep(step: number): React.ReactElement {
  switch (step) {
    case 0:
      return <WelcomeStep />;
    case 1:
      return <QiraaStep />;
    case 2:
      return <ReciterStep />;
    case 7:
      return <ChannelsStep />;
    default: {
      // Steps 3–6 are the feature-showcase screens.
      const feature = FEATURE_STEPS[step - 3];
      return feature ? (
        <FeatureStep
          illustration={feature.illustration}
          title={feature.title}
          description={feature.description}
        />
      ) : (
        <WelcomeStep />
      );
    }
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
