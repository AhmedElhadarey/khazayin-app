import { DetailHeader } from '@/components/khazain';
import { OrnamentPattern } from '@/components/khazain/patterns';
import { KhazainColors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AboutScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <OrnamentPattern style={StyleSheet.absoluteFillObject} opacity={0.08} />
      <DetailHeader title="مؤسسة خزائن الرحمن" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: 160 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.body}>
          مؤسسة خزائن الرحمن هي مؤسسة دعوية تهدف إلى نشر العلم الشرعي والمحتوى الإسلامي الهادف من خلال منصات متعددة.
        </Text>
        <Text style={styles.body}>
          نسعى لخدمة الدين الإسلامي من خلال توفير محتوى عالي الجودة يشمل المحاضرات والدروس والبرامج الدينية.
        </Text>
        <Text style={styles.body}>
          تضم المؤسسة أكثر من ٦٥ قناة يوتيوب متخصصة في المحتوى الديني والدعوي، بالإضافة إلى قنوات التليجرام الرسمية.
        </Text>
        <View style={styles.cardsBlock}>
          <InfoCard
            title="رؤيتنا"
            body="أن نكون المرجع الأول في نشر المحتوى الإسلامي الأصيل والموثوق عبر المنصات الرقمية."
          />
          <InfoCard
            title="رسالتنا"
            body="نشر العلم الشرعي والقيم الإسلامية من خلال وسائل التقنية الحديثة لنصل إلى أكبر عدد من المسلمين حول العالم."
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

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
    paddingHorizontal: 18,
    paddingTop: 14,
    gap: 14,
  },
  body: {
    fontSize: 13,
    lineHeight: 24,
    color: KhazainColors.ink700,
    fontFamily: 'TheSansArabic',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  cardsBlock: {
    marginTop: 8,
    gap: 12,
  },
  card: {
    padding: 14,
    backgroundColor: KhazainColors.cream50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(141,107,52,0.10)',
  },
  cardTitle: {
    fontFamily: 'Amiri-Bold',
    fontSize: 18,
    fontWeight: '700',
    color: KhazainColors.gold600,
    marginBottom: 6,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  cardBody: {
    fontSize: 12.5,
    lineHeight: 22,
    color: KhazainColors.ink700,
    fontFamily: 'TheSansArabic',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
});
