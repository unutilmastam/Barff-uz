'use client';

import { useState } from 'react';
import { HorizontalScroll } from '@/components/animation/HorizontalScroll';
import { ImageReveal } from '@/components/animation/ImageReveal';
import { MagneticButton } from '@/components/animation/MagneticButton';
import { Parallax } from '@/components/animation/Parallax';
import { Reveal } from '@/components/animation/Reveal';
import { TextReveal } from '@/components/animation/TextReveal';
import { Marquee } from '@/components/sections/Marquee';
import { Modal } from '@/components/ui/Modal';
import { PARALLAX } from '@/lib/motion';

/**
 * MOTION TIZIMI SINOV SAHIFASI (Phase 3).
 *
 * Bu sahifa faqat ichki tekshiruv uchun — navigatsiyaga qo'shilmagan va indekslanmaydi.
 * BUILD_PLAN bo'yicha Phase 4 (Hero) tugaguncha saqlanadi, keyin o'chiriladi.
 * Bu yerdagi matnlar sinov matni, brend kontenti EMAS.
 */

/** Sinov uchun neytral SVG — tashqi asset ko'chirilmaydi (9-qoida). */
const PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800">
       <rect width="1200" height="800" fill="#e4e4e4"/>
       <text x="600" y="410" font-family="sans-serif" font-size="42" fill="#6b6b6b"
             text-anchor="middle">PLACEHOLDER</text>
     </svg>`,
  );

function Block({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} data-test-block={id} className="border-line border-t py-24">
      <p className="text-label text-muted container-barff mb-10">{title}</p>
      {children}
    </section>
  );
}

export default function DevMotionPage() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <main className="flex flex-1 flex-col">
      <div className="container-barff py-16">
        <h1 className="text-section">MOTION SYSTEM</h1>
        <p className="text-body text-muted mt-4 max-w-[52ch]">
          Phase 3 sinov sahifasi. Har bir blok bitta animatsiya utilitasini tekshiradi.
        </p>
      </div>

      <Block id="text-reveal" title="01 — TextReveal (lines) + SplitText">
        <div className="container-barff">
          <TextReveal as="h2" type="lines" className="text-section block max-w-[16ch]">
            Motion tizimi butun saytning poydevori
          </TextReveal>
        </div>
      </Block>

      <Block id="text-reveal-words" title="02 — TextReveal (words)">
        <div className="container-barff">
          <TextReveal as="p" type="words" className="text-title block max-w-[24ch]">
            So&apos;zlar ketma-ket maskadan ko&apos;tarilib chiqadi
          </TextReveal>
        </div>
      </Block>

      <Block id="reveal" title="03 — Reveal (stagger)">
        <Reveal className="container-barff grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((index) => (
            <div key={index} data-reveal-card className="bg-secondary rounded-md p-10">
              <p className="text-title">0{index}</p>
              <p className="text-muted mt-2">Karta {index}</p>
            </div>
          ))}
        </Reveal>
      </Block>

      <Block id="image-reveal" title="04 — ImageReveal (scale 1.15 → clip-path → 1)">
        <div className="container-barff">
          <ImageReveal
            src={PLACEHOLDER}
            alt="Sinov uchun placeholder rasm"
            width={1200}
            height={800}
            sizes="(max-width: 768px) 100vw, 800px"
            className="aspect-[3/2] w-full max-w-[800px] rounded-lg"
          />
        </div>
      </Block>

      <Block id="parallax" title="05 — Parallax (bg 0.1 / image 0.25 / fruit 0.45)">
        <div className="container-barff grid gap-6 md:grid-cols-3">
          <Parallax speed={PARALLAX.background} className="bg-secondary rounded-md p-10">
            <p data-parallax-bg className="text-title">
              0.1
            </p>
          </Parallax>
          <Parallax speed={PARALLAX.image} className="bg-secondary rounded-md p-10">
            <p data-parallax-image className="text-title">
              0.25
            </p>
          </Parallax>
          <Parallax speed={PARALLAX.fruit} className="bg-secondary rounded-md p-10">
            <p data-parallax-fruit className="text-title">
              0.45
            </p>
          </Parallax>
        </div>
      </Block>

      <Block id="marquee" title="06 — Marquee (cheksiz, hover'da sekinlashadi)">
        <Marquee className="text-section">
          <span className="px-8">BARFF</span>
          <span className="px-8">•</span>
          <span className="px-8">MOTION</span>
          <span className="px-8">•</span>
        </Marquee>
      </Block>

      <Block id="magnetic" title="07 — MagneticButton (maks 12px, spring qaytish)">
        <div className="container-barff flex flex-wrap items-center gap-8">
          <MagneticButton
            className="bg-primary text-primary-foreground text-label rounded-full px-10 py-5"
            onClick={() => setModalOpen(true)}
          >
            MAGNETIC
          </MagneticButton>
          <span className="text-muted text-label">
            Sichqonchani tugma ustida yuring — 8–15px tortiladi
          </span>
        </div>
      </Block>

      <Block id="cursor" title="08 — Cursor holatlari (faqat desktop)">
        <div className="container-barff grid gap-4 md:grid-cols-4">
          {(['open', 'view', 'play', 'drag'] as const).map((state) => (
            <div
              key={state}
              data-cursor={state}
              className="border-line grid h-40 place-items-center rounded-md border"
            >
              <span className="text-label text-muted uppercase">data-cursor=&quot;{state}&quot;</span>
            </div>
          ))}
        </div>
      </Block>

      <Block id="horizontal" title="09 — HorizontalScroll (pin + dinamik kenglik)">
        <HorizontalScroll className="h-screen" trackClassName="h-screen gap-8 px-8">
          {[1, 2, 3, 4, 5].map((index) => (
            <div
              key={index}
              data-horizontal-card
              data-cursor="drag"
              className="bg-secondary grid h-[60vh] w-[70vw] place-items-center rounded-lg md:w-[40vw]"
            >
              <span className="text-section">0{index}</span>
            </div>
          ))}
        </HorizontalScroll>
      </Block>

      <Block id="scroll-sync" title="10 — Lenis + ScrollTrigger sinxronizatsiyasi">
        <div className="container-barff">
          <p className="text-body text-muted max-w-[52ch]">
            Yuqoridagi parallaks va gorizontal scroll bloklari `scrub` bilan ishlaydi —
            ular Lenis pozitsiyasidan orqada qolsa sinxronizatsiya buzilgan bo&apos;ladi.
          </p>
        </div>
      </Block>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Scroll lock sinovi" showTitle>
        <p className="text-body">
          Modal ochiq turganda Lenis to&apos;xtatiladi. Yopilgach sahifa o&apos;sha joyida qoladi.
        </p>
      </Modal>
    </main>
  );
}
