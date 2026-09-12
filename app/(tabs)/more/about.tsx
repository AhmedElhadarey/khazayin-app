import { InlineHeader } from '@/components/khazain';
import { HeaderArt } from '@/components/khazain/patterns';
import { CARD_DENSITY, PHYSICAL_BOX } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import { ABOUT_CARDS, ABOUT_PARAGRAPHS } from '@/data/content/about';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Node 2106:2712. Three paragraphs, then two cards — رؤيتنا and رسالتنا.
//
// The file sets all of it in the body face: the paragraphs at 14/20 in
// `#5F5345`, each card's heading at 14 in `#281E13` and its copy at 12/16 in
// `#5F5345`. The app had been setting the paragraphs in the display face and
// the headings in Amiri Bold 18 gold, which made a page of prose read like a
// page of titles.
export default function AboutScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <HeaderArt corners="single" />
      <InlineHeader title="مؤسسة خزائن الرحمن" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {ABOUT_PARAGRAPHS.map((paragraph) => (
          <Text key={paragraph} style={styles.body}>
            {paragraph}
          </Text>
        ))}
        <View style={styles.cardsBlock}>
          {ABOUT_CARDS.map((card) => (
            <InfoCard key={card.id} title={card.title} body={card.body} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// `DIV-144` / `DIV-151` — 361 x 84 at radius 16, a flat `#FCFAF8` with no
// stroke and no shadow, inset 12.
function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardBody}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: KhazainColors.pageBg },
  container: {
    // PHYSICAL_BOX so the prose column keeps its authored edges under forceRTL.
    ...PHYSICAL_BOX,
    paddingHorizontal: 16,
    paddingTop: 8,
    // `P-135` ends at 184 and `P-138` starts at 200.
    gap: 16,
  },
  body: textStyle('bodyCompact', { color: KhazainColors.inkSubtle }),
  cardsBlock: {
    // `DIV-144` ends at 416 and `DIV-151` starts at 432.
    gap: 16,
  },
  card: {
    padding: 12,
    backgroundColor: KhazainColors.cardBg,
    borderRadius: CARD_DENSITY.lectureCardRadius,
  },
  cardTitle: {
    ...textStyle('bodyCompact', { color: KhazainColors.inkTitle }),
    // `H5-145` ends at 464 and `P-148` starts at 472.
    marginBottom: 8,
  },
  cardBody: textStyle('caption', { color: KhazainColors.inkSubtle }),
});
