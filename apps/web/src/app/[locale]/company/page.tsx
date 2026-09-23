import { type Metadata } from 'next';
import { notFound } from 'next/navigation';
import { GlassCard, Section, SectionHeader, StatBlock } from '@barff/ui';
import { Container } from '@/components/layout/Container';
import { isLocale } from '@/i18n/config';
import { getMessages } from '@/i18n/dictionary';
import { PENDING_VALUE } from '@/lib/mock-data';

/**
 * ISR muddati (soniya).
 *
 * Bu yerda ANIQ son turishi shart: Next segment sozlamalarini build
 * paytida STATIK tahlil qiladi va o'zgaruvchiga havolani tushunmaydi
 * ("Unknown identifier" xatosi). `CONTENT_REVALIDATE_SECONDS` bilan bir
 * xil qiymat — ikkalasi `content.ts` dagi izohda bog'langan.
 */
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const messages = await getMessages(locale);

  return {
    title: messages.company.title,
    description: messages.company.intro,
    alternates: { canonical: `/${locale}/company` },
  };
}

/**
 * Kompaniya sahifasi.
 *
 * CLAUDE.md §1: BARFF haqidagi faktlar O'YLAB TOPILMAYDI. Shuning
 * uchun bu yerda faqat yondashuv va tamoyillar bor — ular kompaniya
 * emas, LOYIHA qarorlari. Raqamlar esa `MOCK` belgisi bilan bo'sh
 * turadi va BARFF tasdiqlagach to'ldiriladi.
 */
export default async function CompanyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const messages = await getMessages(locale);

  const values = [
    { title: messages.company.valueQuality, body: messages.company.valueQualityBody },
    { title: messages.company.valueTransparency, body: messages.company.valueTransparencyBody },
    { title: messages.company.valuePartnership, body: messages.company.valuePartnershipBody },
  ];

  return (
    <>
      <Section>
        <Container>
          <p className="text-sm font-medium tracking-widest text-[var(--color-brand-400)] uppercase">
            {messages.company.subtitle}
          </p>

          <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            {messages.company.title}
          </h1>

          <p className="mt-6 max-w-2xl text-lg text-[var(--color-fg-muted)]">
            {messages.company.intro}
          </p>
        </Container>
      </Section>

      <Section tone="raised">
        <Container>
          <SectionHeader
            title={messages.company.missionTitle}
            description={messages.company.missionBody}
          />

          <StatBlock
            className="mt-12"
            unverifiedLabel={messages.common.mockBadge}
            stats={[
              { value: PENDING_VALUE, label: messages.home.statFounded, unverified: true },
              { value: PENDING_VALUE, label: messages.home.statCapacity, unverified: true },
              { value: PENDING_VALUE, label: messages.home.statProducts, unverified: true },
              { value: PENDING_VALUE, label: messages.home.statRegions, unverified: true },
            ]}
          />

          <p className="mt-8 max-w-2xl text-sm text-[var(--color-fg-muted)]">
            {messages.common.mockNotice}
          </p>
        </Container>
      </Section>

      <Section>
        <Container>
          <SectionHeader title={messages.company.valuesTitle} />

          <ul className="mt-12 grid gap-4 sm:grid-cols-3">
            {values.map((value) => (
              <GlassCard as="li" key={value.title} className="flex flex-col gap-3 p-6">
                <h3 className="text-lg font-medium">{value.title}</h3>
                <p className="text-sm text-[var(--color-fg-muted)]">{value.body}</p>
              </GlassCard>
            ))}
          </ul>
        </Container>
      </Section>
    </>
  );
}
