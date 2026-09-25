'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { DELIVERY_STATUS_TRANSITIONS, type DeliveryStatus } from '@barff/types';
import { formatPhone } from '@barff/utils';
import { ASSIGNMENTS_KEY, getDelivery } from '@/lib/delivery-api';
import { OfflineBadge } from '@/components/OfflineBadge';
import { StatusChip, statusLabel } from '@/components/StatusChip';
import { useQueue } from '@/components/useQueue';

/**
 * HAYDOVCHI QILA OLADIGAN o'tishlar.
 *
 * Ro'yxat `docs/DELIVERY-POLICY.md` §5 dan va SERVER ham o'shani
 * tekshiradi — biriktirish va bekor qilish logist vakolatida.
 * Bu yerdagi filtr KOSMETIKA: tugmani yashirish himoya emas.
 */
const DRIVER_ALLOWED: readonly DeliveryStatus[] = [
  'PICKED_UP',
  'IN_TRANSIT',
  'ARRIVED',
  'DELIVERED',
  'FAILED',
];

function nextSteps(status: string): DeliveryStatus[] {
  const map = DELIVERY_STATUS_TRANSITIONS as Record<string, readonly DeliveryStatus[]>;

  return [...(map[status] ?? [])].filter((next) => DRIVER_ALLOWED.includes(next));
}

/**
 * Yetkazma tafsiloti va tugmalar.
 *
 * HAR BIR TUGMA NAVBATGA YOZADI, so'rov yuborishni KUTMAYDI.
 * Haydovchi tarmoqsiz joyda ham ishlay oladi va ekran DARHOL
 * javob beradi — "yuklanmoqda" aylanasi yo'q.
 */
