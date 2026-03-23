import { Category, Resource, Banner, Channel, Scholar, BookItem, DawahDesign, QuickAccessItem } from '../types';

export const MOCK_CATEGORIES: Category[] = [
  {
    id: 'cat-8',
    name: 'القرآن حياة',
    description: 'تلاوات وتفسير وعلوم القرآن الكريم',
    parentId: null,
    childrenCount: 114,
    icon: 'book',
  },
  {
    id: 'cat-5',
    name: 'رسول الله',
    description: 'السيرة النبوية والشمائل المحمدية',
    parentId: null,
    childrenCount: 10,
    icon: 'star',
  },
  {
    id: 'cat-3',
    name: 'الحديث والسنّة',
    description: 'كتب الحديث النبوي الشريف وشروحاته',
    parentId: null,
    childrenCount: 15,
    icon: 'document-text',
  },
  {
    id: 'cat-1',
    name: 'العقيدة',
    description: 'كتب التوحيد والعقيدة الإسلامية',
    parentId: null,
    childrenCount: 12,
    icon: 'shield-checkmark',
  },
  {
    id: 'cat-6',
    name: 'أدب طالب العلم',
    description: 'كتب الآداب الشرعية والتزكية',
    parentId: null,
    childrenCount: 20,
    icon: 'school',
  },
  {
    id: 'cat-7',
    name: 'كتب مسموعة',
    description: 'الكتب الصوتية والمحاضرات المسجلة',
    parentId: null,
    childrenCount: 30,
    icon: 'headset',
  },
  {
    id: 'cat-9',
    name: 'كتب متنوعة',
    description: 'كتب متنوعة في مواضيع إسلامية مختلفة',
    parentId: null,
    childrenCount: 25,
    icon: 'library',
  },
  // Sub-categories
  { id: 'cat-3-1', name: 'شروح الحديث', parentId: 'cat-3', childrenCount: 5 },
  { id: 'cat-3-2', name: 'المتون', parentId: 'cat-3', childrenCount: 8 },
  { id: 'cat-3-3', name: 'مصطلح الحديث', parentId: 'cat-3', childrenCount: 3 },
  { id: 'cat-8-1', name: 'تفسير ابن كثير', parentId: 'cat-8', childrenCount: 4 },
  { id: 'cat-8-2', name: 'تفسير السعدي', parentId: 'cat-8', childrenCount: 1 },
];

export const MOCK_RESOURCES: Resource[] = [
  {
    id: 'res-1',
    title: 'تيسير الكريم الرحمن في تفسير كلام المنان',
    categoryId: 'cat-8',
    author: 'عبد الرحمن بن ناصر السعدي',
    description: 'تفسير مبسط وشامل للقرآن الكريم يتميز بوضوح العبارة وسلامة المعتقد.',
    fileUrl: 'https://example.com/saadi.pdf',
    fileType: 'pdf',
    sizeBytes: 15000000,
    createdAt: '2025-01-01T10:00:00Z',
  },
  {
    id: 'res-2',
    title: 'الرحيق المختوم',
    categoryId: 'cat-5',
    author: 'صفي الرحمن المباركفوري',
    description: 'بحث في السيرة النبوية على صاحبها أفضل الصلاة والسلام.',
    fileUrl: 'https://example.com/raheeq.pdf',
    fileType: 'pdf',
    sizeBytes: 12000000,
  },
  {
    id: 'res-3',
    title: 'كتاب التوحيد',
    categoryId: 'cat-1',
    author: 'محمد بن عبد الوهاب',
    description: 'في بيان عقيدة التوحيد وما ينافيها.',
    fileUrl: 'https://example.com/tawheed.pdf',
    fileType: 'pdf',
    sizeBytes: 5000000,
  },
  {
    id: 'res-4',
    title: 'الأربعون النووية',
    categoryId: 'cat-3',
    author: 'يحيى بن شرف النووي',
    description: 'أربعون حديثا تتضمن جوامع الكلم من أحاديث الرسول صلى الله عليه وسلم.',
    fileUrl: 'https://example.com/nawawi.pdf',
    fileType: 'pdf',
    sizeBytes: 2000000,
  },
  {
    id: 'res-5',
    title: 'مدارج السالكين',
    categoryId: 'cat-6',
    author: 'ابن قيم الجوزية',
    description: 'كتاب في الرقائق وتزكية النفس.',
    fileUrl: 'https://example.com/madarij.pdf',
    fileType: 'pdf',
    sizeBytes: 18000000,
  },
  {
    id: 'res-6',
    title: 'آداب الدعاء',
    categoryId: 'cat-7',
    author: 'الشيخ عبد المحسن العباد',
    description: 'شرح آداب الدعاء وأوقات الإجابة.',
    fileUrl: 'https://example.com/dua.mp3',
    fileType: 'audio',
    durationMinutes: 32,
  },
  {
    id: 'res-7',
    title: 'شرح الأربعين النووية',
    categoryId: 'cat-7',
    author: 'الشيخ صالح الفوزان',
    description: 'شرح مفصل للأربعين النووية.',
    fileUrl: 'https://example.com/arbaeen.mp3',
    fileType: 'audio',
    durationMinutes: 45,
  },
  {
    id: 'res-8',
    title: 'شرح كتاب التوحيد',
    categoryId: 'cat-7',
    author: 'الشيخ صالح الفوزان',
    description: 'شرح مبسط لكتاب التوحيد.',
    fileUrl: 'https://example.com/tawheed-audio.mp3',
    fileType: 'audio',
    durationMinutes: 60,
  },
  {
    id: 'res-9',
    title: 'رياض الصالحين',
    categoryId: 'cat-3',
    author: 'يحيى بن شرف النووي',
    description: 'كتاب جامع لأحاديث الأحكام والآداب والرقائق.',
    fileUrl: 'https://example.com/riyad.pdf',
    fileType: 'pdf',
    sizeBytes: 10000000,
  },
  {
    id: 'res-10',
    title: 'زاد المعاد في هدي خير العباد',
    categoryId: 'cat-5',
    author: 'ابن قيم الجوزية',
    description: 'كتاب شامل في السيرة النبوية وهدي النبي صلى الله عليه وسلم.',
    fileUrl: 'https://example.com/zad.pdf',
    fileType: 'pdf',
    sizeBytes: 20000000,
  },
];

