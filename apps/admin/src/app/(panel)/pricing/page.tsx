'use client';

import { Input, Select } from '@barff/ui';
import { ResourceScreen } from '@/components/resource/ResourceScreen';

interface PriceRuleRow {
  id: string;
  name: string;
  kind: 'FIXED_PRICE' | 'PERCENT_DISCOUNT' | 'AMOUNT_DISCOUNT';
  amount: number;
  minQuantity: number;
  code: string | null;
  priority: number;
  isActive: boolean;
  dealerId: string | null;
  tierId: string | null;
  region: string | null;
  variantId: string | null;
  productId: string | null;
  categoryId: string | null;
}

const KINDS = [
  { value: 'FIXED_PRICE', label: 'Qat’iy narx (tiyin)' },
  { value: 'PERCENT_DISCOUNT', label: 'Foizli chegirma (bazis punkt)' },
  { value: 'AMOUNT_DISCOUNT', label: 'Summali chegirma (tiyin)' },
] as const;

/**
 * `amount` MA'NOSI `kind` ga bog'liq.
 *
 * Bu eng chalkash joy: `2000` foizli qoidada 20%, summali qoidada
 * esa 20 so'm. Shuning uchun jadvalda ham, formada ham qiymat
 * O'QILADIGAN ko'rinishda ko'rsatiladi — aks holda xodim 20% o'rniga
 * 2000% yozib qo'yishi hech gap emas.
 */
function readableAmount(row: Pick<PriceRuleRow, 'kind' | 'amount'>): string {
  if (row.kind === 'PERCENT_DISCOUNT') return `${(row.amount / 100).toFixed(2)}%`;

  return `${(row.amount / 100).toLocaleString('uz-UZ')} so‘m`;
}

/** Qoida KIMGA va NIMAGA tegishli — qisqa matn. */
function scope(row: PriceRuleRow): string {
  const who =
    row.dealerId !== null
      ? 'diler'
      : row.tierId !== null
        ? 'daraja'
        : row.region !== null
          ? row.region
          : 'hammaga';

  const what =
    row.variantId !== null
      ? 'variant'
      : row.productId !== null
        ? 'mahsulot'
        : row.categoryId !== null
          ? 'kategoriya'
          : 'butun katalog';

  return `${who} · ${what}`;
}

/**
 * Narx qoidalari (CLAUDE.md §5, S23).
 *
 * Qamrov maydonlari UUID sifatida kiritiladi. Tanlagichlar (mahsulot,
 * diler, daraja ro'yxati) keyingi qadamda — hozir muhimi qoidalar
 * YARATILA olishi va ularning ta'siri darhol kuchga kirishi.
 *
 * Narx SERVERDA hisoblanadi (`price-resolver.ts`). Bu ekran faqat
 * qoidalarni boshqaradi va HECH NARSANI o'zi hisoblamaydi.
 */
