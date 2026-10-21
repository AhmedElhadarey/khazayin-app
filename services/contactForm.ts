/**
 * services/contactForm.ts
 * -----------------------
 * Contact-form validation, Figma node 2106:2598.
 *
 * The rule is unchanged from before this track — all three fields must hold
 * something other than whitespace — but it now lives outside the screen so
 * `__tests__/moreDetailPresentation.test.ts` can assert it without a renderer.
 */

export type ContactFormFields = {
  name: string;
  email: string;
  message: string;
};

/** Alert copy for a submit attempt with a missing field. */
export const CONTACT_INCOMPLETE_ALERT = Object.freeze({
  title: 'البيانات ناقصة',
  body: 'يرجى ملء جميع الحقول.',
} as const);

/** Alert copy for an accepted submission. */
export const CONTACT_SENT_ALERT = Object.freeze({
  title: 'تم الإرسال',
  body: 'سنعود إليك قريباً إن شاء الله.',
} as const);

/** True when every field carries non-whitespace content. */
export function isContactFormComplete(fields: ContactFormFields): boolean {
  return (
    fields.name.trim().length > 0 &&
    fields.email.trim().length > 0 &&
    fields.message.trim().length > 0
  );
}
