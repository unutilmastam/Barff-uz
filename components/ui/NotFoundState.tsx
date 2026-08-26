'use client';

import Link from 'next/link';
import { TextReveal } from '@/components/animation/TextReveal';

interface NotFoundStateProps {
  /** Katta sarlavha: "MAHSULOT TOPILMADI" / "MAQOLA TOPILMADI". */
  title: string;
  /** Qaytish havolasi. */
  href: string;
  label: string;
}

/** Brendlangan "topilmadi" holati — ichki sahifalar uchun umumiy. */
export function NotFoundState({ title, href, label }: NotFoundStateProps) {
  return (
    <main className="container-barff flex min-h-[70vh] flex-col justify-center gap-8 pt-32 pb-24">
      <TextReveal as="h1" type="lines" className="text-section block">
        {title}
      </TextReveal>
      <Link href={href} className="text-label text-muted hover:text-foreground">
        ← {label}
      </Link>
    </main>
  );
}
