'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatPhone } from '@barff/utils';
import {
  ASSIGNMENTS_KEY,
  type DriverDelivery,
  SNAPSHOT_KEY,
  getAssignments,
} from '@/lib/delivery-api';
import { OfflineBadge } from '@/components/OfflineBadge';
import { StatusChip } from '@/components/StatusChip';
import { useQueue } from '@/components/useQueue';

/**
 * Bugungi ish (CLAUDE.md §6).
 *
 * OFLAYN RO'YXAT — OXIRGI MUVAFFAQIYATLI JAVOBDAN.
 *
 * U keshda EMAS, mijozda saqlanadi va ochiq "oflayn ma'lumot"
 * deb belgilanadi. Farqi muhim: xizmat ishchisi keshi JIM yolg'on
 * gapirardi ("bu ish sizda"), bu yerdagi nusxa esa o'zini oshkor
 * qiladi va haydovchi yangilash kerakligini biladi.
 */
export function JobList() {
  const { queue } = useQueue();
  const [offlineData, setOfflineData] = useState<DriverDelivery[] | null>(null);

  const jobs = useQuery({ queryKey: ASSIGNMENTS_KEY, queryFn: getAssignments });

  // Muvaffaqiyatli javob — nusxa saqlanadi.
  useEffect(() => {
    if (jobs.data === undefined) return;

    try {
      window.localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(jobs.data));
    } catch {
      // Saqlash bloklangan — oflayn ro'yxat bo'lmaydi, ilova ishlaydi.
    }
  }, [jobs.data]);

  // Xato — oxirgi nusxa ko'rsatiladi.
  useEffect(() => {
    if (!jobs.isError) return;

    try {
      const raw = window.localStorage.getItem(SNAPSHOT_KEY);
      if (raw !== null) setOfflineData(JSON.parse(raw) as DriverDelivery[]);
    } catch {
      setOfflineData(null);
    }
  }, [jobs.isError]);

  const data = jobs.data ?? offlineData;
  const stale = jobs.data === undefined && offlineData !== null;

  return (
    <div className="flex flex-col">
      <OfflineBadge pending={queue.length} />

      <div className="px-4 pt-4 pb-2">
        <h1 className="text-2xl font-bold">Bugungi ish</h1>
        {data !== null && (
          <p className="mt-1 text-sm text-[#555]">
            {data.length === 0 ? 'Yetkazma yo‘q' : `${data.length} ta yetkazma`}
            {stale && ' · oflayn ma‘lumot'}
          </p>
        )}
      </div>

      {jobs.isPending && offlineData === null && (
        <p role="status" className="px-4 py-6 text-[#555]">
          Yuklanmoqda…
        </p>
      )}

      {jobs.isError && offlineData === null && (
        <p role="alert" className="px-4 py-6 text-[#8a1f1f]">
          Ro‘yxatni yuklab bo‘lmadi. Aloqa tiklanganda o‘zi yangilanadi.
        </p>
      )}

      {data !== null && data.length === 0 && (
        <p className="px-4 py-6 text-[#555]">
          Sizga hozircha yetkazma biriktirilmagan. Logist biriktirgach shu yerda paydo bo‘ladi.
        </p>
      )}

      <ul className="flex flex-col gap-3 p-4">
        {(data ?? []).map((job) => (
          <li key={job.id}>
            {/*
              BUTUN KARTOCHKA — BOSILADIGAN MAYDON.

              Telefonda barmoq aniq emas va haydovchi qo'lqopda
              bo'lishi mumkin. Kichik havola o'rniga butun
              kartochka (kamida 44px balandlikdan ancha katta).
            */}
            <Link
              href={`/${job.id}`}
              className="block rounded-xl border-2 border-[#ddd] bg-white p-4 active:bg-[#f2f2f2]"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-lg font-bold tabular-nums">{job.number}</span>
                <StatusChip status={job.status} />
              </div>

              <p className="mt-2 text-lg font-medium">{job.shippingLabel}</p>
              <p className="text-base text-[#333]">
                {job.shippingRegion}, {job.shippingAddress}
              </p>

              <p className="mt-2 text-base text-[#555]">
                {job.contactName} · {formatPhone(job.contactPhone)}
              </p>

              {job.order !== null && (
                <p className="mt-1 text-sm text-[#666]">
                  {job.order.dealer?.companyName ?? '—'} · {job.order._count.items} pozitsiya
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
