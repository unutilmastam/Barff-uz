import Link from 'next/link';
import { type Locale, type PublicHomepageSection } from '@barff/types';
import { Button, GlassCard } from '@barff/ui';
import { Container } from '@/components/layout/Container';
import { type Messages } from '@/i18n/dictionary';
import { text } from '@/lib/localized';
import { routeReady } from '@/lib/routes';

/** B2B hamkorlik chaqirig'i (CLAUDE.md §4, 7-bo'lim). */
export function PartnerCta({
  locale,
  messages,
  section,
}: {
  locale: Locale;
  messages: Messages;
  section: PublicHomepageSection | undefined;
}) {
  const title = text(section?.heading, locale, messages.home.ctaTitle);
  const body = text(section?.subheading, locale, messages.home.ctaBody);
  const label = text(section?.ctaLabel, locale, messages.home.ctaAction);
  const href = section?.ctaHref ?? `/${locale}/become-partner`;

  return (
    <section className="py-20 sm:py-28">
      <Container>
        <GlassCard className="flex flex-col gap-6 p-8 sm:p-12 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <h2 className="display-3">{title}</h2>
            <p className="mt-3 text-[var(--color-fg-muted)]">{body}</p>
          </div>

          {/*
            Ariza sahifasi S14 da quriladi. U paydo bo'lgunicha tugma
            KO'RSATILMAYDI — mavjud bo'lmagan yo'lga havola osilgan
            prefetch so'roviga aylanadi (`routes.ts` ga qarang).
          */}
          {routeReady('becomePartner') && (
            <Button asChild size="lg" className="self-start lg:self-auto">
              <Link href={href}>{label}</Link>
            </Button>
          )}
        </GlassCard>
      </Container>
    </section>
  );
}
