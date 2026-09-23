import { type Metadata } from 'next';
import { notFound } from 'next/navigation';
import { FactorySection } from '@/components/home/FactorySection';
import { HeroSection } from '@/components/home/HeroSection';
import { NewsSection } from '@/components/home/NewsSection';
import { PartnerCta } from '@/components/home/PartnerCta';
import { ProcessSection } from '@/components/home/ProcessSection';
import { ProductsSection } from '@/components/home/ProductsSection';
import { QualitySection } from '@/components/home/QualitySection';
import { StatsSection } from '@/components/home/StatsSection';
import { JsonLd } from '@/components/common/JsonLd';
import { isLocale } from '@/i18n/config';
import { getMessages } from '@/i18n/dictionary';
import { buildMetadata } from '@/lib/seo';
import { organizationJsonLd } from '@/lib/structured-data';
import {
  getCertificates,
  getHomepageSections,
  getLatestNews,
  getProductionSteps,
  getProducts,
} from '@/lib/content';

/**
 * Bosh sahifa (CLAUDE.md §4).
 *
 * Sahifa build paytida tayyorlanadi va `revalidate` muddatidan keyin
 * fonda yangilanadi (ISR). Ya'ni tashrifchi API javobini KUTMAYDI —
 * u tayyor HTML oladi, CMS'dagi o'zgarish esa bir necha daqiqada
 * saytga yetib boradi.
 */
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

  return buildMetadata({
    locale,
    path: '/',
    title: messages.meta.title,
    description: messages.meta.description,
    // Sarlavhada "BARFF" bor — shablon uni takrorlamasin.
    absoluteTitle: true,
  });
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const messages = await getMessages(locale);

  // Bo'limlar bir-biriga bog'liq emas — parallel o'qiladi. Biri
  // kelmasa, qolganlari baribir ko'rsatiladi.
  const [sections, products, steps, certificates, news] = await Promise.all([
    getHomepageSections(locale),
    getProducts(locale, { limit: 8 }),
    getProductionSteps(locale),
    getCertificates(locale),
    getLatestNews(locale, 3),
  ]);

  const section = (key: string) => sections?.find((item) => item.key === key);

  return (
    <>
      {/* Kompaniya ma'lumoti — faqat bosh sahifada, bir marta. */}
      <JsonLd data={organizationJsonLd(locale, messages.meta.description)} />

      <HeroSection locale={locale} messages={messages} section={section('hero')} />
      <StatsSection messages={messages} />
      <FactorySection locale={locale} messages={messages} section={section('factory')} />
      <ProductsSection
        locale={locale}
        messages={messages}
        products={products === null ? null : products.items}
      />
      <ProcessSection locale={locale} messages={messages} steps={steps} />
      <QualitySection locale={locale} messages={messages} certificates={certificates} />
      <PartnerCta locale={locale} messages={messages} section={section('cta')} />
      <NewsSection
        locale={locale}
        messages={messages}
        articles={news === null ? null : news.items}
      />
    </>
  );
}
