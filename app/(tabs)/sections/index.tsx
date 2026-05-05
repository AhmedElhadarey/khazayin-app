import { ListRowCard, SearchPill } from '@/components/khazain';
import { SECTION_ICONS, SectionIconKey } from '@/components/khazain/icons/sections';
import { KhazainColors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Section = {
  id: string;
  route: string | null; // null → not yet implemented
  title: string;
  subtitle: string;
  count: string | null;
  icon: SectionIconKey;
};

const SECTIONS: Section[] = [
  { id: 'quran', route: '/sections/reciter', title: 'القرآن حياة', subtitle: 'تلاوات وتفسير وتدبّر القرآن الكريم', count: '١٥١ حلقة', icon: 'quran' },
  { id: 'prophet', route: '/sections/prophet', title: 'رسول الله ﷺ', subtitle: 'السيرة النبوية والشمائل المحمدية', count: '٢٥٣ حلقة', icon: 'prophet' },
  { id: 'scholars', route: '/sections/scholar', title: 'العلماء والمشايخ', subtitle: 'محاضرات ودروس كبار العلماء', count: '٢٥٣ حلقة', icon: 'scholar' },
  { id: 'books', route: '/sections/books', title: 'الكتب العلمية', subtitle: 'شروحات الكتب الإسلامية المهمة', count: '٨٩ حلقة', icon: 'book' },
  { id: 'queen', route: '/sections/queen', title: 'أنتِ ملكة', subtitle: 'ملكةٌ أنتِ لا سواكِ', count: null, icon: 'crown' },
  { id: 'audiobooks', route: null, title: 'كتب صوتية', subtitle: 'كتب إسلامية مقروءة بصوت عذب', count: '١٧ كتاباً', icon: 'headphones' },
  { id: 'exclusive', route: null, title: 'حصريات خزائن الرحمن', subtitle: 'محتوى حصري ومميّز', count: '٣١ حلقة', icon: 'sparkle' },
  { id: 'radio', route: '/sections/radio', title: 'برامج إذاعية', subtitle: 'برامج إذاعية إسلامية متنوعة', count: '٢٣٨ برنامج', icon: 'mic' },
  { id: 'dawah', route: '/sections/dawah', title: 'تصميمات دعوية', subtitle: 'محتوى دعوي ومرئي للدعوة', count: '١٢٥ تصميم', icon: 'design' },
];

export default function SectionsScreen() {
  const router = useRouter();

  const open = (s: Section) => {
    if (s.route) {
      router.push(s.route as any);
    } else {
      Alert.alert(s.title, 'قريباً بإذن الله');
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerBlock}>
          <Text style={styles.h1}>الأقسام</Text>
        </View>
        <View style={styles.searchBlock}>
          <SearchPill placeholder="ابحث في الأقسام.." />
        </View>
        <View style={styles.list}>
          {SECTIONS.map((s) => {
            const Icon = SECTION_ICONS[s.icon];
            return (
              <ListRowCard
                key={s.id}
                title={s.title}
                subtitle={s.subtitle}
                count={s.count ?? undefined}
                onPress={() => open(s)}
                icon={<Icon size={34} />}
              />
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: KhazainColors.pageBg },
  container: { paddingTop: 0 },
  headerBlock: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    alignItems: 'center',
  },
  h1: {
    fontFamily: 'TheSansArabic',
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '700',
    color: KhazainColors.inkTitle,
    writingDirection: 'rtl',
  },
  searchBlock: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  list: {
    paddingHorizontal: 16,
    gap: 8,
  },
});
