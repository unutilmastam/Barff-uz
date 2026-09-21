/**
 * URL uchun slug yasash.
 *
 * O'zbek lotin (o', g', sh, ch) va kirill, shuningdek rus harflari qo'llab-quvvatlanadi —
 * mahsulot va yangilik nomlari shu tillarda keladi (CLAUDE.md §18).
 */

/** Kirill → lotin. Uzun ketma-ketliklar avval keladi (shch, yo …). */
const TRANSLITERATION: ReadonlyArray<readonly [RegExp, string]> = [
  [/щ/g, 'shch'],
  [/ш/g, 'sh'],
  [/ч/g, 'ch'],
  [/ц/g, 'ts'],
  [/ю/g, 'yu'],
  [/я/g, 'ya'],
  [/ё/g, 'yo'],
  [/ж/g, 'j'],
  [/х/g, 'x'],
  [/ъ/g, ''],
  [/ь/g, ''],
  [/ғ/g, 'g'],
  [/қ/g, 'q'],
  [/ҳ/g, 'h'],
  [/ў/g, 'o'],
  [/а/g, 'a'],
  [/б/g, 'b'],
  [/в/g, 'v'],
  [/г/g, 'g'],
  [/д/g, 'd'],
  [/е/g, 'e'],
  [/з/g, 'z'],
  [/и/g, 'i'],
  [/й/g, 'y'],
  [/к/g, 'k'],
  [/л/g, 'l'],
  [/м/g, 'm'],
  [/н/g, 'n'],
  [/о/g, 'o'],
  [/п/g, 'p'],
  [/р/g, 'r'],
  [/с/g, 's'],
  [/т/g, 't'],
  [/у/g, 'u'],
  [/ф/g, 'f'],
  [/ы/g, 'y'],
  [/э/g, 'e'],
];

export function slugify(input: string): string {
  let result = input.toLowerCase().trim();

  for (const [pattern, replacement] of TRANSLITERATION) {
    result = result.replace(pattern, replacement);
  }

  return (
    result
      // Diakritiklarni ajratib tashlash (é -> e).
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      // O'zbek apostroflari (o‘, g‘) ajratuvchi emas — shunchaki olib tashlanadi.
      .replace(/['‘’ʻʼ`]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-')
  );
}

/**
 * Takrorlanmas slug: mavjudlari orasida bo'lsa `-2`, `-3` … qo'shiladi.
 * Mahsulot/yangilik yaratishda ishlatiladi.
 */
export function uniqueSlug(input: string, existing: readonly string[]): string {
  const base = slugify(input);
  if (!existing.includes(base)) return base;

  let suffix = 2;
  while (existing.includes(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}
