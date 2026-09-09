export const Colors = {
  light: {
    primary: '#184B75',        // Deep navy blue
    primaryLight: '#2A5080',
    primaryDark: '#0E3A5C',
    secondary: '#A88051',      // Gold/brown accent
    secondaryLight: '#C1A584', // Gold bar accent
    secondaryDark: '#8B6A42',
    background: '#F5EDE4',     // Warm beige background (from design)
    backgroundGradientStart: '#D4C4B0', // Splash gradient start
    backgroundGradientEnd: '#F5EDE4',   // Splash gradient end
    surface: '#FFFFFF',        // White card surfaces
    surfaceAlt: '#F5EEE6',     // Light beige for cards
    surfaceElevated: '#FFFFFF',
    text: '#1C1C1E',
    textSecondary: '#5F482D',  // Brown text
    textMuted: '#8E8E93',
    textOnPrimary: '#FFFFFF',
    textOnPrimaryFaint: '#E8F0F7',
    border: '#E5DDD3',
    borderLight: '#EDE5DB',
    tabBar: '#FFFFFF',         // White tab bar (from design)
    tabBarActive: '#184B75',   // Navy active
    tabBarInactive: '#8E8E93', // Gray inactive
    tabBarBorder: '#E5DDD3',
    error: '#D94040',
    success: '#4CAF50',
    warning: '#F5A623',
    cardPattern: 'rgba(195, 175, 140, 0.12)',
    goldBar: '#C1A584',        // Section header accent bar
    blueBar: '#184B75',        // Card accent bar
    queenBg: '#F5EEE6',        // أنتِ ملكة section background
    bookCardBg: '#EDE5DB',     // Book cards beige background
    bannerBlue: '#184B75',     // Blue banner background
    bannerBlueLight: '#2A5F8F',
    bannerBeige: '#F5EEE6',    // Beige banner background
    inputBg: '#FFFFFF',        // Search input background
    iconBg: '#F5EEE6',         // Icon background circles
    chipBg: '#F5EEE6',         // Chip/tag background
    chipBgActive: '#184B75',   // Active chip background
    progressBg: '#E5DDD3',     // Progress bar background
    progressFill: '#184B75',   // Progress bar fill
    switchTrack: '#E5DDD3',
    switchTrackActive: '#184B75',
  },
  dark: {
    primary: '#3A6899',
    primaryLight: '#4A78A9',
    primaryDark: '#2A5080',
    secondary: '#C1A584',
    secondaryLight: '#D4B572',
    secondaryDark: '#A88051',
    background: '#121212',
    backgroundGradientStart: '#1A1A1A',
    backgroundGradientEnd: '#121212',
    surface: '#1E1E1E',
    surfaceAlt: '#252525',
    surfaceElevated: '#2A2A2A',
    text: '#F2F2F7',
    textSecondary: '#AEAEB2',
    textMuted: '#636366',
    textOnPrimary: '#FFFFFF',
    textOnPrimaryFaint: '#E0E0E0',
    border: '#38383A',
    borderLight: '#2C2C2E',
    tabBar: '#1E1E1E',
    tabBarActive: '#D4B572',
    tabBarInactive: '#636366',
    tabBarBorder: '#38383A',
    error: '#FF453A',
    success: '#32D74B',
    warning: '#FFD60A',
    cardPattern: 'rgba(212, 181, 114, 0.08)',
    goldBar: '#C1A584',
    blueBar: '#3A6899',
    queenBg: '#2A2420',
    bookCardBg: '#252525',
    bannerBlue: '#2A5080',
    bannerBlueLight: '#3A6899',
    bannerBeige: '#252525',
    inputBg: '#2A2A2A',
    iconBg: '#2A2A2A',
    chipBg: '#2A2A2A',
    chipBgActive: '#3A6899',
    progressBg: '#38383A',
    progressFill: '#3A6899',
    switchTrack: '#38383A',
    switchTrackActive: '#3A6899',
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 40,
};

export const Border = {
  radius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 28,
  },
};

export const Typography = {
  fontFamilies: {
    regular: 'System',
    semiBold: 'System',
    bold: 'System',
  },
  sizes: {
    xxs: 10,
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 30,
    display: 36,
  },
};

