import { type Metadata } from 'next';
import { notFound } from 'next/navigation';
import { GlassCard, Section } from '@barff/ui';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/States';
import { LeadForm } from '@/components/forms/LeadForm';
import { Container } from '@/components/layout/Container';
import { isLocale } from '@/i18n/config';

import { getMessages } from '@/i18n/dictionary';
import { getPublicSettings } from '@/lib/content';
import { readContact } from '@/lib/settings';
import { buildMetadata } from '@/lib/seo';

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const messages = await getMessages(locale);

  return buildMetadata({
    locale,
    path: '/contact',
    title: messages.contact.title,
    description: messages.contact.subtitle,
  });
}

/**
 * Aloqa sahifasi.
 *
 * Manzil, telefon va email — KOMPANIYA FAKTI (CLAUDE.md §1), shuning
 * uchun ular o'ylab topilmaydi. Ma'lumot CMS sozlamasidan (`site.contact`)
 * keladi; seed'dagi `REPLACE_WITH_REAL_DATA` o'rindoshi esa haqiqiy
 * qiymat deb ko'rsatilmaydi — o'rniga kutilayotgani aytiladi (Q11).
 */
export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const messages = await getMessages(locale);
  const contact = readContact(await getPublicSettings(locale), locale);

  const rows = [
    // `tel:`/`mailto:` — mobil qurilmada bitta bosishda qo'ng'iroq/xat.
    { label: messages.contact.phone, value: contact.phone, href: `tel:${contact.phone ?? ''}` },
    { label: messages.contact.email, value: contact.email, href: `mailto:${contact.email ?? ''}` },
    { label: messages.contact.address, value: contact.address, href: null },
  ].filter((row) => row.value !== null);

  return (
    <>
      <PageHeader eyebrow={messages.contact.subtitle} title={messages.contact.title} />

      <Section>
        <Container>
          {rows.length === 0 ? (
            <EmptyState message={messages.contact.pending} />
          ) : (
            <GlassCard className="p-8">
              <dl className="flex flex-col gap-6">
                {rows.map((row) => (
                  <div
                    key={row.label}
                    className="border-t border-[var(--color-line)] pt-4 first:border-0 first:pt-0"
                  >
                    <dt className="text-sm text-[var(--color-fg-muted)]">{row.label}</dt>
                    <dd className="mt-1 text-lg">
                      {row.href !== null ? (
                        <a href={row.href} className="underline-offset-4 hover:underline">
                          {row.value}
                        </a>
                      ) : (
                        row.value
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </GlassCard>
          )}
        </Container>
      </Section>

      {/*
        Aloqa ma'lumotlari hali tasdiqlanmagan bo'lsa ham, tashrifchi
        murojaat qila olishi kerak — shuning uchun forma shu yerda ham.
        U `/become-partner` dagi bilan BITTA komponent.
      */}
      <Section tone="raised">
        <Container className="max-w-3xl">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {messages.lead.title}
          </h2>
          <p className="mt-3 text-[var(--color-fg-muted)]">{messages.lead.intro}</p>

          <div className="mt-8">
            <LeadForm messages={messages} />
          </div>
        </Container>
      </Section>
    </>
  );
}
