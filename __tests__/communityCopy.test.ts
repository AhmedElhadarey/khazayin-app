/**
 * Frozen community copy and count forms (design §8.6, §7.4).
 */
import {
  COMMUNITY_COPY,
  DAYS,
  DISCUSSIONS,
  MEMBERS,
  SECONDS,
  cooldownCopy,
  daysMetLabel,
  khatmLabel,
  mutedMemberLabel,
} from '@/constants/communityCopy';
import { COMMUNITY_GUIDELINES, GUIDELINES_TITLE } from '@/constants/communityGuidelines';
import { GUIDELINES_VERSION } from '@/services/community/gate';
import type { AdabRejectReason } from '@/services/community/adabFilter';
import { arabicCount } from '@/services/libraryStats';

describe('count forms', () => {
  it('agrees the noun with the number', () => {
    expect(arabicCount(3, SECONDS)).toBe('٣ ثوانٍ');
    expect(arabicCount(25, SECONDS)).toBe('٢٥ ثانية');
    expect(arabicCount(7, DAYS)).toBe('٧ أيام');
    expect(arabicCount(11, DAYS)).toBe('١١ يومًا');
    expect(arabicCount(1, DAYS)).toBe('يوم واحد');
    expect(arabicCount(2, DAYS)).toBe('يومان');
    expect(arabicCount(2, MEMBERS)).toBe('عضوان');
    expect(arabicCount(1, MEMBERS)).toBe('عضو واحد');
    expect(arabicCount(6, MEMBERS)).toBe('٦ أعضاء');
    expect(arabicCount(50, MEMBERS)).toBe('٥٠ عضوًا');
    expect(arabicCount(1, DISCUSSIONS)).toBe('نقاش واحد');
    expect(arabicCount(2, DISCUSSIONS)).toBe('نقاشان');
    expect(arabicCount(4, DISCUSSIONS)).toBe('٤ نقاشات');
    expect(arabicCount(12, DISCUSSIONS)).toBe('١٢ نقاشًا');
  });
});

describe('COMMUNITY_COPY', () => {
  it('pins the frozen strings', () => {
    expect(COMMUNITY_COPY.badCode).toBe('رمز غير صحيح أو منتهٍ');
    expect(COMMUNITY_COPY.full).toBe('المجموعة مكتملة');
    expect(COMMUNITY_COPY.totalsHidden).toBe(
      'يظهر مجموع المجموعة بعد مشاركة مزيد من الأعضاء في التحدي',
    );
    expect(COMMUNITY_COPY.previewBanner).toBe(
      'بيانات تجريبية للمعاينة — الأعضاء والمشاركات هنا ليست حقيقية',
    );
    expect(COMMUNITY_COPY.composerPlaceholder).toBe('شارك فائدة أو سؤالًا حول الدرس…');
    expect(COMMUNITY_COPY.emptyThread).toBe('لا توجد مشاركات بعد. كن أول من يشارك بفائدة.');
    expect(COMMUNITY_COPY.noDiscussions).toBe('لا توجد نقاشات بعد');
  });

  it('formats the parameterised labels', () => {
    expect(khatmLabel(120)).toBe('نحو ١٢٠ صفحة');
    expect(daysMetLabel(120, 3000)).toBe('أيام الإنجاز: ١٢٠ من ٣٠٠٠');
    expect(cooldownCopy(3)).toBe('يمكنك المشاركة مجددًا بعد ٣ ثوانٍ');
    expect(cooldownCopy(25)).toBe('يمكنك المشاركة مجددًا بعد ٢٥ ثانية');
  });

  it('uses label form, not a count form, for unbounded totals', () => {
    // «يومًا» is accusative singular and wrong at 100+, so totals never use it.
    expect(daysMetLabel(300, 3000)).not.toContain('يومًا');
  });

  it('contains no Latin letters and no empty strings', () => {
    const flat = (v: unknown): string[] =>
      typeof v === 'string' ? [v] : v && typeof v === 'object' ? Object.values(v).flatMap(flat) : [];
    const values = flat(COMMUNITY_COPY);
    expect(values.length).toBeGreaterThan(10);
    values.forEach((v) => {
      expect(v.length).toBeGreaterThan(0);
      expect(v).not.toMatch(/[A-Za-z]/);
    });
    [khatmLabel(10), daysMetLabel(1, 2), cooldownCopy(5)].forEach((v) =>
      expect(v).not.toMatch(/[A-Za-z]/),
    );
  });

  it('is frozen', () => {
    expect(Object.isFrozen(COMMUNITY_COPY)).toBe(true);
  });
});

