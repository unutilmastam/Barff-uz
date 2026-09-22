import { type Messages } from '@/i18n/dictionary';
import { Container } from './Container';

export function Footer({ messages }: { messages: Messages }) {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-[var(--color-line)] py-10">
      <Container
        as="div"
        className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="space-y-1">
          <p className="text-lg font-semibold tracking-tight">BARFF</p>
          {/*
            Kompaniya faktlari (manzil, telefon, sertifikatlar) BARFF
            tasdiqlamaguncha yozilmaydi (CLAUDE.md §1). Ular S10 da
            sozlamalar orqali keladi.
          */}
          <p className="text-sm text-[var(--color-fg-subtle)]">{messages.footer.madeNote}</p>
        </div>

        {/*
          Bu navigatsiya EMAS, shunchaki mualliflik qatori — shuning uchun
          `<nav>` ishlatilmaydi. Noto'g'ri landmark ekran o'quvchida
          mavjud bo'lmagan menyu haqida xabar berardi.
        */}
        <p className="text-sm text-[var(--color-fg-subtle)]">
          © {year} BARFF. {messages.footer.rights}.
        </p>
      </Container>
    </footer>
  );
}
