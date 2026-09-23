import { Container } from '@/components/layout/Container';

/**
 * Yuklanish holati — FAQAT dinamik sahifalarda.
 *
 * NEGA til ildizida emas: `loading.tsx` Suspense chegarasini yaratadi,
 * ya'ni server avval o'rindoshni, keyin kontentni yuboradi. Statik
 * sahifalarda bu almashinuv MAKON SURILISHIGA olib keladi — o'lchab
 * ko'rildi, CLS 0.2278 (har 10 yuklashning birida). Statik sahifada
 * o'rindoshdan foyda ham yo'q: HTML allaqachon tayyor.
 *
 * Dinamik sahifada (yangi mahsulot yoki maqola birinchi marta
 * so'ralganda) esa o'rindosh KERAK: aks holda foydalanuvchi bo'sh
 * ekranni ko'rib turadi.
 *
 * Matn `aria-live` bilan e'lon qilinadi — ekran o'quvchi foydalanuvchisi
 * ham sahifa yuklanayotganini biladi.
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
