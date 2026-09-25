import { describe, expect, it } from 'vitest';
import {
  QUEUE_KEY,
  type QueuedAction,
  classify,
  dequeue,
  enqueue,
  markFailed,
  newKey,
  readQueue,
  writeQueue,
} from './queue';

const action = (overrides: Partial<QueuedAction> = {}): QueuedAction => ({
  key: 'k1',
  deliveryId: 'd1',
  status: 'PICKED_UP',
  createdAt: 1,
  attempts: 0,
  ...overrides,
});

/** Xotiradagi soxta saqlagich. */
function memory(initial: Record<string, string> = {}) {
  const store = { ...initial };

  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    raw: store,
  };
}

/** Har doim xato tashlaydigan saqlagich — shaxsiy rejim. */
const blocked = {
  getItem: () => {
    throw new Error('bloklangan');
  },
  setItem: () => {
    throw new Error('bloklangan');
  },
};

describe('oflayn navbat', () => {
  it('bo‘sh saqlagich bo‘sh navbat beradi', () => {
    expect(readQueue(memory())).toEqual([]);
  });

  it('yozadi va o‘qiydi', () => {
    const storage = memory();
    expect(writeQueue(storage, [action()])).toBe(true);
    expect(readQueue(storage)).toHaveLength(1);
  });

  /*
    SAQLASH BLOKLANGANDA ILOVA ISHLASHDA DAVOM ETADI.

    Shaxsiy rejimda yoki sayt ma'lumotlari o'chirilganda
    `localStorage` XATO tashlaydi. O'shanda ilova oq ekranga
    aylanmasligi kerak: navbatsiz, lekin ishlab turishi kerak.
  */
  it('bloklangan saqlagich ILOVANI YIQITMAYDI', () => {
    expect(readQueue(blocked)).toEqual([]);
    expect(writeQueue(blocked, [action()])).toBe(false);
  });

  it('buzilgan yozuv BUTUN navbatni yo‘qotmaydi', () => {
    const storage = memory({
      [QUEUE_KEY]: JSON.stringify([action(), { buzuq: true }, action({ key: 'k2' })]),
    });

    expect(readQueue(storage)).toHaveLength(2);
  });

  it('JSON umuman buzilgan bo‘lsa bo‘sh navbat', () => {
    expect(readQueue(memory({ [QUEUE_KEY]: 'bu JSON emas' }))).toEqual([]);
  });

  /*
    HAR BIR HOLAT ALOHIDA AMAL.

    Haydovchi "yo'ldaman" ni bosib, keyin "yetib keldim" ni bossa,
    birinchisi hali yuborilmagan bo'lishi mumkin — lekin ikkalasi
    ham kerak. Almashtirish o'tishni YO'QOTARDI.
  */
  it('turli holatlar navbatda BIRGA turadi', () => {
    const queue = enqueue(enqueue([], action()), action({ key: 'k2', status: 'ARRIVED' }));

    expect(queue.map((a) => a.status)).toEqual(['PICKED_UP', 'ARRIVED']);
  });

  it('AYNI holat takror bosilsa QO‘SHILMAYDI', () => {
    // "Ishladimi?" deb ikkinchi marta bosish.
    const queue = enqueue(enqueue([], action()), action({ key: 'k2' }));

    expect(queue).toHaveLength(1);
    expect(queue[0]?.key).toBe('k1');
  });

  it('bajarilgan amal navbatdan chiqadi', () => {
    expect(dequeue([action(), action({ key: 'k2' })], 'k1')).toHaveLength(1);
  });

  it('xato amalni navbatda QOLDIRADI va urinishni sanaydi', () => {
    const queue = markFailed([action()], 'k1', 'tarmoq yo‘q');

    expect(queue).toHaveLength(1);
    expect(queue[0]?.attempts).toBe(1);
    expect(queue[0]?.lastError).toBe('tarmoq yo‘q');
  });

  it('kalit NOYOB', () => {
    const keys = new Set(Array.from({ length: 200 }, () => newKey()));

    expect(keys.size).toBe(200);
  });
});

describe('javobni tasniflash', () => {
  /*
    QAYSI XATO NAVBATDA QOLADI, QAYSISI CHIQADI.

    `4xx` — so'rov NOTO'G'RI va qayta yuborish uni to'g'rilamaydi.
    Uni navbatda qoldirish MANGU aylanish berardi va navbatning
    qolgani ham to'xtab qolardi.
  */
  it('tarmoq yiqilsa QAYTA urinadi', () => {
    expect(classify(null)).toBe('retry');
  });

  it('server xatosida QAYTA urinadi', () => {
    expect(classify(500)).toBe('retry');
    expect(classify(503)).toBe('retry');
  });

  it('muvaffaqiyat navbatdan chiqaradi', () => {
    expect(classify(200)).toBe('done');
    expect(classify(201)).toBe('done');
  });

  it('`4xx` navbatdan CHIQARADI — qayta yuborish yordam bermaydi', () => {
    expect(classify(400)).toBe('dropped');
    expect(classify(404)).toBe('dropped');
    // `409` — o'tish endi mumkin emas (logist bekor qilgan).
    expect(classify(409)).toBe('dropped');
  });
});
