/**
 * Repodagi bosh sahifa banneri (`public/hero/banner*`, manba:
 * `assets/hero/banner-source.jpg`, `scripts/make-hero-banner.mjs`).
 *
 * `<picture>`: telefonda rasmning o'ng yarmi (shishalar o'sha yerda),
 * keng ekranda to'liq rasm; AVIF -> WebP -> JPG. Banner O'ZGARTIRILMAGAN.
 * `fetchPriority="high"`: u sahifaning eng katta elementlaridan biri (LCP).
 */
export function HeroBanner({ alt }: { alt: string }) {
  const mobile = '(max-width: 767px)';

  return (
    <picture>
      <source media={mobile} type="image/avif" srcSet="/hero/banner-m.avif" />
      <source media={mobile} type="image/webp" srcSet="/hero/banner-m.webp" />
      <source
        type="image/avif"
        srcSet="/hero/banner-960.avif 960w, /hero/banner.avif 1408w"
        sizes="100vw"
      />
      <source
        type="image/webp"
        srcSet="/hero/banner-960.webp 960w, /hero/banner.webp 1408w"
        sizes="100vw"
      />
      <img
        src="/hero/banner.jpg"
        alt={alt}
        width={1408}
        height={704}
        fetchPriority="high"
        decoding="async"
        className="barff-hero-drift h-full w-full object-cover object-[78%_center]"
      />
    </picture>
  );
}
