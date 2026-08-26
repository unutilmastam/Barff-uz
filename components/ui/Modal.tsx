'use client';

import { gsap } from 'gsap';
import { X } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useAnimatedPresence } from '@/hooks/useAnimatedPresence';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useIsClient } from '@/hooks/useIsClient';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { useLocale } from '@/components/providers/LocaleProvider';
import { DURATION, EASE } from '@/lib/motion';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Ekran o'quvchi uchun sarlavha (ko'rinmasa ham majburiy). */
  title: string;
  /** Sarlavhani vizual ko'rsatish. */
  showTitle?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * Qayta ishlatiladigan modal: portal + focus trap + scroll lock + Escape.
 *
 * Yopilish animatsiyasi tugaguncha DOM'da qoladi, keyin unmount bo'ladi —
 * shu sababli `isOpen` false bo'lishi bilanoq yo'qolib qolmaydi.
 */
export function Modal({ isOpen, onClose, title, showTitle = false, className, children }: ModalProps) {
  const isClient = useIsClient();
  const { rendered, onExited } = useAnimatedPresence(isOpen);
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const { t } = useLocale();

  useFocusTrap(panelRef, isOpen && rendered);
  useLockBodyScroll(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  useLayoutEffect(() => {
    if (!rendered) return;

    const context = gsap.context(() => {
      const duration = prefersReducedMotion ? 0.01 : DURATION.ui;

      if (isOpen) {
        gsap
          .timeline()
          .fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration, ease: EASE.out2 })
          .fromTo(
            panelRef.current,
            { opacity: 0, y: prefersReducedMotion ? 0 : 24 },
            { opacity: 1, y: 0, duration, ease: EASE.out3 },
            '<0.05',
          );
      } else {
        gsap.timeline({ onComplete: onExited }).to([panelRef.current, overlayRef.current], {
          opacity: 0,
          duration: duration * 0.7,
          ease: EASE.out2,
        });
      }
    });

    return () => context.revert();
  }, [isOpen, rendered, onExited, prefersReducedMotion]);

  if (!isClient || !rendered) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-5">
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-foreground/70"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative z-10 max-h-[85vh] w-full max-w-[720px] overflow-y-auto',
          'rounded-lg bg-background p-8 shadow-2xl',
          className,
        )}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t.actions.close}
          className="absolute top-5 right-5 grid size-10 place-items-center rounded-full text-muted transition-colors hover:bg-secondary hover:text-foreground"
        >
          <X size={20} aria-hidden="true" />
        </button>
        {showTitle && <h2 className="text-title mb-6 pr-12">{title}</h2>}
        {children}
      </div>
    </div>,
    document.body,
  );
}
