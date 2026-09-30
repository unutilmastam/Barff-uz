import { inflateRawSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { MAX_XLSX_ROWS, buildXlsx, columnName, crc32, zip } from './xlsx';

/** ZIP'ni MUSTAQIL o'qiydi (markaziy katalog bo'yicha) — yozuvchining o'zidan foydalanmasdan. */
export function unzip(buffer: Buffer): Map<string, Buffer> {
  const files = new Map<string, Buffer>();

  let end = buffer.length - 22;
  while (end >= 0 && buffer.readUInt32LE(end) !== 0x06054b50) end -= 1;
  if (end < 0) throw new Error('ZIP oxiri topilmadi');

  const count = buffer.readUInt16LE(end + 10);
  let pointer = buffer.readUInt32LE(end + 16);

  for (let i = 0; i < count; i += 1) {
    const method = buffer.readUInt16LE(pointer + 10);
    const crc = buffer.readUInt32LE(pointer + 16);
    const compressedSize = buffer.readUInt32LE(pointer + 20);
    const size = buffer.readUInt32LE(pointer + 24);
    const nameLength = buffer.readUInt16LE(pointer + 28);
    const extraLength = buffer.readUInt16LE(pointer + 30);
    const commentLength = buffer.readUInt16LE(pointer + 32);
    const localOffset = buffer.readUInt32LE(pointer + 42);
    const name = buffer.toString('utf8', pointer + 46, pointer + 46 + nameLength);

    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + localNameLength + localExtraLength;
    const raw = buffer.subarray(start, start + compressedSize);

    const data = method === 8 ? inflateRawSync(raw) : raw;

    expect(data.length, `${name}: o'lcham`).toBe(size);
    expect(crc32(data), `${name}: CRC`).toBe(crc);

    files.set(name, data);
    pointer += 46 + nameLength + extraLength + commentLength;
  }

  return files;
}

describe('XLSX yozuvchi', () => {
  /** Standart CRC-32 sinov vektori: "123456789" -> CBF43926. */
  it('CRC-32 standart vektorga teng', () => {
    expect(crc32(Buffer.from('123456789'))).toBe(0xcbf43926);
  });

  it('ustun nomlari: A, Z, AA, AZ, BA', () => {
    expect([0, 25, 26, 51, 52].map(columnName)).toEqual(['A', 'Z', 'AA', 'AZ', 'BA']);
  });

  it('ZIP aylanib qaytadi', () => {
    const files = unzip(
      zip([
        { name: 'a.txt', data: Buffer.from('salom'.repeat(100)) },
        { name: 'b/c.txt', data: Buffer.from('') },
      ]),
    );

    expect(files.get('a.txt')?.toString()).toBe('salom'.repeat(100));
    expect(files.get('b/c.txt')?.length).toBe(0);
  });

  it('kerakli qismlar bor va varaq qiymatlari joyida', () => {
    const files = unzip(
      buildXlsx({
        sheetName: 'Sotuv',
        header: ['Kun', 'Jami (tiyin)'],
        rows: [
          ['2031-03-10', 65000],
          ['2031-03-11', null],
        ],
      }),
    );

    for (const name of [
      '[Content_Types].xml',
      '_rels/.rels',
      'xl/workbook.xml',
      'xl/_rels/workbook.xml.rels',
      'xl/styles.xml',
      'xl/worksheets/sheet1.xml',
    ]) {
      expect(files.has(name), name).toBe(true);
    }

    const sheet = files.get('xl/worksheets/sheet1.xml')?.toString() ?? '';
    expect(sheet).toContain('<v>65000</v>');
    expect(sheet).toContain('2031-03-10');
    // `null` — bo'sh katak, "0" emas.
    expect(sheet).toContain('<c r="B3"/>');
  });

  /** `inlineStr` — MATN: `=1+1` katakda aynan `=1+1`, formula EMAS. */
  it('matn katak formulaga aylanmaydi', () => {
    const sheet =
      unzip(buildXlsx({ sheetName: 'x', header: ['a'], rows: [['=1+1']] }))
        .get('xl/worksheets/sheet1.xml')
        ?.toString() ?? '';

    expect(sheet).toContain('t="inlineStr"');
    expect(sheet).not.toContain('<f>');
    expect(sheet).toContain('=1+1');
  });

  /** XML'da taqiqlangan belgi BUTUN faylni "buzilgan" qiladi. */
  it('XML uchun taqiqlangan belgilar olib tashlanadi', () => {
    const sheet =
      unzip(buildXlsx({ sheetName: 'x', header: ['a'], rows: [['a\u0000b\u001fc<&>"']] }))
        .get('xl/worksheets/sheet1.xml')
        ?.toString() ?? '';

    expect(sheet).toContain('abc&lt;&amp;&gt;&quot;');
    // eslint-disable-next-line no-control-regex
    expect(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(sheet)).toBe(false);
  });

  it('NaN va Infinity XML ni buzmaydi', () => {
    const sheet =
      unzip(buildXlsx({ sheetName: 'x', header: ['a', 'b'], rows: [[Number.NaN, Infinity]] }))
        .get('xl/worksheets/sheet1.xml')
        ?.toString() ?? '';

    expect(sheet).not.toContain('NaN');
    expect(sheet).not.toContain('Infinity');
  });

  it('varaq nomi Excel qoidalariga mos', () => {
    const workbook =
      unzip(buildXlsx({ sheetName: 'a/b[c]:d*e?f\\'.padEnd(50, 'x'), header: ['a'], rows: [] }))
        .get('xl/workbook.xml')
        ?.toString() ?? '';
    const name = /<sheet name="([^"]*)"/.exec(workbook)?.[1] ?? '';

    expect(name.length).toBeLessThanOrEqual(31);
    expect(/[[\]:*?/\\]/.test(name)).toBe(false);
  });

  it('chegaradan katta jadval RAD ETILADI', () => {
    expect(() =>
      buildXlsx({ sheetName: 'x', header: ['a'], rows: new Array(MAX_XLSX_ROWS + 1).fill(['x']) }),
    ).toThrow(RangeError);
  });
});
