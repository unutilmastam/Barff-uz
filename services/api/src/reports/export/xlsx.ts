import { deflateRawSync } from 'node:zlib';

/**
 * Minimal XLSX yozuvchi (CLAUDE.md §22, S37).
 *
 * NEGA O'ZIM YOZDIM, KUTUBXONA EMAS.
 *
 * `exceljs`/`xlsx` o'nlab tranzitiv bog'liqlik va yuzlab
 * kilobayt qo'shadi, bu esa ulushli cPanel xostingida (Q18)
 * xotira va o'rnatish vaqtiga tegadi. Bizga kerak bo'lgani esa
 * bitta varaq, sarlavha va qiymatlar. XLSX — oddiy ZIP ichidagi
 * XML; yozuvchi ~120 qator.
 *
 * TEKSHIRILGAN: ochiq manbali `openpyxl` (haqiqiy o'quvchi) bu
 * fayllarni o'qiydi va qiymatlar manbaga teng
 * (`test/reports.e2e-spec.ts`, `qa/reports-check.mjs`).
 *
 * CHEKLOV: varaq XML si xotirada quriladi, shuning uchun
 * `MAX_XLSX_ROWS` qo'yilgan. Undan katta eksport CSV bilan
 * OQIMLI beriladi (`docs/REPORTS-POLICY.md` §5).
 */

export const MAX_XLSX_ROWS = 50_000;

export type XlsxCell = string | number | null;

// ---------------------------------------------------------------- CRC-32

/** O'zim yozdim: `zlib.crc32` faqat Node 22.2+ da, xosting versiyasi esa noma'lum (Q18). */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);

  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }

  return table;
})();

export function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = (CRC_TABLE[(crc ^ byte) & 0xff] as number) ^ (crc >>> 8);

  return (crc ^ 0xffffffff) >>> 0;
}

// ---------------------------------------------------------------- ZIP

interface ZipEntry {
  name: string;
  data: Buffer;
}

/** DOS vaqti: ZIP shuni talab qiladi. Qat'iy qiymat — fayl bayt-bayt bir xil chiqadi. */
const DOS_TIME = 0;
const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1; // 2026-01-01

export function zip(entries: readonly ZipEntry[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const compressed = deflateRawSync(entry.data);
    const crc = crc32(entry.data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // versiya
    local.writeUInt16LE(0x0800, 6); // UTF-8 nomlar
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(entry.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);

    locals.push(local, name, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(DOS_TIME, 12);
    central.writeUInt16LE(DOS_DATE, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(entry.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);

    centrals.push(central, name);
    offset += local.length + name.length + compressed.length;
  }

  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0);

  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);

  return Buffer.concat([...locals, ...centrals, end]);
}

// ---------------------------------------------------------------- XML

/**
 * XML'da TAQIQLANGAN belgilar (0x00-0x08, 0x0B, 0x0C, 0x0E-0x1F).
 *
 * Ariza formasidan kelgan matnda bo'lishi mumkin va bitta shunday
 * belgi BUTUN faylni Excel'da "buzilgan" qilib qo'yadi — qaysi
 * katakda ekanini ham ko'rsatmasdan.
 */
// eslint-disable-next-line no-control-regex
const INVALID_XML = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;

function escapeXml(value: string): string {
  return value
    .replace(INVALID_XML, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** `0 -> A`, `26 -> AA`. */
export function columnName(index: number): string {
  let name = '';
  let n = index;

  do {
    name = String.fromCharCode(65 + (n % 26)) + name;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);

  return name;
}

function cell(ref: string, value: XlsxCell, style?: number): string {
  const s = style !== undefined ? ` s="${style}"` : '';

  if (value === null) return `<c r="${ref}"${s}/>`;

  if (typeof value === 'number') {
    // NaN va Infinity XML'da raqam emas — Excel faylni ochmaydi.
    if (!Number.isFinite(value)) return `<c r="${ref}"${s}/>`;

    return `<c r="${ref}"${s}><v>${value}</v></c>`;
  }

  /*
    `inlineStr` — MATN, formula EMAS. Shuning uchun bu yerda CSV'dagi
    kabi `'` qo'yish kerak emas: `=1+1` katakda aynan `=1+1` bo'lib
    qoladi.
  */
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
}

export function buildXlsx(input: {
  sheetName: string;
  header: readonly string[];
  rows: readonly (readonly XlsxCell[])[];
}): Buffer {
  if (input.rows.length > MAX_XLSX_ROWS) {
    throw new RangeError(`XLSX ${MAX_XLSX_ROWS} qatordan oshmasligi kerak`);
  }

  const sheetRows: string[] = [];

  sheetRows.push(
    `<row r="1">${input.header.map((label, i) => cell(`${columnName(i)}1`, label, 1)).join('')}</row>`,
  );

  input.rows.forEach((row, index) => {
    const r = index + 2;
    sheetRows.push(
      `<row r="${r}">${row.map((value, i) => cell(`${columnName(i)}${r}`, value)).join('')}</row>`,
    );
  });

  const sheet =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` +
    `<sheetData>${sheetRows.join('')}</sheetData></worksheet>`;

  // Varaq nomi: Excel 31 belgi va `[]:*?/\` ni taqiqlaydi.
  const sheetName = escapeXml(
    input.sheetName.replace(/[[\]:*?/\\]/g, ' ').slice(0, 31) || 'Hisobot',
  );

  const files: ZipEntry[] = [
    {
      name: '[Content_Types].xml',
      data: Buffer.from(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
          `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
          `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
          `<Default Extension="xml" ContentType="application/xml"/>` +
          `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
          `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
          `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
          `</Types>`,
      ),
    },
    {
      name: '_rels/.rels',
      data: Buffer.from(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
          `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
          `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
          `</Relationships>`,
      ),
    },
    {
      name: 'xl/workbook.xml',
      data: Buffer.from(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
          `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
          `<sheets><sheet name="${sheetName}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
      ),
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      data: Buffer.from(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
          `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
          `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
          `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
          `</Relationships>`,
      ),
    },
    {
      name: 'xl/styles.xml',
      // 0 — oddiy, 1 — qalin sarlavha.
      data: Buffer.from(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
          `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
          `<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>` +
          `<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>` +
          `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
          `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
          `<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>` +
          `</styleSheet>`,
      ),
    },
    { name: 'xl/worksheets/sheet1.xml', data: Buffer.from(sheet, 'utf8') },
  ];

  return zip(files);
}
