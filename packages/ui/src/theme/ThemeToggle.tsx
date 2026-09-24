'use client';

import { useEffect, useState } from 'react';
import { cn } from '../lib/cn';
import { type Theme, applyTheme, readTheme } from './theme';

export interface ThemeToggleLabels {
  /** Tugmaning umumiy nomi, masalan "Ko'rinish". */
  label: string;
  system: string;
  light: string;
  dark: string;
}

export interface ThemeToggleProps {
  labels: ThemeToggleLabels;
  className?: string | undefined;
}

const NEXT: Record<Theme, Theme> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
};

/**
 * Ko'rinish almashtirgichi.
 *
 * Bitta tugma uchta holatni aylantiradi. Holat NOMI ekranda ko'rinadi
 * (faqat belgi emas): belgi o'zi ma'no bermaydi va "quyosh" tugmasi
 * "hozir yorug'mi yoki yorug'ga o'tadimi" degan savol tug'diradi.
 *
 * SERVERDA render qilinganda tanlov NOMA'LUM (u brauzer xotirasida),
 * shuning uchun tugma hidratsiya tugagunicha `system` holatini
 * ko'rsatadi va shundan keyingina haqiqiy qiymatga o'tadi. Aks holda
 * server va brauzer HTML'i mos kelmay, React ogohlantirish berardi.
 */
export function ThemeToggle({ labels, className }: ThemeToggleProps) {
  const [theme, setTheme] = useState<Theme>('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setTheme(readTheme());
    setReady(true);
  }, []);

  const change = () => {
    const next = NEXT[theme];
    setTheme(next);
    applyTheme(next);
  };

  const name = labels[theme];

  return (
    <button
      type="button"
      onClick={change}
      // Hidratsiyagacha holat noma'lum — tugma o'qilsa ham chalg'itmasligi
      // uchun shu paytda faqat umumiy nom e'lon qilinadi.
      aria-label={ready ? `${labels.label}: ${name}` : labels.label}
      title={ready ? `${labels.label}: ${name}` : labels.label}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-[var(--color-line-strong)] px-3 py-1.5',
        'text-xs font-medium text-[var(--color-fg-muted)]',
        'transition-colors duration-[var(--duration-fast)]',
        'hover:border-[var(--color-fg-subtle)] hover:text-[var(--color-fg)]',
        className,
      )}
    >
      <ThemeIcon theme={theme} />
      <span>{name}</span>
    </button>
  );
}

function ThemeIcon({ theme }: { theme: Theme }) {
  const common = {
    width: 14,
    height: 14,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    // Belgi bezak: ma'no yonidagi MATNda (yuqoriga qarang).
    'aria-hidden': true,
  };

  if (theme === 'light') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    );
  }

  if (theme === 'dark') {
    return (
      <svg {...common}>
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <rect x="2" y="4" width="20" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}
