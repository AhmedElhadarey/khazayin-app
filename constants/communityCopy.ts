/**
 * constants/communityCopy.ts
 * --------------------------
 * Frozen community copy (design §8.6 and the strings the design quotes in
 * §3.2, §4, §6, §7 and §8). Counts go through `arabicCount`
 * (`services/libraryStats.ts`) with the forms below. `arabicCount` is defined
 * for n >= 1 and its `many` form is accusative singular («يومًا»), wrong at
 * 100+, so unbounded totals use the label functions instead.
 */
import { toArabicDigits } from '@/constants/progress';
import type { AdabRejectReason } from '@/services/community/adabFilter';
import { arabicCount, type CountForms } from '@/services/libraryStats';

export const MEMBERS: CountForms = { one: 'عضو واحد', two: 'عضوان', few: 'أعضاء', many: 'عضوًا' };
export const DAYS: CountForms = { one: 'يوم واحد', two: 'يومان', few: 'أيام', many: 'يومًا' };
export const SECONDS: CountForms = { one: 'ثانية واحدة', two: 'ثانيتان', few: 'ثوانٍ', many: 'ثانية' };
export const DISCUSSIONS: CountForms = { one: 'نقاش واحد', two: 'نقاشان', few: 'نقاشات', many: 'نقاشًا' };

export const COMMUNITY_COPY = Object.freeze({
  // Entry points and banner
  previewBanner: 'بيانات تجريبية للمعاينة — الأعضاء والمشاركات هنا ليست حقيقية',
  scholarDiscussions: 'نقاشات دروس الشيخ',
  // Intro (pending Foundation review)
  screenTitle: 'المجتمع',
  introTitle: 'مجتمع خزائن الرحمن',
  introBody:
    'انضم إلى مجموعة قراءة مع أهلك وأصحابك، فاختموا القرآن معًا أو التزموا وردًا يوميًا، وتدارسوا الدروس في نقاشات يحكمها أدب طالب العلم.',
  introPrivacy:
    'لا نشارك صفحاتك ولا ملاحظاتك. يرى أعضاء مجموعتك الاسم الذي تختاره ومجموع تقدّمك في التحدي فقط، ويمكنك إيقاف المشاركة متى شئت.',
  nameLabel: 'الاسم الذي يظهر للأعضاء',
  namePlaceholder: 'مثال: أبو عبد الله',
  guidelinesLink: 'إرشادات المجتمع',
  policyLink: 'سياسة الخصوصية',
  accept: 'قرأت الإرشادات وأوافق عليها',
  // Filter refusals (pending Foundation review); total over AdabRejectReason
  filterReason: Object.freeze<Record<AdabRejectReason, string>>({
    empty: 'اكتب شيئًا قبل الإرسال',
    tooShort: 'النص قصير جدًا',
    tooLong: 'النص أطول من المسموح',
    link: 'لا يُسمح بالروابط في المشاركات',
    phone: 'لا يُسمح بأرقام الهواتف حفاظًا على الخصوصية',
    term: 'يُرجى مراجعة الصياغة بما يليق بأدب الحوار',
    repetition: 'يُرجى تجنّب تكرار الأحرف أو الكلمات',
  }),
  // Groups
  myGroups: 'مجموعاتي',
  noGroupsYet: 'لم تنضمّ إلى أي مجموعة بعد',
  createGroup: 'إنشاء مجموعة',
  joinWithCode: 'الانضمام برمز',
  badCode: 'رمز غير صحيح أو منتهٍ',
  full: 'المجموعة مكتملة',
  challengeStarts: 'تُحتسب الصفحات المقروءة من تاريخ بدء التحدي',
  totalsHidden: 'يظهر مجموع المجموعة بعد مشاركة مزيد من الأعضاء في التحدي',
  totalsNote: 'مجموع ما قرأه الأعضاء منذ بدء التحدي',
  shareProgress: 'إظهار تقدّمي لأعضاء المجموعة',
  resetHelp: 'لا ينقص التقدّم المُرسَل بعد إعادة تعيين القراءة',
  // Threads and posts
  composerPlaceholder: 'شارك فائدة أو سؤالًا حول الدرس…',
  emptyThread: 'لا توجد مشاركات بعد. كن أول من يشارك بفائدة.',
  noDiscussions: 'لا توجد نقاشات بعد',
  reviewNotice: 'ستُراجَع مشاركتك قبل ظهورها',
  pendingBadge: 'قيد المراجعة — لن تظهر للآخرين حتى تُعتمد',
  hiddenBadge: 'أُخفيت لمخالفتها إرشادات المجتمع',
  pickAnotherName: 'يُرجى اختيار اسم آخر',
  deletePost: 'حذف',
  report: 'إبلاغ',
  muteMember: 'كتم هذا العضو',
  listenToLecture: 'استمع للدرس',
  // Report sheet
  reportReasons: Object.freeze({
    offensive: 'إساءة أو ألفاظ غير لائقة',
    sectarian: 'تكفير أو طعن أو إثارة فتنة',
    misinformation: 'نسبة قول أو حديث بغير تثبّت',
    spam: 'إعلان أو تكرار مزعج',
    privacy: 'كشف معلومات شخصية',
    other: 'سبب آخر',
  }),
  reportThanks: 'شكرًا لك، تم الإبلاغ وإخفاء المشاركة عنك',
  muteConfirm: 'لن تظهر لك مشاركات هذا العضو.',
  unmute: 'إلغاء الكتم',
  // Settings
  settingsSection: 'المجتمع',
  joinCommunity: 'الانضمام إلى المجتمع',
  participate: 'المشاركة في المجتمع',
  mutedMembers: 'الأعضاء المكتومون',
  deleteMyData: 'حذف بياناتي في المجتمع',
  pauseNote: 'إيقاف المشاركة يخفي المجتمع ولا يحذف بياناتك.',
  deletionPending: 'جارٍ حذف بياناتك في المجتمع',
  retryNow: 'إعادة المحاولة الآن',
  dueNow: 'الآن',
  deleteConfirmBody:
    'سيُحذف اسمك ومشاركاتك وعضويتك في المجموعات من المجتمع نهائيًا، ولا يمكن التراجع عن ذلك.',
  deletionLostToken: 'تعذّر التحقق من حسابك. راسلنا من "تواصل معنا" لحذف بياناتك',
  // Errors (mirror services/api/errors.ts)
  moderation: 'لم تُنشر المشاركة لأنها تخالف إرشادات المجتمع. يُرجى مراجعتها.',
  conflict: 'تعذّر إتمام الطلب لتعارضه مع تغيير آخر. حدّث الصفحة وحاول مجددًا.',
});

