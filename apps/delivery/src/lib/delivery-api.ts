import { type ApiRequestOptions, apiFetch } from './api-client';

/** Yetkazma — haydovchi ko'radigan shakl. */
export interface DriverDelivery {
  id: string;
  number: string;
  status: string;
  shippingLabel: string;
  shippingRegion: string;
  shippingAddress: string;
  contactName: string;
  contactPhone: string;
  shippingNotes: string | null;
  scheduledFor: string | null;
  failureReason: string | null;
  receivedBy: string | null;
  order: {
    id: string;
    number: string;
    total: number;
    currency: string;
    dealer: { id: string; companyName: string } | null;
    _count: { items: number };
  } | null;
  events?: {
    id: string;
    fromStatus: string | null;
    toStatus: string;
    note: string | null;
    createdAt: string;
  }[];
}

export const ASSIGNMENTS_KEY = ['driver-assignments'] as const;

export function getAssignments(): Promise<DriverDelivery[]> {
  return apiFetch<DriverDelivery[]>('/delivery/my/assignments');
}

export function getDelivery(id: string): Promise<DriverDelivery> {
  return apiFetch<DriverDelivery>(`/delivery/my/${id}`);
}

export interface StatusPayload {
  status: string;
  note?: string | undefined;
  failureReason?: string | undefined;
  receivedBy?: string | undefined;
  proofNote?: string | undefined;
  idempotencyKey: string;
}

/**
 * Holatni yuboradi va JAVOB STATUSINI ham qaytaradi.
 *
 * Navbat "qayta urinamizmi" degan qarorni STATUS bo'yicha qabul
 * qiladi (`classify`), shuning uchun oddiy `apiFetch` yetarli
 * emas — u xatoda istisno tashlaydi va status yo'qoladi.
 */
export async function sendStatus(
  id: string,
  payload: StatusPayload,
): Promise<{ status: number | null; message?: string | undefined }> {
  const options: ApiRequestOptions = { method: 'PATCH', body: payload };

  try {
    await apiFetch(`/delivery/my/${id}/status`, options);

    return { status: 200 };
  } catch (error) {
    const known = error as { statusCode?: number; message?: string; name?: string };

    /*
      `fetch` ning O'ZI yiqilsa (tarmoq yo'q) `ApiRequestError`
      emas, oddiy `TypeError` keladi va `statusCode` bo'lmaydi.
      O'shanda `null` qaytariladi — "javob umuman kelmadi".
    */
    if (typeof known.statusCode !== 'number') return { status: null };

    return { status: known.statusCode, message: known.message };
  }
}

/** Oflayn ro'yxat uchun oxirgi muvaffaqiyatli javob. */
export const SNAPSHOT_KEY = 'barff.delivery.assignments.v1';
