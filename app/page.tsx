/**
 * Vaqtinchalik bosh sahifa.
 * Hero va boshqa vizual bo'limlar Phase 4+ da quriladi (BUILD_PLAN.md).
 */
export default function HomePage() {
  return (
    <main className="container-barff flex min-h-screen flex-col justify-center gap-6 py-24">
      <p className="text-label text-muted uppercase">Phase 1 — Setup &amp; Design System</p>
      <h1 className="text-hero">BARFF</h1>
      <p className="text-body text-muted max-w-[46ch]">
        Design system va loyiha skeleti tayyor. Layout, motion va bo&apos;limlar keyingi
        bosqichlarda quriladi.
      </p>
    </main>
  );
}
