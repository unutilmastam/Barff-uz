import { type Locale, type PublicProduct } from '@barff/types';
import { Container } from '@/components/layout/Container';
import { type Messages } from '@/i18n/dictionary';
import { stageItems } from '@/lib/stage';
import { BottleStage3D } from '@/motion/BottleStage3D';

/**
 * 3D shisha karuseli (BARFF'ning haqiqiy fotosuratlari) — banner ostida.
 *
 * Kamida 3 ta mahsulot bo'lmasa, lavha chizilmaydi (bo'sh joy qoldirmaydi).
 */
export function ProductStageSection({
  locale,
  messages,
  products,
}: {
  locale: Locale;
  messages: Messages;
  products: PublicProduct[] | null;
}) {
  const stage = products === null ? [] : stageItems(products, locale);

  if (stage.length < 3) return null;

  return (
    <section className="overflow-x-clip border-b border-[var(--color-line)] py-12 md:py-16">
      <Container as="div">
        <div className="mx-auto max-w-3xl">
          <BottleStage3D
            items={stage}
            labels={{
              region: messages.home.stageRegion,
              prev: messages.home.stagePrev,
              next: messages.home.stageNext,
              open: messages.home.stageOpen,
              counter: messages.home.stageCounter,
            }}
          />
        </div>
      </Container>
    </section>
  );
}
