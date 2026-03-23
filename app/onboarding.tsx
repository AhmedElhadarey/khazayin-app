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
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing } from '@/constants/theme';
import { Text } from '@/components/ui/Text';
import Svg, { Path, G, Defs, ClipPath, Rect } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

// Islamic geometric pattern SVG component
function IslamicPattern({ opacity = 0.15 }: { opacity?: number }) {
  const patternSize = 120;
  const cols = Math.ceil(width / patternSize) + 1;
  const rows = Math.ceil(height / patternSize) + 1;

  return (
    <Svg
      width={width}
      height={height}
      style={StyleSheet.absoluteFillObject}
    >
      <Defs>
        <ClipPath id="clip">
          <Rect x="0" y="0" width={width} height={height} />
        </ClipPath>
      </Defs>
      <G clipPath="url(#clip)" opacity={opacity}>
        {Array.from({ length: rows }).map((_, row) =>
          Array.from({ length: cols }).map((_, col) => {
            const x = col * patternSize - patternSize / 2;
            const y = row * patternSize - patternSize / 2;
            const offset = row % 2 === 0 ? 0 : patternSize / 2;
            return (
              <G key={`${row}-${col}`} transform={`translate(${x + offset}, ${y})`}>
                {/* 8-pointed star pattern */}
                <Path
                  d={`
                    M 60 20 L 70 40 L 90 40 L 75 55 L 80 75 L 60 65 L 40 75 L 45 55 L 30 40 L 50 40 Z
                  `}
                  fill="none"
                  stroke="#A88051"
                  strokeWidth={1}
                />
                {/* Inner cross pattern */}
                <Path
                  d={`
                    M 60 35 L 60 55
                    M 50 45 L 70 45
                  `}
                  fill="none"
                  stroke="#A88051"
                  strokeWidth={0.5}
                />
                {/* Connecting lines */}
                <Path
                  d={`
                    M 30 40 L 20 60
                    M 90 40 L 100 60
                    M 40 75 L 30 95
                    M 80 75 L 90 95
                  `}
                  fill="none"
                  stroke="#A88051"
                  strokeWidth={0.5}
                />
              </G>
            );
          })
        )}
      </G>
    </Svg>
  );
}

// Arabic calligraphy logo component
function ArabicLogo() {
  return (
    <View style={styles.logoContainer}>
      <Text
        style={styles.logoText}
        variant="display"
        weight="bold"
        color="#5F482D"
      >
        {'مؤسسة خزائن الرحمن العلمية'}
      </Text>
    </View>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const logoFadeAnim = useRef(new Animated.Value(0)).current;
  const logoSlideAnim = useRef(new Animated.Value(30)).current;
  const patternFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate in sequence: background -> pattern -> logo
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(patternFadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(logoFadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(logoSlideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Auto-navigate after splash animation
    const timer = setTimeout(() => {
      finishOnboarding();
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  const finishOnboarding = async () => {
    await AsyncStorage.setItem('has_seen_onboarding', 'true');
    router.replace('/(tabs)');
  };

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={1}
      onPress={finishOnboarding}
      accessibilityRole="button"
      accessibilityLabel="اضغط للمتابعة"
    >
      {/* Gradient background */}
      <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: fadeAnim }]}>
        <LinearGradient
          colors={['#D4C4B0', '#E8DDD0', '#F5EDE4']}
          locations={[0, 0.4, 1]}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>

      {/* Islamic geometric pattern overlay */}
      <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: patternFadeAnim }]}>
        <IslamicPattern opacity={0.12} />
      </Animated.View>

      {/* Subtle vignette effect */}
      <View style={styles.vignette} />

      {/* Logo at bottom */}
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.logoWrapper,
            {
              opacity: logoFadeAnim,
              transform: [{ translateY: logoSlideAnim }],
            },
          ]}
        >
          <ArabicLogo />
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: height * 0.12,
  },
  logoWrapper: {
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  logoText: {
    fontSize: 24,
    lineHeight: 40,
    textAlign: 'center',
    fontFamily: 'System',
    fontWeight: '600',
  },
});
