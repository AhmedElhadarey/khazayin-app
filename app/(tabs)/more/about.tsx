import { DetailHeader, LogoBadge, Wordmark } from '@/components/khazain';
import { KhazainColors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AboutScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <DetailHeader title="نبذة عن المؤسسة" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brand}>
          <LogoBadge size={54} />
          <View style={{ marginTop: 10 }}>
            <Wordmark size={16} />
          </View>
        </View>
        <Text style={styles.body}>
          مؤسسة خزائن الرحمن العالمية مؤسسة دعوية علمية تُعنى بنشر العلم الشرعي الصافي من مصادره الأصلية، وتقديمه للمسلمين بأسلوب معاصر يجمع بين أصالة العلم وحسن العرض.
        </Text>
        <InfoCard
          title="رؤيتنا"
          body="أن نكون مرجعاً رقمياً موثوقاً يصل بالعلم الشرعي إلى كل بيت مسلم، باللغة التي يفهمها ويحبها."
        />
        <InfoCard
          title="رسالتنا"
          body="أن نُتيح تراث العلماء المعتبَرين في صورة رقمية متاحة للجميع، وأن نُعين الدعاة على إيصال الخير بلغة العصر."
        />
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
    paddingTop: 4,
    gap: 12,
  },
  brand: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  body: {
    fontSize: 13,
    lineHeight: 23,
    color: KhazainColors.ink700,
    fontFamily: 'TheSansArabic',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  card: {
    padding: 14,
    backgroundColor: KhazainColors.cream50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(141,107,52,0.1)',
    marginTop: 8,
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