export const Shadows = {
  sm: {
    shadowColor: '#103350',
    shadowOffset: { width: 2, height: 1 },
    shadowOpacity: 0.24,
    shadowRadius: 5,
    elevation: 2,
  },
  md: {
    shadowColor: '#103350',
    shadowOffset: { width: 3, height: 1 },
    shadowOpacity: 0.24,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#103350',
    shadowOffset: { width: 5, height: 1 },
    shadowOpacity: 0.24,
    shadowRadius: 17,
    elevation: 6,
  },
};

// =====================================================================
// Khazain Al-Rahman design tokens — verbatim from handoff.md §5
// These are the canonical tokens for the new design system.
// Use Khazain* exports in components under components/khazain/.
// The legacy Colors/Shadows exports above remain for existing screens.
// =====================================================================

export const KhazainColors = {
  // Surfaces
  pageBg: '#F8F2ED',
  cardBg: '#FCFAF8',
  cardBorder: 'rgba(141, 107, 52, 0.10)',
  iconChipBg: 'rgba(215, 185, 149, 0.16)',

  // Cream scale
  cream50: '#FCFAF8',
  cream100: '#F8F2ED',
  cream200: '#EFE4D0',
  cream300: '#E6D8BF',
  cream400: '#D9C6A3',
  heroCream: '#EDE0D1',
  heroHeaderBg: '#ECDED0',

  // Navy (primary brand)
  navy: '#184B76',
  navy900: '#0F3C61',
  navy800: '#184B76',
  navy700: '#22557F',
  navy600: '#2F6999',

  // Gold accents
  gold600: '#8E6630',
  gold500: '#A67C3F',
  gold400: '#B8864A',
  gold300: '#D2A55F',
  gold200: '#E8C78A',
  goldAccent: '#A88051',
  goldBar: '#C1A584',
  goldCalligraphy: '#D7B995', // calligraphy stroke colour on navy ribbon cards (ScholarCard / BookCard)
  navPill: '#C1A584',
  navPillBg: 'rgba(215, 185, 149, 0.16)',
  navLabel: '#F1E7DD',

  // Ink (text)
  inkTitle: '#281E13',
  ink900: '#281E13',
  ink700: '#3D2E1D',
  inkSubtle: '#5F5345',
  ink500: '#5F5345',
  inkPlaceholder: '#988671',
  ink400: '#988671',
  inkCount: '#184B76',
  inkArrow: '#281E13',

  // Accent
  teal600: '#2E6B6B',

  // Skeleton placeholder (navy at ~8% opacity on cream pageBg)
  skeleton: 'rgba(24,75,118,0.08)',
} as const;

export const KhazainFonts = {
  ui: 'NotoSansArabic',
  body: 'NotoSansArabic',
  display: 'Amiri',
  naskh: 'NotoNaskhArabic',
} as const;

export const KhazainWeights = {
  light: '300',
  regular: '400',
  medium: '500',
  semibold: '600', // TheSansArabic 530 → NotoSansArabic 600
  bold: '700',
} as const;

export const KhazainRadius = {
  pill: 999,
  lg: 16,
  md: 12,
  sm: 8,
  xs: 4,
} as const;

export const KhazainShadows = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    // Android renders elevation as a hard grey outline at 2+; 1 keeps the lift
    // without the separator the 2026-09-09 audit found around every card.
    elevation: 1,
  },
  input: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  press: {
    shadowColor: '#34240C',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  hero: {
    shadowColor: '#103350',
    shadowOpacity: 0.24,
    shadowRadius: 17,
    shadowOffset: { width: 5, height: 1 },
    elevation: 4,
  },
} as const;

// Spacing steps per handoff: 4, 8, 12, 16, 20, 24, 32
export const KhazainSpacing = {
  x1: 4,
  x2: 8,
  x3: 12,
  x4: 16,
  x5: 20,
  x6: 24,
  x8: 32,
} as const;

// Re-export of the Quran-text font scale so it lives alongside the other
// Khazain* design tokens. Source of truth remains `constants/settings.ts`
// (settings track 002 owns the scale).
export { FONT_SIZE_SCALE as KhazainFontSizeScale } from './settings';

export type KhazainColorKey = keyof typeof KhazainColors;
export type KhazainFontKey = keyof typeof KhazainFonts;
