import {
  InlineHeader,
  LetterIndex,
  ReciterRow,
  SearchPill,
  SegmentTabs,
} from '@/components/khazain';
import { KhazainColors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Page 13/14: reciter tabs + reciter list with right-rail letter index.
// Tabs sit between the InlineHeader+SearchPill and the list.

type TabKey = 'tajweed' | 'murattal' | 'muallam' | 'qiraat';

const TABS: { key: TabKey; label: string }[] = [
  // RTL visual order: المصحف المجوّد is first (right-most), then المرتل, المعلّم, قراءات.
  { key: 'tajweed', label: 'المصحف المجوّد' },
  { key: 'murattal', label: 'المصحف المرتل' },
  { key: 'muallam', label: 'المصحف المعلّم' },
  { key: 'qiraat', label: 'قراءات' },
];

const RECITERS = Array.from({ length: 7 }).map((_, i) => ({
  id: `r${i}`,
  name: 'الشيخ عبد الباسط عبد الصمد',
  style: 'التلاوة المجودة',
}));

export default function ReciterScreen() {
  const router = useRouter();
  const [active, setActive] = useState<TabKey>('tajweed');

  const onPickReciter = () => {
    if (active === 'qiraat') {
      router.push('/sections/qiraat' as any);
    } else {
      router.push('/sections/mushaf' as any);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <InlineHeader title="القرآن حياة" onBack={() => router.back()} />
      <View style={styles.searchBlock}>
        <SearchPill placeholder="بحث.." />
      </View>
      <SegmentTabs<TabKey> tabs={TABS} active={active} onChange={setActive} />
      {/* Body: scrollable list + absolute-positioned right-rail letter index. */}
      <View style={styles.body}>
        <ScrollView
          contentContainerStyle={[styles.listContent, { paddingBottom: 24 }]}
          showsVerticalScrollIndicator={false}
          style={styles.list}
        >
          {RECITERS.map((r) => (
            <ReciterRow
              key={r.id}
              title={r.name}
              subtitle={r.style}
              onPress={onPickReciter}
            />
          ))}
        </ScrollView>
        <View style={styles.rail} pointerEvents="box-none">
          <LetterIndex active="م" />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: KhazainColors.pageBg },
  searchBlock: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  body: {
    flex: 1,
    paddingTop: 8,
    position: 'relative',
  },
  list: {
    flex: 1,
    paddingLeft: 16,
    paddingRight: 36, // leave room for the right-rail letter index
  },
  listContent: {
    gap: 8,
  },
  rail: {
    position: 'absolute',
    top: 8,
    bottom: 0,
    right: 4,
    width: 26,
    alignItems: 'center',
  },
});
