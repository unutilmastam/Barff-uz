import { Injectable } from '@nestjs/common';
import { type Prisma } from '@barff/db';
import { PrismaService } from '../prisma/prisma.service';

/**
 * CSV eksport — buxgalteriya uchun (CLAUDE.md §22).
 *
 * NEGA CSV VA NEGA PDF EMAS.
 *
 * Rasmiy O'zbekiston hisob-faktura shakli va QQS qoidalari BARFF
 * dan kelmagan (`docs/OPEN-QUESTIONS.md` Q17). PDF generatori
 * qo'shilsa, u O'YLAB TOPILGAN shaklda rasmiy ko'rinadigan hujjat
 * chiqarardi — `CLAUDE.md`: "Never invent real company facts".
 *
 * CSV esa shakl DA'VO QILMAYDI: u raqamlar ro'yxati va
 * buxgalter uni o'z dasturiga yuklaydi. Yangi bog'liqlik ham
 * kerak emas.
 *
 * Chop etiladigan ko'rinish esa brauzerda: «Chop etish → PDF
 * sifatida saqlash» (`docs/BILLING-POLICY.md` §0).
 */
@Injectable()
export class BillingExportService {
  constructor(private readonly prisma: PrismaService) {}

  async invoicesCsv(query: { from?: Date | undefined; to?: Date | undefined }): Promise<string> {
    const where: Prisma.InvoiceWhereInput = {
      deletedAt: null,
      // Qoralama eksportga TUSHMAYDI: u hali berilmagan hujjat.
      status: { not: 'DRAFT' },
      ...(query.from !== undefined || query.to !== undefined
        ? {
            issuedAt: {
              ...(query.from !== undefined ? { gte: query.from } : {}),
              ...(query.to !== undefined ? { lte: query.to } : {}),
            },
          }
        : {}),
    };

    const invoices = await this.prisma.invoice.findMany({
      where,
      orderBy: [{ issuedAt: 'asc' }, { number: 'asc' }],
      take: 10_000,
      select: {
        number: true,
        status: true,
        issuedAt: true,
        dueAt: true,
        subtotal: true,
        discount: true,
        taxAmount: true,
        total: true,
        currency: true,
        dealer: { select: { companyName: true, taxId: true } },
        order: { select: { number: true } },
        allocations: { select: { amount: true } },
      },
    });

    const rows = invoices.map((invoice) => {
      const allocated = invoice.allocations.reduce((sum, row) => sum + row.amount, 0);

      return [
        invoice.number,
        invoice.order?.number ?? '',
        invoice.dealer?.companyName ?? '',
        invoice.dealer?.taxId ?? '',
        invoice.status,
        invoice.issuedAt?.toISOString().slice(0, 10) ?? '',
        invoice.dueAt?.toISOString().slice(0, 10) ?? '',
        /*
          SUMMALAR TIYINDA CHIQADI.

          So'mga aylantirib yuborish kasr ustun hosil qilardi va
          buxgalterning dasturi uni mahalliy o'nlik ajratgichi
          bilan boshqacha o'qishi mumkin edi. Tiyin — butun son
          va u bir ma'noli.
        */
        String(invoice.subtotal),
        String(invoice.discount),
        String(invoice.taxAmount),
        String(invoice.total),
        String(allocated),
        String(invoice.total - allocated),
        invoice.currency,
      ];
    });

    return toCsv(
      [
        'hisob_faktura',
        'buyurtma',
        'diler',
        'stir',
        'holat',
        'berilgan',
        'muddat',
        'oraliq_jami_tiyin',
        'chegirma_tiyin',
        'soliq_tiyin',
        'jami_tiyin',
        'tolangan_tiyin',
        'qolgan_tiyin',
        'valyuta',
      ],
      rows,
    );
  }

  async paymentsCsv(query: { from?: Date | undefined; to?: Date | undefined }): Promise<string> {
    const where: Prisma.PaymentWhereInput = {
      deletedAt: null,
      ...(query.from !== undefined || query.to !== undefined
        ? {
            receivedAt: {
              ...(query.from !== undefined ? { gte: query.from } : {}),
              ...(query.to !== undefined ? { lte: query.to } : {}),
            },
          }
        : {}),
    };

    const payments = await this.prisma.payment.findMany({
      where,
      orderBy: [{ receivedAt: 'asc' }, { number: 'asc' }],
      take: 10_000,
      select: {
        number: true,
        amount: true,
        currency: true,
        method: true,
        reference: true,
        receivedAt: true,
        dealer: { select: { companyName: true, taxId: true } },
        allocations: { select: { amount: true, invoice: { select: { number: true } } } },
      },
    });

    const rows = payments.map((payment) => {
      const allocated = payment.allocations.reduce((sum, row) => sum + row.amount, 0);

      return [
        payment.number,
        payment.dealer?.companyName ?? '',
        payment.dealer?.taxId ?? '',
        payment.receivedAt.toISOString().slice(0, 10),
        payment.method,
        payment.reference ?? '',
        String(payment.amount),
        String(allocated),
        String(payment.amount - allocated),
        payment.allocations.map((row) => row.invoice.number).join(' '),
        payment.currency,
      ];
    });

    return toCsv(
      [
        'tolov',
        'diler',
        'stir',
        'kelgan_sana',
        'usul',
        'havola',
        'summa_tiyin',
        'taqsimlangan_tiyin',
        'taqsimlanmagan_tiyin',
        'hisob_fakturalar',
        'valyuta',
      ],
      rows,
    );
  }
}

/**
 * CSV qatori.
 *
 * QO'SH TIRNOQ HAR DOIM QO'YILADI va ichidagisi ikkilantiriladi.
 * Shartli qo'yish ("faqat vergul bo'lsa") kompaniya nomida
 * tirnoq yoki yangi qator bo'lgan holatni buzardi — va bunday
 * nom haqiqatda uchraydi.
 *
 * BOM QO'SHILADI: usiz Excel UTF-8 ni o'zbekcha harflar bilan
 * noto'g'ri o'qiydi va `so‘m` `soâ€˜m` bo'lib chiqadi.
 */
function toCsv(header: string[], rows: string[][]): string {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const lines = [header, ...rows].map((row) => row.map(escape).join(','));

  return `\uFEFF${lines.join('\r\n')}\r\n`;
}
