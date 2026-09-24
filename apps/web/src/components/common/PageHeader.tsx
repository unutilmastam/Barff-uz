import { Container } from '@/components/layout/Container';
import { TextReveal } from '@/motion/TextReveal';

/**
 * Sahifa sarlavhasi.
 *
 * Har bir ommaviy sahifada bitta `<h1>` bo'lishi uchun shu komponent
 * yagona joyda saqlanadi — sarlavha darajalari qo'lda yozilsa, vaqt
 * o'tib bir-biridan farq qilib ketardi.
 *
 * O'lcham `--text-section` token'idan: sahifa sarlavhasi bosh
 * ekrandagi hero'dan kichik, lekin bo'lim sarlavhalaridan katta.
 * Sarlavha `TextReveal` bilan qatorma-qator ko'tariladi; harakat
 * o'chiq bo'lsa u JOYIDA turadi.
 *
 * PASTKI bo'shliq ATAYLAB yo'q: bu komponentdan keyin har doim
 * `<Section>` keladi va uning `py-20` i o'zining ustki bo'shlig'ini
 * beradi. Ikkalasi ham bo'shliq qo'ysa, sarlavha bilan kontent
 * orasida 200px dan ortiq bo'sh joy qolardi.
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
    <Container as="div" className="pt-20 sm:pt-28">
      <p className="eyebrow">{eyebrow}</p>

      <TextReveal as="h1" immediate className="display-2 mt-4 block">
        {title}
      </TextReveal>

      {intro !== undefined && <p className="lead mt-6 max-w-[48ch]">{intro}</p>}
    </Container>
  );
}
