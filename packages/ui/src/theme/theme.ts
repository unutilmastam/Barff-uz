/**
 * Ko'rinish (mavzu) boshqaruvi.
 *
 * Ranglarning O'ZI CSS da — `@barff/config/tailwind/theme.css` dagi
 * `light-dark()` juftliklari. Bu fayl faqat QAYSI qiymat ishlashini
 * hal qiladi, ya'ni `<html>` dagi `data-theme` atributini va uning
 * brauzerdagi xotirasini boshqaradi.
 */

/**
 * `system` — alohida holat, "yorug'" ning sinonimi EMAS.
 *
 * Foydalanuvchi tizim afzalligiga QAYTA olishi kerak: kunduzi yorug',
 * kechqurun qorong'i bo'ladigan tizimda qat'iy tanlov tanlovni
 * bekor qilib qo'yadi. Shuning uchun uchta holat bor, ikkita emas.
 */
export type Theme = 'system' | 'light' | 'dark';

export const THEMES: readonly Theme[] = ['system', 'light', 'dark'] as const;

/** Brauzer xotirasidagi kalit. */
export const THEME_STORAGE_KEY = 'barff-theme';

function isTheme(value: unknown): value is Theme {
  return value === 'system' || value === 'light' || value === 'dark';
}

/**
 * Saqlangan tanlov.
 *
 * `localStorage` maxfiy rejimda yoki sayt ma'lumotlari bloklanganda
 * XATO OTADI — o'qish ham, yozish ham. Shuning uchun har bir murojaat
 * `try` ichida va muvaffaqiyatsizlikda `system` ga qaytadi.
 */
export function readTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

/** Tanlovni qo'llaydi va eslab qoladi. */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;

  /*
    `system` da atribut butunlay OLIB TASHLANADI, `data-theme="system"`
    qilib qo'yilmaydi. Sabab CSS da: tizim afzalligi
    `:root:not([data-theme])` selektori bilan ushlanadi, ya'ni atribut
    mavjudligining o'zi "foydalanuvchi aniq tanlov qildi" degani.
  */
  if (theme === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme);
  }

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Xotira yo'q bo'lsa tanlov shu sahifa ochiq turguncha amal qiladi.
  }
}

/**
 * Sahifa CHIZILISHIDAN OLDIN ishlaydigan skript.
 *
 * Busiz saqlangan tanlov faqat React yuklangach qo'llanardi va yorug'
 * rejimdagi foydalanuvchi har safar bir lahza QORONG'I ekranni ko'rardi
 * (FOUC). Shuning uchun bu `<head>` ga, sinxron `<script>` sifatida
 * qo'yiladi.
 *
 * Bu satr O'ZGARMAS va foydalanuvchi ma'lumoti UMUMAN aralashmaydi —
 * `dangerouslySetInnerHTML` bu yerda xavfsiz (S13 dagi qoida saqlangan
 * KONTENTga tegishli edi).
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;
