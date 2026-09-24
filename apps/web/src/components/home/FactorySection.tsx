import { type Locale, type PublicHomepageSection } from '@barff/types';
import { MediaFrame, Section, SectionHeader } from '@barff/ui';
import { ApiImage } from '@/components/media/ApiImage';
import { Container } from '@/components/layout/Container';
import { type Messages } from '@/i18n/dictionary';
import { text } from '@/lib/localized';
import { ImageReveal } from '@/motion/ImageReveal';
import { Reveal } from '@/motion/Reveal';
import { TextReveal } from '@/motion/TextReveal';

/** Zavod va texnologiya. Rasm bo'lmasa bo'lim matn bilan ishlaydi. */
export function FactorySection({
  locale,
  messages,
  section,
}: {
  locale: Locale;
  messages: Messages;
  section: PublicHomepageSection | undefined;
}) {
  const title = text(section?.heading, locale, messages.home.factoryTitle);
  const body = text(section?.subheading, locale, messages.home.factoryBody);

  return (
    <Section>
      <Container className="grid gap-12 lg:grid-cols-2 lg:items-center">
        <Reveal>
          <SectionHeader
            eyebrow={messages.home.factoryEyebrow}
            title={<TextReveal as="span">{title}</TextReveal>}
            description={body}
          />
        </Reveal>

        {section?.image != null && (
          /*
            Rasm `clip-path` bilan pastdan ochiladi va bir vaqtda
            `scale 1.15` dan `1` ga tushadi. Harakat o'chiq bo'lsa u
            shunchaki joyida turadi.
          */
          <ImageReveal>
            <MediaFrame ratio="landscape">
              <ApiImage
                image={section.image}
                alt={title}
                sizes="(max-width: 1024px) 90vw, 560px"
                className="h-full w-full object-cover"
              />
            </MediaFrame>
          </ImageReveal>
        )}
      </Container>
    </Section>
  );
}
