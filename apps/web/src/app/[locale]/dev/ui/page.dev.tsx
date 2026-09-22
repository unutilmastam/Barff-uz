import { Container } from '@/components/layout/Container';
import { UiGallery } from './UiGallery';

/**
 * Dizayn tizimini ko'zdan kechirish sahifasi (ROADMAP S07).
 *
 * Fayl nomi `page.dev.tsx`, `page.tsx` emas. `next.config.ts` bu
 * kengaytmani FAQAT ishlab chiqish rejimida sahifa deb tanidadi, ya'ni
 * production build'da bu marshrut umuman mavjud bo'lmaydi.
 *
 * Avval bu yerda `NODE_ENV` tekshiruvi turardi va u yetarli emasdi:
 * sahifa baribir qurilib, `notFound()` chaqirilgan bo'lsa ham javob
 * `200` bilan qaytardi.
 *
 * Storybook o'rniga shu yo'l tanlangan: u qo'shimcha qurish zanjirisiz
 * ishlaydi va komponentlarni AYNAN ilova muhitida — o'sha Tailwind
 * qatlamlari va tokenlar bilan — ko'rsatadi.
 *
 * Bu sahifadagi matnlar tarjima qilinmagan: u foydalanuvchiga emas,
 * dasturchiga mo'ljallangan va reliz tasviriga umuman tushmaydi.
 */
export default function DevUiPage() {
  return (
    <Container as="div" className="py-16">
      <h1 className="text-4xl font-semibold tracking-tight">Dizayn tizimi</h1>
      <p className="mt-3 text-[var(--color-fg-muted)]">
        @barff/ui — primitivlar va yuzalar. Faqat ishlab chiqish rejimida.
      </p>

      <UiGallery />
    </Container>
  );
}
