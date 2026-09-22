'use client';

import { useEffect } from 'react';
import { Container } from '@/components/layout/Container';
import { uz } from '@/i18n/messages/uz';

/**
 * Xato chegarasi (error boundary).
 *
 * Bu MAJBURIY client komponent, shuning uchun serverdan tarjima ololmaydi
 * va standart tildagi matnni ishlatadi. Tilga bog'lash S15 da.
 *
 * Xatoning ichki tafsiloti foydalanuvchiga KO'RSATILMAYDI — u ichki
 * tuzilmani oshkor qilishi mumkin. Faqat `digest` beriladi: shu kod
 * orqali server loglaridan aniq xatoni topish mumkin.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Kuzatuv tizimiga yuborish S41 da qo'shiladi.
    console.error(error);
  }, [error]);

  return (
    <Container as="section" className="flex min-h-[60vh] flex-col justify-center py-20">
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        {uz.errors.genericTitle}
      </h1>
      <p className="mt-4 max-w-lg text-[var(--color-fg-muted)]">{uz.errors.genericBody}</p>

      {error.digest !== undefined && (
        <p className="mt-2 font-mono text-xs text-[var(--color-fg-subtle)]">{error.digest}</p>
      )}

      <div className="mt-8">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-[var(--color-brand-500)] px-6 py-3 font-medium text-[var(--color-ink-900)] transition-colors hover:bg-[var(--color-brand-400)]"
        >
          {uz.errors.genericCta}
        </button>
      </div>
    </Container>
  );
}
