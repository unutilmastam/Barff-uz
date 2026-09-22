import { Container } from '@/components/layout/Container';

/**
 * Yuklanish holati.
 *
 * Matn `aria-live` bilan e'lon qilinadi — ekran o'quvchi foydalanuvchisi
 * ham sahifa yuklanayotganini biladi. Faqat aylanuvchi belgi qo'yilsa,
 * u hech narsa eshitmas edi.
 */
export default function Loading() {
  return (
    <Container as="section" className="flex min-h-[70vh] items-center py-20">
      <div className="w-full max-w-3xl space-y-6" aria-hidden="true">
        <div className="h-16 w-3/4 animate-pulse rounded-lg bg-[var(--color-ink-700)]" />
        <div className="h-16 w-1/2 animate-pulse rounded-lg bg-[var(--color-ink-700)]" />
        <div className="h-6 w-2/3 animate-pulse rounded bg-[var(--color-ink-700)]" />
      </div>
      <span className="sr-only" role="status" aria-live="polite">
        …
      </span>
    </Container>
  );
}