export const MOCK_BANNERS: Banner[] = [
  {
    id: 'banner-1',
    title: 'القرآن حــياة',
    subtitle: 'ابدأ ورد القرآن اليومي',
    linkType: 'category',
    linkId: 'cat-8',
    backgroundColor: '#1B3A5C',
  },
  {
    id: 'banner-2',
    title: 'اعرف نبيّك',
    subtitle: 'السيرة النبوية العطرة',
    linkType: 'category',
    linkId: 'cat-5',
    backgroundColor: '#C7A254',
  },
  {
    id: 'banner-3',
    title: 'الحديث والسنّة',
    subtitle: 'جوامع الكلم النبوية',
    linkType: 'category',
    linkId: 'cat-3',
    backgroundColor: '#1B3A5C',
  },
];

export const MOCK_CHANNELS: Channel[] = [
  {
    id: 'ch-1',
    name: 'برنامج نور على الدرب',
    description: 'فتاوى العلماء وأسئلة المشاهدين',
    subscriberCount: 5200,
  },
  {
    id: 'ch-2',
    name: 'rawdah.tv',
    description: 'القناة الدينية التعليمية',
    subscriberCount: 12000,
  },
  {
    id: 'ch-3',
    name: 'جامعة الإمامين',
    description: 'الدروس والمحاضرات العلمية والمنهجية',
    subscriberCount: 8500,
  },
];

export const MOCK_SCHOLARS: Scholar[] = [
  { id: 'sch-1', name: 'ابن باز', title: 'الشيخ' },
  { id: 'sch-2', name: 'ابن عثيمين', title: 'الشيخ' },
  { id: 'sch-3', name: 'الألباني', title: 'الشيخ' },
  { id: 'sch-4', name: 'صالح الفوزان', title: 'الشيخ' },
  { id: 'sch-5', name: 'عبد المحسن العباد', title: 'الشيخ' },
];

export const MOCK_BOOKS: BookItem[] = [
  { id: 'book-1', title: 'إضاءات في العقيدة', categoryId: 'cat-1' },
  { id: 'book-2', title: 'شرح كتاب التوحيد', categoryId: 'cat-1' },
  { id: 'book-3', title: 'فقه العبادات', categoryId: 'cat-9' },
  { id: 'book-4', title: 'أصول التفسير', categoryId: 'cat-8' },
];

export const MOCK_DESIGNS: DawahDesign[] = [
  { id: 'design-1', title: 'هدايات رمضانية' },
  { id: 'design-2', title: 'موعظة الصباح' },
  { id: 'design-3', title: 'ليلة القدر دعاء' },
  { id: 'design-4', title: 'أذكار المساء' },
  { id: 'design-5', title: 'فضل الصدقة' },
];

export const MOCK_QUICK_ACCESS: QuickAccessItem[] = [
  { id: 'qa-1', label: 'حصريات خزائن الرحمن', icon: 'diamond' },
  { id: 'qa-2', label: 'برامج إذاعية', icon: 'radio' },
  { id: 'qa-3', label: 'كتب صوتية', icon: 'headset' },
];