export default function PricingPage() {
  return (
    <ResourceScreen<PriceRuleRow>
      title="Narx qoidalari"
      description="Qoidalar ustunlik bo‘yicha qo‘llanadi: diler → daraja → hudud, so‘ng variant → mahsulot → kategoriya. Har bosqichda FAQAT BITTA qoida ishlaydi — chegirmalar ustma-ust qo‘yilmaydi."
      endpoint="/admin/price-rules"
      queryKey="admin-price-rules"
      rowId={(row) => row.id}
      columns={[
        { key: 'name', header: 'Nomi', cell: (row) => row.name },
        { key: 'amount', header: 'Qiymat', cell: (row) => readableAmount(row) },
        { key: 'scope', header: 'Qamrov', cell: (row) => scope(row) },
        {
          key: 'minQuantity',
          header: 'Eng kam miqdor',
          cell: (row) => (row.minQuantity > 1 ? String(row.minQuantity) : '—'),
        },
        { key: 'code', header: 'Aksiya kodi', cell: (row) => row.code ?? '—' },
        { key: 'priority', header: 'Ustunlik', cell: (row) => String(row.priority) },
      ]}
      emptyValue={() => ({
        name: '',
        kind: 'PERCENT_DISCOUNT',
        amount: 0,
        minQuantity: 1,
        priority: 0,
        isActive: true,
        variantId: null,
        productId: null,
        categoryId: null,
        dealerId: null,
        tierId: null,
        region: null,
        code: null,
      })}
      toForm={(row) => ({ ...row })}
      validate={(value) => {
        if (String(value['name'] ?? '').trim().length < 2) return 'Nom kiritilishi shart.';

        const amount = Number(value['amount'] ?? 0);
        if (!Number.isInteger(amount) || amount < 0)
          return 'Qiymat butun va manfiy bo‘lmasligi kerak.';

        // Serverda ham tekshiriladi (CLAUDE.md §12) — bu faqat qulaylik.
        if (value['kind'] === 'PERCENT_DISCOUNT' && amount > 10_000) {
          return 'Foizli chegirma 100% dan oshmasligi kerak (10 000 bazis punkt).';
        }

        return null;
      }}
      toPayload={(value) => {
        // Bo'sh matn — "qamrov yo'q" degani, ya'ni `null`.
        const blankToNull = (key: string) => {
          const raw = value[key];
          const text = typeof raw === 'string' ? raw.trim() : raw;

          return text === '' || text === undefined ? null : text;
        };

        return {
          name: String(value['name']).trim(),
          kind: value['kind'],
          amount: Number(value['amount'] ?? 0),
          minQuantity: Number(value['minQuantity'] ?? 1),
          priority: Number(value['priority'] ?? 0),
          isActive: value['isActive'] !== false,
          variantId: blankToNull('variantId'),
          productId: blankToNull('productId'),
          categoryId: blankToNull('categoryId'),
          dealerId: blankToNull('dealerId'),
          tierId: blankToNull('tierId'),
          region: blankToNull('region'),
          code: blankToNull('code'),
        };
      }}
      renderForm={(value, setValue) => (
        <>
          <Input
            label="Nomi"
            required
            value={String(value['name'] ?? '')}
            onChange={(event) => setValue({ ...value, name: event.target.value })}
          />

          <Select
            label="Turi"
            options={KINDS}
            value={String(value['kind'] ?? 'PERCENT_DISCOUNT')}
            onValueChange={(next) => setValue({ ...value, kind: next })}
          />

          <Input
            label={
              value['kind'] === 'PERCENT_DISCOUNT'
                ? 'Qiymat (bazis punkt: 250 = 2.5%)'
                : 'Qiymat (tiyin: 100 000 = 1000 so‘m)'
            }
            type="number"
            min={0}
            required
            value={String(value['amount'] ?? 0)}
            onChange={(event) => setValue({ ...value, amount: Number(event.target.value) || 0 })}
          />

          <Input
            label="Shu miqdordan boshlab (hajm chegirmasi)"
            type="number"
            min={1}
            value={String(value['minQuantity'] ?? 1)}
            onChange={(event) =>
              setValue({ ...value, minQuantity: Number(event.target.value) || 1 })
            }
          />

          <Input
            label="Aksiya kodi (bo‘sh — kodsiz qoida)"
            value={String(value['code'] ?? '')}
            onChange={(event) => setValue({ ...value, code: event.target.value.toUpperCase() })}
          />

          <Input
            label="Hudud (bo‘sh — barcha hududlar)"
            value={String(value['region'] ?? '')}
            onChange={(event) => setValue({ ...value, region: event.target.value })}
          />

          <Input
            label="Diler ID (bo‘sh — barcha dilerlar)"
            value={String(value['dealerId'] ?? '')}
            onChange={(event) => setValue({ ...value, dealerId: event.target.value })}
          />

          <Input
            label="Daraja ID (bo‘sh — barcha darajalar)"
            value={String(value['tierId'] ?? '')}
            onChange={(event) => setValue({ ...value, tierId: event.target.value })}
          />

          <Input
            label="Kategoriya ID (bo‘sh — butun katalog)"
            value={String(value['categoryId'] ?? '')}
            onChange={(event) => setValue({ ...value, categoryId: event.target.value })}
          />

          <Input
            label="Mahsulot ID"
            value={String(value['productId'] ?? '')}
            onChange={(event) => setValue({ ...value, productId: event.target.value })}
          />

          <Input
            label="Variant ID"
            value={String(value['variantId'] ?? '')}
            onChange={(event) => setValue({ ...value, variantId: event.target.value })}
          />

          <Input
            label="Ustunlik (aniqlik teng bo‘lsa hal qiladi)"
            type="number"
            min={0}
            value={String(value['priority'] ?? 0)}
            onChange={(event) => setValue({ ...value, priority: Number(event.target.value) || 0 })}
          />
        </>
      )}
    />
  );
}
