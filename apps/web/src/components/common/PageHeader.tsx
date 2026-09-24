import { Container } from '@/components/layout/Container';

/**
 * Sahifa sarlavhasi.
 *
 * Har bir ommaviy sahifada bitta `<h1>` bo'lishi uchun shu komponent
 * yagona joyda saqlanadi — sarlavha darajalari qo'lda yozilsa, vaqt
 * o'tib bir-biridan farq qilib ketardi.
 */
export function PageHeader({
  eyebrow,
  title,
  intro,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
}) {
  return (
    <Container as="div" className="pt-20 pb-12 sm:pt-28">
      <p className="text-sm font-medium tracking-widest text-[var(--color-accent-text)] uppercase">
        {eyebrow}
      </p>

      <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
        {title}
      </h1>

      {intro !== undefined && (
        <p className="mt-6 max-w-2xl text-lg text-[var(--color-fg-muted)]">{intro}</p>
      )}
    </Container>
  );
}