describe('intro and filter copy (pending Foundation review)', () => {
  it('pins the intro strings', () => {
    expect(COMMUNITY_COPY.introTitle).toBe('مجتمع خزائن الرحمن');
    expect(COMMUNITY_COPY.introBody).toBe(
      'انضم إلى مجموعة قراءة مع أهلك وأصحابك، فاختموا القرآن معًا أو التزموا وردًا يوميًا، وتدارسوا الدروس في نقاشات يحكمها أدب طالب العلم.',
    );
    expect(COMMUNITY_COPY.introPrivacy).toBe(
      'لا نشارك صفحاتك ولا ملاحظاتك. يرى أعضاء مجموعتك الاسم الذي تختاره ومجموع تقدّمك في التحدي فقط، ويمكنك إيقاف المشاركة متى شئت.',
    );
    expect(COMMUNITY_COPY.nameLabel).toBe('الاسم الذي يظهر للأعضاء');
    expect(COMMUNITY_COPY.namePlaceholder).toBe('مثال: أبو عبد الله');
    expect(COMMUNITY_COPY.guidelinesLink).toBe('إرشادات المجتمع');
    expect(COMMUNITY_COPY.policyLink).toBe('سياسة الخصوصية');
    expect(COMMUNITY_COPY.accept).toBe('قرأت الإرشادات وأوافق عليها');
  });

  it('has a reason for exactly every AdabRejectReason', () => {
    // Compile-time: a missing or extra key fails tsc.
    const reasons: Record<AdabRejectReason, string> = COMMUNITY_COPY.filterReason;
    expect(Object.keys(reasons).sort()).toEqual(
      ['empty', 'link', 'phone', 'repetition', 'term', 'tooLong', 'tooShort'].sort(),
    );
    expect(reasons).toEqual({
      empty: 'اكتب شيئًا قبل الإرسال',
      tooShort: 'النص قصير جدًا',
      tooLong: 'النص أطول من المسموح',
      link: 'لا يُسمح بالروابط في المشاركات',
      phone: 'لا يُسمح بأرقام الهواتف حفاظًا على الخصوصية',
      term: 'يُرجى مراجعة الصياغة بما يليق بأدب الحوار',
      repetition: 'يُرجى تجنّب تكرار الأحرف أو الكلمات',
    });
    expect(Object.isFrozen(COMMUNITY_COPY.filterReason)).toBe(true);
  });
});

describe('guidelines', () => {
  it('has nine items at version 1', () => {
    expect(COMMUNITY_GUIDELINES).toHaveLength(9);
    expect(GUIDELINES_VERSION).toBe(1);
    expect(GUIDELINES_TITLE).toBe('إرشادات مجتمع خزائن الرحمن');
  });

  it('is Arabic only', () => {
    COMMUNITY_GUIDELINES.forEach((g) => expect(g).not.toMatch(/[A-Za-z]/));
  });

  // Pinned in full: a change to any item means bumping GUIDELINES_VERSION
  // (services/community/gate.ts) so members re-accept.
  it('pins all nine items', () => {
    expect(COMMUNITY_GUIDELINES).toEqual([
      'أخلص النية لله، واجعل مشاركتك نافعة لإخوانك وأخواتك.',
      'التزم أدب الحوار: «وَقُولُوا لِلنَّاسِ حُسْنًا». لا سبّ ولا سخرية ولا تجريح.',
      'لا تكفير ولا تبديع ولا طعن في العلماء أو في الأشخاص، ولا إثارة للخلافات المذهبية.',
      'تثبّت قبل النقل: لا تنسب حديثًا أو قولًا لعالم إلا بمصدر موثوق.',
      'اجعل النقاش في موضوع الدرس، واسأل أهل العلم فيما يحتاج إلى فتوى.',
      'لا روابط ولا أرقام هواتف ولا إعلانات، ولا تطلب معلومات شخصية من أحد.',
      'احفظ خصوصيتك وخصوصية غيرك.',
      'تُراجَع المشاركات وقد تُخفى المخالفة منها، ويُوقف من يتكرر منه ذلك.',
      'إن رأيت ما يخالف هذه الإرشادات فاستخدم «إبلاغ» بدلًا من الردّ.',
    ]);
  });
});

describe('T7b copy', () => {
  it('pins the strings the design review added', () => {
    expect(COMMUNITY_COPY.deleteConfirmBody).toBe(
      'سيُحذف اسمك ومشاركاتك وعضويتك في المجموعات من المجتمع نهائيًا، ولا يمكن التراجع عن ذلك.',
    );
    expect(COMMUNITY_COPY.myGroups).toBe('مجموعاتي');
    expect(COMMUNITY_COPY.noGroupsYet).toBe('لم تنضمّ إلى أي مجموعة بعد');
    expect(COMMUNITY_COPY.screenTitle).toBe('المجتمع');
    expect(COMMUNITY_COPY.dueNow).toBe('الآن');
    expect(mutedMemberLabel(3)).toBe('عضو مكتوم ٣');
  });
});
