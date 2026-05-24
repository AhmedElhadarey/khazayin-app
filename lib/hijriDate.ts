// Returns today's Hijri date in Arabic, e.g. "١٧ ذو القعدة ١٤٤٧ هـ".
// Uses umm-al-qura via Intl when available; falls back to a static
// snapshot if the device locale data is missing (e.g. some Hermes builds
// without ICU data).

const FALLBACK = '١٧ ذو القعدة ١٤٤٧ هـ';

export function todayHijriArabic(date: Date = new Date()): string {
  try {
    const fmt = new Intl.DateTimeFormat(
      'ar-SA-u-ca-islamic-umalqura-nu-arab',
      {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      },
    );
    const parts = fmt.formatToParts(date);
    const day = parts.find((p) => p.type === 'day')?.value ?? '';
    const month = parts.find((p) => p.type === 'month')?.value ?? '';
    const year = parts.find((p) => p.type === 'year')?.value ?? '';
    if (!day || !month || !year) return FALLBACK;
    return `${day} ${month} ${year} هـ`;
  } catch {
    return FALLBACK;
  }
}
