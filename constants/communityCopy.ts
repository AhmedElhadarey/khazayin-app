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
import type { PostDisplayStatus } from '@/types/community';

export const MEMBERS: CountForms = { one: 'عضو واحد', two: 'عضوان', few: 'أعضاء', many: 'عضوًا' };
export const DAYS: CountForms = { one: 'يوم واحد', two: 'يومان', few: 'أيام', many: 'يومًا' };
export const SECONDS: CountForms = { one: 'ثانية واحدة', two: 'ثانيتان', few: 'ثوانٍ', many: 'ثانية' };
export const PAGES: CountForms = { one: 'صفحة واحدة', two: 'صفحتان', few: 'صفحات', many: 'صفحة' };
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
  groupCap: 'بلغت الحد الأقصى من المجموعات. غادر مجموعة للانضمام إلى أخرى.',
  challengeStarts: 'تُحتسب الصفحات المقروءة من تاريخ بدء التحدي',
  totalsHidden: 'يظهر مجموع المجموعة بعد مشاركة مزيد من الأعضاء في التحدي',
  totalsNote: 'مجموع ما قرأه الأعضاء منذ بدء التحدي',
  shareProgress: 'إظهار تقدّمي لأعضاء المجموعة',
  resetHelp: 'لا ينقص التقدّم المُرسَل بعد إعادة تعيين القراءة',
  // Group screens (T8; pending Foundation review)
  groupNameLabel: 'اسم المجموعة',
  groupNamePlaceholder: 'مثال: ختمة العائلة',
  challengeLabel: 'التحدي',
  khatmOption: 'ختمة القرآن',
  wirdOption: 'ورد يومي',
  khatmTitle: 'ختمة جماعية',
  wirdTitle: 'ورد يومي',
  pagesPerDayLabel: 'عدد الصفحات في اليوم',
  daysLabel: 'عدد الأيام',
  joinCodeLabel: 'رمز المجموعة',
  joinSubmit: 'انضمام',
  shareCode: 'مشاركة الرمز',
  noChallenge: 'لا يوجد تحدٍّ نشط في هذه المجموعة',
  ownProgress: 'تقدّمي',
  membersHeading: 'الأعضاء',
  ownerBadge: 'المالك',
  youBadge: 'أنت',
  leaveGroup: 'مغادرة المجموعة',
  leaveConfirmTitle: 'مغادرة المجموعة؟',
  leaveConfirmBody: 'ستفقد الوصول إلى تقدّم هذه المجموعة، ويمكنك الانضمام إليها مجددًا برمزها.',
  cancel: 'إلغاء',
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
  // Discussion screens (T9; pending Foundation review)
  composerLabel: 'اكتب مشاركتك',
  sendPost: 'إرسال',
  hourlyLimit: 'بلغت الحد الأقصى من المشاركات في الساعة. حاول لاحقًا.',
  deletePostTitle: 'حذف المشاركة؟',
  deletePostBody: 'ستُحذف مشاركتك نهائيًا.',
  muteConfirmTitle: 'كتم هذا العضو؟',
  muteButton: 'كتم',
  muteDone: 'تم كتم العضو. يمكنك إلغاء الكتم من الإعدادات.',
  // Report sheet (T9; pending Foundation review)
  reportTitle: 'الإبلاغ عن مشاركة',
  reportSubmit: 'إرسال البلاغ',
  reportPickReason: 'اختر سببًا للإبلاغ',
  reportNoteLabel: 'تفاصيل إضافية (اختياري)',
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

/**
 * Group days for a daily wird: «أيام الإنجاز: نحو ١٠ من ٤٠». The server rounds
 * the sum to 10 but not the denominator, so the figure is hedged and clamped
 * rather than reading «١٠ من ٩».
 */
export function daysMetApproxLabel(done: number, total: number): string {
  return `أيام الإنجاز: نحو ${toArabicDigits(Math.min(done, total))} من ${toArabicDigits(total)}`;
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

/** Own khatm label: «صفحاتك: ٣ من ٦٠٤». */
export function ownPagesLabel(done: number, total: number): string {
  return `صفحاتك: ${toArabicDigits(done)} من ${toArabicDigits(total)}`;
}

/** Daily-wird summary: «٥ صفحات يوميًا لمدة ١٠ أيام». n >= 1 for both. */
export function wirdSummary(pagesPerDay: number, days: number): string {
  return `${arabicCount(pagesPerDay, PAGES)} يوميًا لمدة ${arabicCount(days, DAYS)}`;
}

/** Hint under a bounded number field: «من ١ إلى ٦٠٤». */
export function rangeHint(min: number, max: number): string {
  return `من ${toArabicDigits(min)} إلى ${toArabicDigits(max)}`;
}

/** The text a member shares: «انضم إلى مجموعتي «اسم» في تطبيق خزائن الرحمن برمز: ABC123». */
export function shareCodeMessage(name: string, code: string): string {
  return `انضم إلى مجموعتي «${name}» في تطبيق خزائن الرحمن برمز: ${code}`;
}

/** Accessibility label for the code box, spelled letter by letter: «رمز المجموعة A B C 1 2 3». */
export function codeA11y(code: string): string {
  return `رمز المجموعة ${code.split('').join(' ')}`;
}

/** A member's shared khatm figure: «الصفحات: ٣». */
export function memberPagesLabel(n: number): string {
  return `الصفحات: ${toArabicDigits(n)}`;
}

/** A member's shared daily-wird figure: «الأيام: ٣». */
export function memberDaysLabel(n: number): string {
  return `الأيام: ${toArabicDigits(n)}`;
}

/** Entry-row and index subtitle: «٧ نقاشات». Zero has its own copy; 100+ uses the label form. */
export function discussionsLabel(n: number): string {
  if (n <= 0) return COMMUNITY_COPY.noDiscussions;
  return n < 100 ? arabicCount(n, DISCUSSIONS) : `${toArabicDigits(n)} نقاش`;
}

/** Counter text announced near the cap: «الحروف المتبقية: ١٠٠». */
export function charsLeftLabel(n: number): string {
  return `الحروف المتبقية: ${toArabicDigits(Math.max(0, n))}`;
}

/** A post read as one phrase (§10): «{name}، {time}، {status}، {body}». */
export function postA11y(p: {
  name: string;
  time: string;
  status: PostDisplayStatus;
  body: string;
}): string {
  const status =
    p.status === 'pending' ? COMMUNITY_COPY.pendingBadge : p.status === 'hidden' ? COMMUNITY_COPY.hiddenBadge : '';
  return [p.name, p.time, status, p.body].filter(Boolean).join('، ');
}
