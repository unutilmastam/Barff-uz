/**
 * OFLAYN NAVBAT (CLAUDE.md §6, `ROADMAP.md` S33).
 *
 * ==========================================================
 * MUAMMO
 * ==========================================================
 *
 * Haydovchi tarmoqsiz joyda ishlaydi: yerto'la, sanoat hududi,
 * shahar tashqarisi. U "tovarni oldim" tugmasini bosadi va
 * so'rov ketmaydi. Agar tugma shunchaki xato bersa, haydovchi uni
 * qayta-qayta bosadi yoki umuman tashlab ketadi — ikkalasi ham
 * yomon.
 *
 * ==========================================================
 * YECHIM VA UNING SHARTI
 * ==========================================================
 *
 * Amal DARHOL navbatga yoziladi va keyin yuborilishga uriniladi.
 * Aloqa tiklanganda navbat o'zi bo'shaydi.
 *
 * ENG MUHIM SHART — **AYNAN BIR MARTA** (S33 DoD).
 *
 * Buni faqat navbat ta'minlay olmaydi: javob YO'QOLISHI mumkin,
 * so'rov esa serverga YETIB BORGAN bo'lishi mumkin. O'shanda
 * navbat qayta yuboradi va amal IKKI MARTA qo'llanardi.
 *
 * Shuning uchun har bir amal YARATILGANDA kalit oladi va u qayta
 * yuborishda O'ZGARMAYDI. Server o'sha kalit bo'yicha takrorni
 * taniydi va amalni ikkinchi marta qo'llamaydi (S33, server
 * tomoni test bilan qoplangan).
 *
 * Kalitni YUBORISH paytida yasash butun himoyani yo'qqa
 * chiqarardi — har urinish yangi kalit olardi.
 */

/** Navbatdagi amal. */
export interface QueuedAction {
  /** Takrorga qarshi kalit — AMAL YARATILGANDA yasaladi. */
  key: string;
  deliveryId: string;
  status: string;
  note?: string | undefined;
  failureReason?: string | undefined;
  receivedBy?: string | undefined;
  proofNote?: string | undefined;
  /** Birinchi urinish vaqti — eskirganini ko'rsatish uchun. */
  createdAt: number;
  /** Nechta urinish bo'ldi. */
  attempts: number;
  /** Oxirgi xato — haydovchiga ko'rsatiladi. */
  lastError?: string | undefined;
}

export const QUEUE_KEY = 'barff.delivery.queue.v1';

/**
 * Navbat saqlagichi.
 *
 * `localStorage` ATAYLAB: navbat KICHIK (kunlik yetkazmalar soni
 * o'nlab), va `localStorage` sinxron — ya'ni sahifa yopilayotganda
 * ham yozib ulguradi. IndexedDB asinxron va o'sha paytda amal
 * yo'qolishi mumkin edi.
 *
 * Har bir o'qish/yozish himoyalangan: shaxsiy rejimda yoki
 * saqlash bloklanganda `localStorage` XATO tashlaydi, va o'shanda
 * ilova ishlashda davom etishi kerak — navbatsiz, lekin ishlab.
 */
export interface QueueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function readQueue(storage: QueueStorage): QueuedAction[] {
  try {
    const raw = storage.getItem(QUEUE_KEY);
    if (raw === null) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Buzilgan yozuvlar TASHLAB YUBORILADI, butun navbat emas.
    return parsed.filter(isAction);
  } catch {
    return [];
  }
}

export function writeQueue(storage: QueueStorage, actions: QueuedAction[]): boolean {
  try {
    storage.setItem(QUEUE_KEY, JSON.stringify(actions));

    return true;
  } catch {
    return false;
  }
}

function isAction(value: unknown): value is QueuedAction {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as Record<string, unknown>;

  return (
    typeof row['key'] === 'string' &&
    typeof row['deliveryId'] === 'string' &&
    typeof row['status'] === 'string'
  );
}

/**
 * Navbatga qo'shadi.
 *
 * BITTA YETKAZMA UCHUN BITTA KUTAYOTGAN AMAL. Haydovchi
 * "yo'ldaman" ni bosib, keyin "yetib keldim" ni bossa, birinchisi
 * hali yuborilmagan bo'lishi mumkin — lekin ikkalasi ham kerak,
 * chunki har biri alohida holat.
 *
 * Shuning uchun almashtirish EMAS, QO'SHISH: tartib saqlanadi va
 * server o'tishlarni ketma-ket qabul qiladi.
 *
 * Ayni o'sha holat takror bosilsa (bir xil yetkazma + bir xil
 * holat, hali yuborilmagan) — u QO'SHILMAYDI: bu haydovchining
 * "ishladimi?" deb ikkinchi marta bosishi.
 */
export function enqueue(actions: QueuedAction[], action: QueuedAction): QueuedAction[] {
  const duplicate = actions.some(
    (queued) => queued.deliveryId === action.deliveryId && queued.status === action.status,
  );

  if (duplicate) return actions;

  return [...actions, action];
}

export function dequeue(actions: QueuedAction[], key: string): QueuedAction[] {
  return actions.filter((action) => action.key !== key);
}

/** Urinishdan keyin xatoni yozadi — navbatdan CHIQARMAYDI. */
export function markFailed(actions: QueuedAction[], key: string, error: string): QueuedAction[] {
  return actions.map((action) =>
    action.key === key ? { ...action, attempts: action.attempts + 1, lastError: error } : action,
  );
}

/**
 * Kalit yasash.
 *
 * `crypto.randomUUID` bo'lmasa (eski Android WebView, `http://`
 * orqali ochilgan sahifa) zaxira yo'l ishlatiladi. Kalit
 * NOYOBLIGI muhim, taxmin qilib bo'lmasligi emas.
 */
export function newKey(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid !== undefined) return uuid;

  return `k-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Amalni serverga yuboradi.
 *
 * QAYSI XATOLAR NAVBATDA QOLDIRADI:
 * - tarmoq xatosi (`fetch` yiqildi) — aloqa yo'q, keyin qayta
 *   urinamiz;
 * - `5xx` — server vaqtincha ishlamayapti.
 *
 * QAYSILARI NAVBATDAN CHIQARADI:
 * - `2xx` — bajarildi;
 * - `4xx` — so'rov NOTO'G'RI va qayta yuborish uni to'g'rilamaydi.
 *   Bunday amalni navbatda qoldirish uni MANGU aylantirib
 *   yurardi va navbatning qolgani ham to'xtab qolardi.
 *
 * `409` ham chiqariladi: o'tish endi mumkin emas (masalan logist
 * yetkazmani bekor qilgan). Haydovchiga sabab ko'rsatiladi.
 */
export type SendResult = 'done' | 'retry' | 'dropped';

export function classify(status: number | null): SendResult {
  // `null` — `fetch` umuman yiqildi (tarmoq yo'q).
  if (status === null) return 'retry';
  if (status >= 200 && status < 300) return 'done';
  if (status >= 500) return 'retry';

  return 'dropped';
}
