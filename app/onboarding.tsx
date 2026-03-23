import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Animated,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, Border } from '@/constants/theme';
import { Text } from '@/components/ui/Text';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function OnboardingScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const textFadeAnim = useRef(new Animated.Value(0)).current;
  const buttonFadeAnim = useRef(new Animated.Value(0)).current;
  const lineWidthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(textFadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(buttonFadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(lineWidthAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const finishOnboarding = async () => {
    await AsyncStorage.setItem('has_seen_onboarding', 'true');
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      {/* Warm background */}
      <View style={styles.bgFill} />

      {/* Top decorative line */}
      <View style={[styles.decorativeLine, { top: height * 0.12 }]}>
        <View style={styles.decoLineInner} />
      </View>

      {/* Bottom decorative line */}
      <View style={[styles.decorativeLine, { top: height * 0.88 }]}>
        <View style={styles.decoLineInner} />
      </View>

      {/* Main content */}
      <View style={styles.content}>
        {/* Logo badge */}
        <Animated.View
          style={[
            styles.logoBadge,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.badgeOuter}>
            {/* Gold border frame */}
            <View style={styles.badgeInner}>
              <Ionicons name="book" size={44} color="#FFFFFF" />
            </View>
          </View>
        </Animated.View>

        {/* Decorative separator under logo */}
        <Animated.View style={[styles.logoSeparator, { opacity: fadeAnim }]}>
          <View style={styles.sepLineLeft} />
          <View style={styles.sepDiamond} />
          <View style={styles.sepLineRight} />
        </Animated.View>

        {/* Text content */}
        <Animated.View style={[styles.textContainer, { opacity: textFadeAnim }]}>
          <Text
            variant="display"
            weight="bold"
            align="center"
            color={Colors.light.primary}
          >
            {'\u062E\u0632\u0627\u0626\u0646 \u0627\u0644\u0631\u062D\u0645\u0646'}
          </Text>
          <Text
            variant="lg"
            weight="semiBold"
            color={Colors.light.secondary}
            align="center"
            style={styles.tagline}
          >
            {'\u062A\u0623\u062E\u0630 \u0628\u064A\u062F\u0643 \u0625\u0644\u0649 \u0627\u0644\u062C\u0646\u0629'}
          </Text>

          {/* Another subtle separator */}
          <View style={styles.textSeparator}>
            <View style={styles.textSepLine} />
          </View>

          <Text
            variant="md"
            color={Colors.light.textSecondary}
            align="center"
            style={styles.description}
          >
            {'\u0645\u0643\u062A\u0628\u0629 \u0631\u0642\u0645\u064A\u0629 \u0625\u0633\u0644\u0627\u0645\u064A\u0629 \u0634\u0627\u0645\u0644\u0629'}{'\n'}
            {'\u0644\u0644\u0643\u062A\u0628 \u0648\u0627\u0644\u0645\u062D\u0627\u0636\u0631\u0627\u062A \u0648\u0627\u0644\u0645\u0648\u0627\u0631\u062F \u0627\u0644\u0646\u0627\u0641\u0639\u0629'}
          </Text>
        </Animated.View>
      </View>

      {/* Bottom CTA */}
      <Animated.View style={[styles.footer, { opacity: buttonFadeAnim }]}>
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={finishOnboarding}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={'\u0627\u0628\u062F\u0623 \u0627\u0644\u062A\u0635\u0641\u062D'}
        >
          <Text variant="lg" weight="bold" color={Colors.light.textOnPrimary}>
            {'\u0627\u0628\u062F\u0623 \u0627\u0644\u062A\u0635\u0641\u062D'}
          </Text>
          <View style={styles.ctaArrow}>
            <Ionicons name="arrow-back" size={18} color={Colors.light.primary} />
          </View>
        </TouchableOpacity>

        {/* Bottom decorative element */}
        <View style={styles.bottomDeco}>
          <View style={styles.bottomDecoLine} />
          <View style={styles.bottomDecoDot} />
          <View style={styles.bottomDecoLine} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5EDD8',
  },
  bgFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F5EDD8',
  },

  // Decorative lines
  decorativeLine: {
    position: 'absolute',
    left: width * 0.1,
    right: width * 0.1,
    alignItems: 'center',
  },
  decoLineInner: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(199, 162, 84, 0.3)',
  },

  // Content
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
  },

  // Logo badge
  logoBadge: {
    marginBottom: Spacing.xl,
  },
  badgeOuter: {
    width: 120,
    height: 140,
    backgroundColor: Colors.light.primary,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1B3A5C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  badgeInner: {
    width: 100,
    height: 120,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(199, 162, 84, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Logo separator
  logoSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.xl,
  },
  sepLineLeft: {
    width: 50,
    height: 2,
    backgroundColor: Colors.light.goldBar,
    borderRadius: 1,
  },
  sepDiamond: {
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: Colors.light.goldBar,
    transform: [{ rotate: '45deg' }],
  },
  sepLineRight: {
    width: 50,
    height: 2,
    backgroundColor: Colors.light.goldBar,
    borderRadius: 1,
  },

  // Text
  textContainer: {
    alignItems: 'center',
  },
  tagline: {
    marginTop: Spacing.sm,
    lineHeight: 28,
  },
  textSeparator: {
    marginVertical: Spacing.lg,
    alignItems: 'center',
  },
  textSepLine: {
    width: 40,
    height: 2,
    backgroundColor: Colors.light.secondary,
    borderRadius: 1,
    opacity: 0.5,
  },
  description: {
    lineHeight: 26,
  },

  // Footer / CTA
  footer: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xxxl + 10,
    alignItems: 'center',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.primary,
    paddingVertical: 16,
    paddingHorizontal: Spacing.xxxl,
    borderRadius: Border.radius.lg,
    gap: Spacing.md,
    width: '100%',
    shadowColor: '#1B3A5C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  ctaArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.light.goldBar,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Bottom decorative
  bottomDeco: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xl,
    gap: 8,
  },
  bottomDecoLine: {
    width: 40,
    height: 1,
    backgroundColor: 'rgba(199, 162, 84, 0.4)',
  },
  bottomDecoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.light.secondary,
  },
});