export function JobDetail({ id }: { id: string }) {
  const client = useQueryClient();
  const { queue, push } = useQueue(() => {
    void client.invalidateQueries({ queryKey: ASSIGNMENTS_KEY });
    void client.invalidateQueries({ queryKey: ['driver-delivery', id] });
  });

  const [reason, setReason] = useState('');
  const [receivedBy, setReceivedBy] = useState('');
  const [note, setNote] = useState('');
  const [failing, setFailing] = useState(false);

  const delivery = useQuery({
    queryKey: ['driver-delivery', id],
    queryFn: () => getDelivery(id),
  });

  /** Shu yetkazma uchun navbatda turgan amallar. */
  const pending = queue.filter((action) => action.deliveryId === id);

  if (delivery.isPending) {
    return (
      <p role="status" className="p-4 text-[#555]">
        Yuklanmoqda…
      </p>
    );
  }

  if (delivery.isError || delivery.data === undefined) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <p role="alert" className="text-[#8a1f1f]">
          Yetkazmani ochib bo‘lmadi. Aloqa yo‘q bo‘lsa, ro‘yxatga qaytib qayta urinib ko‘ring.
        </p>
        <Link href="/" className="text-lg font-semibold text-[#0c7830] underline">
          ← Ro‘yxatga qaytish
        </Link>
      </div>
    );
  }

  const data = delivery.data;
  const steps = nextSteps(data.status);

  /** Navbatdagi amal hisobga olinadi — tugma ikki marta bosilmasin. */
  const queuedStatuses = new Set(pending.map((action) => action.status));

  const act = (status: DeliveryStatus) => {
    if (status === 'FAILED') {
      setFailing(true);
      return;
    }

    push({
      deliveryId: id,
      status,
      ...(status === 'DELIVERED' && receivedBy.trim() !== ''
        ? { receivedBy: receivedBy.trim() }
        : {}),
      ...(status === 'DELIVERED' && note.trim() !== '' ? { proofNote: note.trim() } : {}),
    });
  };

  const submitFailure = () => {
    if (reason.trim() === '') return;

    push({ deliveryId: id, status: 'FAILED', failureReason: reason.trim() });
    setFailing(false);
    setReason('');
  };

  /*
    NAVIGATSIYA TASHQI ILOVAGA TOPSHIRILADI.

    Ichki xarita YO'Q: u jonli GPS talab qilardi (CLAUDE.md §6 uni
    taqiqlaydi) va haydovchining telefonida allaqachon o'zi
    ishlatadigan navigator bor. `geo:` sxemasi Android'da
    tanlovni o'ziga qo'yadi.
  */
  const mapQuery = encodeURIComponent(`${data.shippingRegion}, ${data.shippingAddress}`);

  return (
    <div className="flex flex-col pb-8">
      <OfflineBadge pending={queue.length} />

      <div className="flex items-center gap-3 px-4 pt-4">
        <Link
          href="/"
          aria-label="Ro‘yxatga qaytish"
          className="text-2xl leading-none text-[#0c7830]"
        >
          ←
        </Link>
        <span className="text-xl font-bold tabular-nums">{data.number}</span>
        <StatusChip status={data.status} />
      </div>

      {pending.length > 0 && (
        <p className="mx-4 mt-3 rounded-lg bg-[#fff4d6] px-3 py-2 text-sm text-[#7a5200]">
          Navbatda: {pending.map((action) => statusLabel(action.status)).join(', ')}
        </p>
      )}

      {/* --- MANZIL --- */}
      <section className="mx-4 mt-4 rounded-xl border-2 border-[#ddd] p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#666]">Manzil</h2>
        <p className="mt-2 text-xl font-bold">{data.shippingLabel}</p>
        <p className="mt-1 text-lg">
          {data.shippingRegion}, {data.shippingAddress}
        </p>
        {data.shippingNotes !== null && (
          <p className="mt-2 text-base text-[#555]">{data.shippingNotes}</p>
        )}

        <div className="mt-4 flex flex-col gap-2">
          {/*
            TELEFON VA XARITA — ENG KATTA TUGMALAR.

            Haydovchi ularni mashinada, ba'zan yurish ustida
            bosadi. 56px balandlik — 44px minimumdan ancha katta.
          */}
          <a
            href={`tel:${data.contactPhone}`}
            className="flex min-h-14 items-center justify-center rounded-xl bg-[#0c7830] px-4 text-lg font-bold text-white active:bg-[#0a6228]"
          >
            {data.contactName}ga qo‘ng‘iroq — {formatPhone(data.contactPhone)}
          </a>

          <a
            href={`geo:0,0?q=${mapQuery}`}
            className="flex min-h-14 items-center justify-center rounded-xl border-2 border-[#0c7830] px-4 text-lg font-bold text-[#0c7830] active:bg-[#eaf5ee]"
          >
            Xaritada ochish
          </a>
        </div>
      </section>

      {/* --- BUYURTMA --- */}
      {data.order !== null && (
        <section className="mx-4 mt-4 rounded-xl border-2 border-[#ddd] p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#666]">Buyurtma</h2>
          <p className="mt-2 text-lg font-medium tabular-nums">{data.order.number}</p>
          <p className="text-base text-[#333]">{data.order.dealer?.companyName ?? '—'}</p>
          <p className="text-base text-[#555]">{data.order._count.items} pozitsiya</p>
        </section>
      )}

      {/* --- TASDIQ --- */}
      {data.status === 'ARRIVED' && (
        <section className="mx-4 mt-4 rounded-xl border-2 border-[#ddd] p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#666]">
            Topshirish tasdig‘i
          </h2>

          <label className="mt-3 block text-base font-medium" htmlFor="receivedBy">
            Kim qabul qildi
          </label>
          <input
            id="receivedBy"
            value={receivedBy}
            onChange={(event) => setReceivedBy(event.target.value)}
            className="mt-1 min-h-14 w-full rounded-xl border-2 border-[#ccc] px-3 text-lg"
          />

          <label className="mt-3 block text-base font-medium" htmlFor="proofNote">
            Izoh (ixtiyoriy)
          </label>
          <textarea
            id="proofNote"
            rows={2}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="mt-1 w-full rounded-xl border-2 border-[#ccc] p-3 text-lg"
          />
        </section>
      )}

      {/* --- AMALLAR --- */}
      <section className="mx-4 mt-4 flex flex-col gap-3">
        {steps.length === 0 && (
          <p className="text-base text-[#555]">
            Bu yetkazma yakunlangan. Savol bo‘lsa logistga murojaat qiling.
          </p>
        )}

        {steps
          .filter((step) => step !== 'FAILED')
          .map((step) => (
            <button
              key={step}
              type="button"
              onClick={() => act(step)}
              disabled={queuedStatuses.has(step)}
              className="min-h-16 rounded-xl bg-[#0c7830] text-xl font-bold text-white active:bg-[#0a6228] disabled:bg-[#9ab8a5]"
            >
              {queuedStatuses.has(step) ? `${statusLabel(step)} — navbatda` : statusLabel(step)}
            </button>
          ))}

        {steps.includes('FAILED') && !failing && (
          <button
            type="button"
            onClick={() => setFailing(true)}
            className="min-h-14 rounded-xl border-2 border-[#991b1b] text-lg font-bold text-[#991b1b] active:bg-[#fdeaea]"
          >
            Yetkaza olmadim
          </button>
        )}

        {failing && (
          <div className="rounded-xl border-2 border-[#991b1b] p-4">
            <label className="block text-base font-medium" htmlFor="failureReason">
              Sabab (shart)
            </label>
            <textarea
              id="failureReason"
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="mt-1 w-full rounded-xl border-2 border-[#ccc] p-3 text-lg"
              placeholder="Masalan: mijoz joyida yo‘q"
            />

            <div className="mt-3 flex flex-col gap-2">
              <button
                type="button"
                onClick={submitFailure}
                disabled={reason.trim() === ''}
                className="min-h-14 rounded-xl bg-[#991b1b] text-lg font-bold text-white disabled:bg-[#d8a5a5]"
              >
                Yuborish
              </button>
              <button
                type="button"
                onClick={() => setFailing(false)}
                className="min-h-14 rounded-xl border-2 border-[#ccc] text-lg font-medium"
              >
                Bekor qilish
              </button>
            </div>
          </div>
        )}
      </section>

      {/* --- TARIX --- */}
      {(data.events ?? []).length > 0 && (
        <section className="mx-4 mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#666]">Tarix</h2>
          <ol className="mt-2 flex flex-col gap-2">
            {(data.events ?? []).map((event) => (
              <li key={event.id} className="border-l-4 border-[#ddd] pl-3 text-base">
                {statusLabel(event.toStatus)}
                <span className="block text-sm text-[#666]">
                  {new Date(event.createdAt).toLocaleString('uz-UZ')}
                </span>
                {event.note !== null && <span className="block text-sm">{event.note}</span>}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
