'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLayoutEffect, useRef } from 'react';
import { Reveal } from '@/components/animation/Reveal';
import { TextReveal } from '@/components/animation/TextReveal';
import { ProductCard } from '@/components/products/ProductCard';
import { useLocale } from '@/components/providers/LocaleProvider';
import { getCategoryById } from '@/data/categories';
import { getRelatedProducts } from '@/data/products';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { CONTENT_PENDING } from '@/lib/content';
import { gsap } from '@/lib/gsap';
import { EASE, HERO_PRODUCT } from '@/lib/motion';
import type { Product } from '@/lib/types';

/**
 * Ingredient/meva belgilarining mahsulot atrofidagi joylashuvi (%).
 *
 * Ro'yxat QAT'IY 6 ta bilan cheklangan: spec "ekran to'lib ketmasin" deydi.
 * Nuqtalar mahsulotning chap va o'ng chekkasida — markaz (mahsulotning o'zi) bo'sh qoladi.
 */
const ORBIT = [
  { x: 4, y: 10 },
  { x: 78, y: 6 },
  { x: 0, y: 44 },
  { x: 84, y: 42 },
  { x: 8, y: 76 },
  { x: 76, y: 74 },
] as const;

const MAX_ORBIT = ORBIT.length;

interface ProductDetailsProps {
  product: Product;
}

/**
 * Mahsulot sahifasi: hero → TARKIBI → OZUQAVIY QIYMATI → QADOQ → O'XSHASH MAHSULOTLAR.
 *
 * Hero'da mahsulot kursorga reaksiya qiladi (`mouseX → rotateY`, `mouseY → rotateX`),
 * ingredientlar esa uning ATROFIDA aylana bo'ylab joylashadi — markaz bo'sh qoladi,
 * shuning uchun mahsulot hech qachon bosilib qolmaydi (11-qoida).
 *
 * Tarkib, kaloriya va qadoq — mahsulot DA'VOLARI. Ular bo'sh bo'lsa o'ylab topilmaydi:
 * o'rniga `[CLIENT CONTENT REQUIRED]` ko'rinadi.
 */
