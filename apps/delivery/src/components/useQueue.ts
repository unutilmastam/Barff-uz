'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type QueuedAction,
  classify,
  dequeue,
  enqueue,
  markFailed,
  newKey,
  readQueue,
  writeQueue,
} from '@/lib/queue';
import { sendStatus } from '@/lib/delivery-api';

/**
 * Navbatni yuritadi.
 *
 * MANTIQ `lib/queue.ts` DA va u SOF funksiyalardan iborat —
 * shuning uchun u brauzsiz sinaladi (14 ta test). Bu yerda faqat
 * ULANISH: saqlagich, taymer va hodisalar.
 *
 * YUBORISH KETMA-KET, parallel emas: amallar bitta yetkazmaning
 * KETMA-KET holatlari bo'lishi mumkin (`PICKED_UP` keyin
 * `IN_TRANSIT`) va ularni birga yuborish ikkinchisini
 * "ruxsat etilmagan o'tish" qilardi.
 */
export function useQueue(onSynced?: () => void) {
  const [queue, setQueue] = useState<QueuedAction[]>([]);
  const running = useRef(false);

  const storage = (): Storage | null => {
    try {
      return window.localStorage;
    } catch {
      // Shaxsiy rejim yoki bloklangan saqlash — navbatsiz ishlaymiz.
      return null;
    }
  };

  useEffect(() => {
    const store = storage();
    if (store !== null) setQueue(readQueue(store));
  }, []);

  const persist = useCallback((next: QueuedAction[]) => {
    setQueue(next);
    const store = storage();
    if (store !== null) writeQueue(store, next);
  }, []);

  /** Navbatni bo'shatishga urinadi. */
  const flush = useCallback(async () => {
    if (running.current) return;

    const store = storage();
    let current = store !== null ? readQueue(store) : [];
    if (current.length === 0) return;

    running.current = true;
    let changed = false;

    try {
      for (const action of current) {
        const result = await sendStatus(action.deliveryId, {
          status: action.status,
          note: action.note,
          failureReason: action.failureReason,
          receivedBy: action.receivedBy,
          proofNote: action.proofNote,
          // KALIT O'ZGARMAYDI — takrorga qarshi himoya shunga tayanadi.
          idempotencyKey: action.key,
        });

        const verdict = classify(result.status);

        if (verdict === 'retry') {
          current = markFailed(current, action.key, 'Aloqa yo‘q');
          changed = true;
          // Tarmoq yo'q — qolganini ham urinib o'tirmaymiz.
          break;
        }

        current = dequeue(current, action.key);
        changed = true;

        if (verdict === 'dropped') {
          // Serverga yetdi, lekin rad etildi. Navbatdan chiqadi,
          // sabab esa yetkazma sahifasida ko'rinadi.
          console.warn(`Amal rad etildi (${result.status}): ${result.message ?? ''}`);
        }
      }
    } finally {
      running.current = false;
      if (changed) persist(current);
      if (changed) onSynced?.();
    }
  }, [onSynced, persist]);

  /** Amalni navbatga qo'yadi va darhol yuborishga urinadi. */
  const push = useCallback(
    (action: Omit<QueuedAction, 'key' | 'createdAt' | 'attempts'>) => {
      const store = storage();
      const current = store !== null ? readQueue(store) : queue;

      const next = enqueue(current, {
        ...action,
        // KALIT SHU YERDA — AMAL YARATILGANDA — yasaladi.
        // Yuborish paytida yasash butun himoyani yo'qqa chiqarardi.
        key: newKey(),
        createdAt: Date.now(),
        attempts: 0,
      });

      persist(next);
      void flush();
    },
    [flush, persist, queue],
  );

  /*
    QACHON QAYTA URINAMIZ:
    - aloqa tiklanganda (`online` hodisasi),
    - ilova ko'rinadigan bo'lganda (haydovchi telefonni ochdi),
    - har 20 soniyada — `online` hodisasi har doim ham kelmaydi.
  */
  useEffect(() => {
    const retry = () => void flush();

    window.addEventListener('online', retry);
    document.addEventListener('visibilitychange', retry);
    const timer = window.setInterval(retry, 20_000);

    return () => {
      window.removeEventListener('online', retry);
      document.removeEventListener('visibilitychange', retry);
      window.clearInterval(timer);
    };
  }, [flush]);

  return { queue, push, flush };
}