/** Khatm bar label: «نحو ١٢٠ صفحة». Label form, since totals are unbounded. */
export function khatmLabel(pages: number): string {
  return `نحو ${toArabicDigits(pages)} صفحة`;
}

/** Daily-wird label: «أيام الإنجاز: ١٢٠ من ٣٠٠٠». Label form, never «يومًا». */
export function daysMetLabel(done: number, total: number): string {
  return `أيام الإنجاز: ${toArabicDigits(done)} من ${toArabicDigits(total)}`;
}

/** Post cooldown (§7.5): «يمكنك المشاركة مجددًا بعد ٣ ثوانٍ». n >= 1. */
export function cooldownCopy(seconds: number): string {
  return `يمكنك المشاركة مجددًا بعد ${arabicCount(Math.max(1, Math.ceil(seconds)), SECONDS)}`;
}

/** «المحاولة القادمة {time}» for the pending-deletion row. */
export function nextAttemptCopy(time: string): string {
  return `المحاولة القادمة ${time}`;
}

/** «الإبلاغ عن مشاركة {name}» / «كتم {name}» accessibility labels (§10). */
export function reportA11y(name: string): string {
  return `الإبلاغ عن مشاركة ${name}`;
}
export function muteA11y(name: string): string {
  return `كتم ${name}`;
}

/** Row label for a muted member; names are never stored, so the row is numbered. */
export function mutedMemberLabel(n: number): string {
  return `عضو مكتوم ${toArabicDigits(n)}`;
}