export function ProductDetails({ product }: ProductDetailsProps) {
  const heroRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const { locale, t } = useLocale();

  const category = getCategoryById(product.categoryId);
  const related = getRelatedProducts(product);

  // Atrofdagi belgilar: ingredient bo'lsa — o'sha, bo'lmasa mahsulotning mevalari.
  const orbitItems = (product.ingredients?.length
    ? product.ingredients.map((label, index) => ({ key: `ing-${index}`, label, image: undefined }))
    : (product.fruits ?? []).map((fruit, index) => ({
        key: `fruit-${index}`,
        label: undefined,
        image: fruit.src,
      }))
  ).slice(0, MAX_ORBIT);

  useLayoutEffect(() => {
    const root = heroRef.current;
    if (!root || prefersReducedMotion) return;

    const context = gsap.context(() => {
      const media = gsap.matchMedia();
      media.add('(hover: hover) and (pointer: fine)', () => {
        const tilt = root.querySelector<HTMLElement>('[data-detail-tilt]');
        if (!tilt) return;

        const rotateY = gsap.quickTo(tilt, 'rotationY', {
          duration: HERO_PRODUCT.tiltSmoothing,
          ease: EASE.out3,
        });
        const rotateX = gsap.quickTo(tilt, 'rotationX', {
          duration: HERO_PRODUCT.tiltSmoothing,
          ease: EASE.out3,
        });

        const onMove = (event: MouseEvent) => {
          const bounds = root.getBoundingClientRect();
          const x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
          const y = ((event.clientY - bounds.top) / bounds.height) * 2 - 1;
          rotateY(gsap.utils.clamp(-1, 1, x) * HERO_PRODUCT.tiltMax);
          rotateX(gsap.utils.clamp(-1, 1, -y) * HERO_PRODUCT.tiltMax);
        };

        root.addEventListener('mousemove', onMove);
        return () => root.removeEventListener('mousemove', onMove);
      });
    }, root);

    return () => context.revert();
  }, [prefersReducedMotion]);

  const pending = <span className="text-muted text-label">{CONTENT_PENDING}</span>;

  return (
    <main className="pt-32 pb-24 md:pt-40">
      <div className="container-barff">
        <Link href="/products" className="text-label text-muted hover:text-foreground">
          ← {t.product.backToProducts}
        </Link>
      </div>

      {/* HERO */}
      <section
        ref={heroRef}
        className="container-barff mt-8 grid items-center gap-12 md:grid-cols-[1fr_1fr]"
      >
        <div className="flex flex-col gap-5">
          {category && <span className="text-label text-muted">{category.title[locale]}</span>}
          <TextReveal as="h1" type="lines" className="text-section block">
            {product.name[locale]}
          </TextReveal>
          {product.tagline && <p className="text-title">{product.tagline[locale]}</p>}
          <p className="text-body text-muted max-w-[46ch]">{product.description[locale]}</p>
        </div>

        <div className="relative grid aspect-square place-items-center">
          <div
            aria-hidden="true"
            className="absolute aspect-square w-[70%] rounded-full blur-3xl"
            style={{ backgroundColor: `${product.color}33` }}
          />

          {/* Ingredientlar/mevalar mahsulot ATROFIDA — markaz bo'sh. */}
          {orbitItems.map((item, index) => (
            <span
              key={item.key}
              className="absolute grid w-[22%] place-items-center"
              style={{ left: `${ORBIT[index].x}%`, top: `${ORBIT[index].y}%` }}
            >
              {item.image ? (
                <Image
                  src={item.image}
                  alt=""
                  aria-hidden="true"
                  width={320}
                  height={320}
                  sizes="120px"
                  className="h-auto w-full object-contain"
                />
              ) : (
                <span className="border-line text-label rounded-full border bg-background px-3 py-1.5 text-center">
                  {item.label}
                </span>
              )}
            </span>
          ))}

          {product.image && (
            <div data-detail-tilt className="relative [perspective:1200px] [transform-style:preserve-3d]">
              <Image
                src={product.image.src}
                alt={product.image.alt}
                width={product.image.width ?? 400}
                height={product.image.height ?? 720}
                priority
                sizes="(max-width: 768px) 60vw, 30vw"
                className="h-[clamp(16rem,44vh,28rem)] w-auto object-contain drop-shadow-2xl"
              />
            </div>
          )}
        </div>
      </section>

      {/* TARKIBI / OZUQAVIY QIYMATI / QADOQ */}
      <Reveal as="section" className="container-barff mt-24 grid gap-12 md:grid-cols-3">
        <div className="border-line flex flex-col gap-4 border-t pt-6">
          <h2 className="text-label">{t.product.ingredients}</h2>
          {product.ingredients?.length ? (
            <ul className="flex flex-col gap-2">
              {product.ingredients.map((item) => (
                <li key={item} className="text-body">
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            pending
          )}
        </div>

        <div className="border-line flex flex-col gap-4 border-t pt-6">
          <h2 className="text-label">{t.product.nutrition}</h2>
          {product.nutrition?.length ? (
            <dl className="flex flex-col gap-2">
              {product.nutrition.map((fact) => (
                <div key={fact.label} className="border-line flex justify-between border-b pb-2">
                  <dt className="text-muted text-sm">{fact.label}</dt>
                  <dd className="text-sm tabular-nums">{fact.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            pending
          )}
        </div>

        <div className="border-line flex flex-col gap-4 border-t pt-6">
          <h2 className="text-label">{t.product.packaging}</h2>
          {product.packaging?.length ? (
            <ul className="flex flex-col gap-2">
              {product.packaging.map((pack) => (
                <li key={pack.volume} className="text-body">
                  {pack.volume}
                  {pack.material && <span className="text-muted"> · {pack.material}</span>}
                </li>
              ))}
            </ul>
          ) : (
            pending
          )}
        </div>
      </Reveal>

      {/* O'XSHASH MAHSULOTLAR */}
      {related.length > 0 && (
        <section className="container-barff mt-24">
          <h2 className="text-label text-muted mb-8">{t.product.related}</h2>
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:gap-6">
            {related.map((item) => (
              <li key={item.id} className="flex">
                <ProductCard product={item} className="w-full" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
