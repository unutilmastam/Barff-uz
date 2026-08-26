'use client';

import { useId, useState, type FormEvent } from 'react';
import { TextReveal } from '@/components/animation/TextReveal';
import { useLocale } from '@/components/providers/LocaleProvider';
import { CONTACT_ENDPOINT, isContactConfigured, type ContactPayload } from '@/lib/contact';
import { cn } from '@/lib/utils';

type Status = 'idle' | 'loading' | 'success' | 'error';
type Field = keyof ContactPayload;

const EMPTY: ContactPayload = { name: '', phone: '', email: '', message: '' };

const MIN_NAME = 2;
const MIN_MESSAGE = 10;

/** Faqat raqam, bo'shliq va + ( ) - belgilari; kamida 7 ta raqam. */
const PHONE_PATTERN = /^[+\d][\d\s()-]{6,}$/;
/** Oddiy, lekin haqiqiy tekshiruv: bitta @, nuqtali domen. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * To'liq ekran aloqa formasi.
 *
 * Holatlar: `idle → loading → success | error` (spec talabi).
 * Validatsiya yuborishdan oldin klientda bajariladi va xato maydon ostida
 * `aria-describedby` orqali e'lon qilinadi — ekran o'quvchi ham eshitadi.
 *
 * Yuborish manzili `lib/contact.ts` orqali muhit o'zgaruvchisidan olinadi.
 * Sozlanmagan bo'lsa forma soxta "muvaffaqiyat" KO'RSATMAYDI — aniq xabar beradi.
 */
export function ContactSection() {
  const { t } = useLocale();
  const formId = useId();
  const [values, setValues] = useState<ContactPayload>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [status, setStatus] = useState<Status>('idle');

  const fieldId = (field: Field) => `${formId}-${field}`;
  const errorId = (field: Field) => `${formId}-${field}-error`;

  const validate = (data: ContactPayload): Partial<Record<Field, string>> => {
    const next: Partial<Record<Field, string>> = {};

    if (data.name.trim().length < MIN_NAME) {
      next.name = data.name.trim() ? t.contact.tooShort.replace('{min}', String(MIN_NAME)) : t.contact.required;
    }
    if (!data.phone.trim()) next.phone = t.contact.required;
    else if (!PHONE_PATTERN.test(data.phone.trim())) next.phone = t.contact.invalidPhone;

    if (!data.email.trim()) next.email = t.contact.required;
    else if (!EMAIL_PATTERN.test(data.email.trim())) next.email = t.contact.invalidEmail;

    if (data.message.trim().length < MIN_MESSAGE) {
      next.message = data.message.trim()
        ? t.contact.tooShort.replace('{min}', String(MIN_MESSAGE))
        : t.contact.required;
    }

    return next;
  };

  const update = (field: Field, value: string) => {
    setValues((previous) => ({ ...previous, [field]: value }));
    // Foydalanuvchi tuzatishni boshlagach xato darhol yo'qoladi.
    setErrors((previous) => (previous[field] ? { ...previous, [field]: undefined } : previous));
    if (status === 'error' || status === 'success') setStatus('idle');
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      document.getElementById(fieldId(Object.keys(found)[0] as Field))?.focus();
      return;
    }

    if (!isContactConfigured()) {
      setStatus('error');
      return;
    }

    setStatus('loading');
    try {
      const response = await fetch(CONTACT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!response.ok) throw new Error(String(response.status));
      setStatus('success');
      setValues(EMPTY);
    } catch {
      setStatus('error');
    }
  };

  const inputClass = (field: Field) =>
    cn(
      'border-line w-full border-b bg-transparent py-4 text-lg outline-none',
      'transition-colors duration-[--duration-micro] placeholder:text-muted focus:border-foreground',
      errors[field] && 'border-foreground',
    );

  // `wide` — maydon ikkala ustunni egallaydi. Email yonida bo'sh katak qolmasligi uchun.
  const fields: Array<{ field: Field; type: string; autoComplete: string; wide?: boolean }> = [
    { field: 'name', type: 'text', autoComplete: 'name' },
    { field: 'phone', type: 'tel', autoComplete: 'tel' },
    { field: 'email', type: 'email', autoComplete: 'email', wide: true },
  ];

  return (
    <section
      aria-labelledby="contact-title"
      className="container-barff flex min-h-screen flex-col justify-center py-24"
    >
      <TextReveal as="h2" id="contact-title" type="lines" className="text-section mb-12 block">
        {t.sections.contact}
      </TextReveal>

      <form noValidate onSubmit={onSubmit} className="grid gap-8 md:grid-cols-2">
        {fields.map(({ field, type, autoComplete, wide }) => (
          <div key={field} className={cn('flex flex-col', wide && 'md:col-span-2')}>
            <label htmlFor={fieldId(field)} className="text-label text-muted mb-1">
              {t.contact[field]}
            </label>
            <input
              id={fieldId(field)}
              name={field}
              type={type}
              autoComplete={autoComplete}
              value={values[field]}
              onChange={(event) => update(field, event.target.value)}
              aria-invalid={errors[field] ? 'true' : undefined}
              aria-describedby={errors[field] ? errorId(field) : undefined}
              className={inputClass(field)}
            />
            {errors[field] && (
              <p id={errorId(field)} className="text-label mt-2">
                {errors[field]}
              </p>
            )}
          </div>
        ))}

        <div className="flex flex-col md:col-span-2">
          <label htmlFor={fieldId('message')} className="text-label text-muted mb-1">
            {t.contact.message}
          </label>
          <textarea
            id={fieldId('message')}
            name="message"
            rows={4}
            value={values.message}
            onChange={(event) => update('message', event.target.value)}
            aria-invalid={errors.message ? 'true' : undefined}
            aria-describedby={errors.message ? errorId('message') : undefined}
            className={cn(inputClass('message'), 'resize-y')}
          />
          {errors.message && (
            <p id={errorId('message')} className="text-label mt-2">
              {errors.message}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-6 md:col-span-2">
          <button
            type="submit"
            disabled={status === 'loading'}
            data-cursor="open"
            className="bg-primary text-primary-foreground text-label h-14 rounded-full px-10 transition-opacity duration-[--duration-micro] hover:opacity-85 disabled:pointer-events-none disabled:opacity-50"
          >
            {status === 'loading' ? t.contact.sending : t.contact.submit}
          </button>

          {/* Holat xabari — `role="status"` tufayli ekran o'quvchi o'qiydi. */}
          <p role="status" aria-live="polite" className="text-sm">
            {status === 'success' && t.contact.success}
            {status === 'error' &&
              (isContactConfigured() ? t.contact.error : t.contact.notConfigured)}
          </p>
        </div>
      </form>
    </section>
  );
}
