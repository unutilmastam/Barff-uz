'use client';

import Image from 'next/image';
import { useLayoutEffect, useRef } from 'react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { getFeaturedProducts } from '@/data/products';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { DURATION, EASE } from '@/lib/motion';

const CLIP_HIDDEN = 'inset(12% 0% 12% 0%)';
const CLIP_SHOWN = 'inset(0% 0% 0% 0%)';

/**
 * Mahsulot ko'rgazmasi.
 *
 * Bo'lim pin qilinadi va scroll bo'ylab mahsulot, fon rangi, meva va typography
 * ketma-ket almashadi. O'tish keskin kesish EMAS: crossfade + scale + yengil burilish +
 * clip-path bir timeline'da birga ishlaydi.
 *
 * Barcha ma'lumot `data/products.ts` dan — komponent ichida hech narsa hardcode qilinmagan.
 * `prefers-reduced-motion` yoqilganda pin va o'tishlar o'chadi, mahsulotlar oddiy
 * vertikal ro'yxat bo'lib qoladi.
 */
export function ProductShowcase() {
  const rootRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const { locale, t } = useLocale();
  const products = getFeaturedProducts();

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion || products.length < 2) return;

    const context = gsap.context(() => {
      const slides = gsap.utils.toArray<HTMLElement>('[data-showcase-slide]');
      if (slides.length < 2) return;

      // Birinchi slayd ko'rinadi, qolganlari kutadi.
      gsap.set(slides, { autoAlpha: 0, clipPath: CLIP_HIDDEN, scale: 0.92, rotate: -4 });
      gsap.set(slides[0], { autoAlpha: 1, clipPath: CLIP_SHOWN, scale: 1, rotate: 0 });

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: root,
          start: 'top top',
          // Har mahsulotga bitta ekran balandligi.
          end: () => `+=${window.innerHeight * (slides.length - 1)}`,
          pin: true,
          scrub: true,
          snap: {
            snapTo: 1 / (slides.length - 1),
            duration: { min: 0.2, max: DURATION.ui },
            ease: EASE.out3,
          },
          invalidateOnRefresh: true,
        },
      });

      slides.forEach((slide, index) => {
        if (index === 0) return;
        const previous = slides[index - 1];

        timeline
          .to(
            previous,
            { autoAlpha: 0, clipPath: CLIP_HIDDEN, scale: 0.92, rotate: 4, ease: EASE.inOut3 },
            index - 1,
          )
          .to(
            slide,
            { autoAlpha: 1, clipPath: CLIP_SHOWN, scale: 1, rotate: 0, ease: EASE.inOut3 },
            index - 1,
          );
      });
    }, root);

    const onLoad = () => ScrollTrigger.refresh();
    window.addEventListener('load', onLoad);

    return () => {
      window.removeEventListener('load', onLoad);
      context.revert();
    };
  }, [prefersReducedMotion, products.length]);

  if (products.length === 0) return null;

  return (
    <section aria-labelledby="showcase-title" className="overflow-hidden">
      <h2 id="showcase-title" className="sr-only">
        {t.sections.showcase}
      </h2>

      {/* Pin AYNAN shu blokka biriktiriladi — u flex konteynerning bevosita farzandi emas,
          aks holda GSAP pin-spacer'ga padding qo'sha olmaydi va pin tugamay qoladi. */}
      <div ref={rootRef} className="relative flex min-h-screen flex-col justify-center py-24">
        <div className="container-barff relative">
          {products.map((product, index) => (
            <div
              key={product.id}
              data-showcase-slide
              // Birinchisidan keyingilari ustma-ust turadi — pin ichida bitta joyda almashadi.
              className={index === 0 ? 'relative' : 'absolute inset-0'}
            >
              <div className="grid items-center gap-10 md:grid-cols-[1fr_1fr]">
                <div className="flex flex-col gap-5">
                  <span className="text-label text-muted tabular-nums">
                    {String(index + 1).padStart(2, '0')} / {String(products.length).padStart(2, '0')}
                  </span>
                  <p className="text-section" style={{ color: product.color }}>
                    {product.name[locale]}
                  </p>
                  {product.tagline && <p className="text-title">{product.tagline[locale]}</p>}
                  <p className="text-body text-muted max-w-[44ch]">{product.description[locale]}</p>
                </div>

                <div className="relative grid place-items-center">
                  <div
                    aria-hidden="true"
                    className="absolute aspect-square w-[min(70vw,26rem)] rounded-full blur-3xl"
                    style={{ backgroundColor: `${product.color}33` }}
                  />
                  {product.fruits?.map((fruit, fruitIndex) => (
                    <Image
                      key={fruit.src}
                      src={fruit.src}
                      alt=""
                      aria-hidden="true"
                      width={320}
                      height={320}
                      sizes="160px"
                      className={
                        fruitIndex === 0
                          ? 'pointer-events-none absolute top-0 left-0 w-20 md:w-28'
                          : 'pointer-events-none absolute right-0 bottom-4 w-16 md:w-24'
                      }
                    />
                  ))}
                  {product.image && (
                    <Image
                      src={product.image.src}
                      alt={product.image.alt}
                      width={product.image.width ?? 400}
                      height={product.image.height ?? 720}
                      sizes="(max-width: 768px) 60vw, 30vw"
                      className="relative h-[clamp(16rem,46vh,30rem)] w-auto object-contain"
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
