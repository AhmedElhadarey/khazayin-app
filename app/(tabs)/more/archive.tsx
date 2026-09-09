import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';
import { KhazainColors, KhazainShadows } from '@/constants/theme';
import { DetailHeader, SearchPill } from '@/components/khazain';
import { ChevronIcon } from '@/components/khazain/icons';
import { OrnamentPattern } from '@/components/khazain/patterns';

const ITEMS = [
  {
    id: 'scholars',
    title: 'العلماء والمشايخ',
    subtitle: 'محاضرات ودروس كبار العلماء',
    count: '٢٤٣ حلقة',
    glyph: <ScholarsGlyph />,
  },
  {
    id: 'books',
    title: 'الكتب العلمية',
    subtitle: 'شروحات الكتب الإسلامية المهمة',
    count: '٨٩ حلقة',
    glyph: <BookGlyph />,
  },
  {
    id: 'audio',
    title: 'كتب صوتية',
    subtitle: 'كتب إسلامية مقروءة بصوت عذب',
    count: '٦٧ كتاب',
    glyph: <AudioBookGlyph />,
  },
] as const;

export default function ArchiveScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <OrnamentPattern style={StyleSheet.absoluteFillObject} coverage="corner" />
      <DetailHeader title="الأرشيف" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.searchBlock}>
          <SearchPill placeholder="بحث.." onPress={() => router.push('/search' as any)} />
        </View>
        <View style={styles.list}>
          {ITEMS.map((it) => (
            <ArchiveCard
              key={it.id}
              title={it.title}
              subtitle={it.subtitle}
              count={it.count}
              icon={it.glyph}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Archive card per Figma page-41: cream card, 18 radius, soft shadow, 56×56
// gold-stroked cream disc anchored to the right (RTL start), title + subtitle
// + navy count chip stacked, small chevron pinned to the left.
function ArchiveCard({
  title,
  subtitle,
  count,
  icon,
}: {
  title: string;
  subtitle: string;
  count: string;
  icon: React.ReactNode;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        KhazainShadows.card,
        { transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      <View style={styles.disc}>{icon}</View>
      <View style={styles.textCol}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
        <Text style={styles.count}>{count}</Text>
      </View>
      <View style={styles.chevron}>
        <ChevronIcon size={14} color={KhazainColors.ink400} direction="start" />
      </View>
    </Pressable>
  );
}

function ScholarsGlyph() {
  // Quill / inkwell — port of the inline SVG referenced in the Figma archive
  // page where each card's disc is gold-stroked and the glyph is a quill.
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 19l3-3m0 0l8-8a3 3 0 014 4l-8 8H8v-1zM14 6l4 4"
        stroke={KhazainColors.gold500}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M6 19h2"
        stroke={KhazainColors.gold500}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function BookGlyph() {
  // Stack of books — gold-stroked.
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 5h3v14H5zM10 5h3v14h-3zM15 7l3-1 3 13-3 1z"
        stroke={KhazainColors.gold500}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <Path
        d="M5 8h3M10 9h3M15.4 10l3-1"
        stroke={KhazainColors.gold500}
        strokeWidth={1}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function AudioBookGlyph() {
  // Open-book audio glyph (per Figma — not headphones).
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 6c2.5 0 4 .8 4 2.5V19c0-1.7-1.5-2.5-4-2.5V6zM20 6c-2.5 0-4 .8-4 2.5V19c0-1.7 1.5-2.5 4-2.5V6z"
        stroke={KhazainColors.gold500}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={12} r={1.6} fill={KhazainColors.gold500} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: KhazainColors.pageBg },
  container: {
    paddingTop: 0,
  },
  searchBlock: { paddingHorizontal: 14, paddingVertical: 8 },
  list: { paddingHorizontal: 14, paddingTop: 4, gap: 12 },
  card: {
    position: 'relative',
    backgroundColor: KhazainColors.cream50,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(141,107,52,0.12)',
    minHeight: 96,
    paddingVertical: 16,
    paddingLeft: 32, // chevron column
    paddingRight: 84, // disc 56 + 12 inset + 16 gap
    justifyContent: 'center',
  },
  disc: {
    position: 'absolute',
    right: 14,
    top: '50%',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: KhazainColors.cream100,
    borderWidth: 1.2,
    borderColor: 'rgba(141,107,52,0.30)',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateY: -28 }],
  },
  textCol: {
    gap: 4,
  },
  title: {
    fontFamily: 'Amiri-Bold',
    fontSize: 18,
    fontWeight: '700',
    color: KhazainColors.ink900,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  subtitle: {
    fontFamily: 'TheSansArabic',
    fontSize: 12.5,
    color: KhazainColors.ink500,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  count: {
    fontFamily: 'TheSansArabic',
    fontSize: 13,
    fontWeight: '700',
    color: KhazainColors.navy800,
    marginTop: 4,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  chevron: {
    position: 'absolute',
    left: 12,
    top: '50%',
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateY: -7 }],
  },
});
