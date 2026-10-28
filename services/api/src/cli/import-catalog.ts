import 'reflect-metadata';

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { MediaVisibility, Prisma } from '@barff/db';
import { localizedSchema } from '@barff/validation';
import { z } from 'zod';
import { AppModule } from '../app.module';
import { type RequestContext } from '../auth/auth.service';
import { findRepoRoot } from '../config/repo-root';
import { MediaService } from '../media/media.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from '../products/products.service';

/**
 * Mahsulotlar katalogini rasmlari bilan yuklaydi.
 *
 *   pnpm --filter @barff/api catalog:import
 *
 * Manba: `assets/product-photos/` (yoki `CATALOG_DIR`). Rasmlar oddiy
 * yuklash quvuridan o'tadi (`MediaService.upload`): tur imzo bo'yicha
 * tekshiriladi, AVIF/WebP variantlari tayyorlanadi — admin orqali
 * yuklangan rasm bilan aynan bir xil yo'l.
 *
 * TAKRORAN ISHGA TUSHIRISH XAVFSIZ. Mavjud mahsulotga TEGILMAYDI: egasi
 * admin panelda nomni, tarkibni, narxni o'zgartirgan bo'lishi mumkin va
 * skript uning ishini qayta yozib yubormasligi kerak. Rasm faqat hali
 * rasmi YO'Q mahsulotga qo'shiladi.
 *
 * Bu skript narx, tarkib, ozuqaviy qiymat va yaroqlilik muddatini
 * YARATMAYDI (CLAUDE.md §1): ular BARFF dan keladi va admin paneldan
 * kiritiladi.
 */
const localized = localizedSchema(z.string().min(1));

const catalogSchema = z.object({
  category: z.object({ slug: z.string().min(1), name: localized }),
  products: z.array(
    z.object({
      slug: z.string().min(1),
      sku: z.string().min(1),
      name: localized,
      flavor: localized,
      variant: z.object({ sku: z.string().min(1), volumeMl: z.number().int().positive() }),
      displayOrder: z.number().int().min(0),
      images: z.array(
        z.object({
          file: z.string().min(1),
          view: z.string().min(1),
          alt: localized,
        }),
      ),
    }),
  ),
});

const ctx: RequestContext = { ip: 'cli', userAgent: 'catalog-import' };

function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

async function run(): Promise<void> {
  const root = findRepoRoot();
  const dir =
    process.env['CATALOG_DIR'] ?? (root !== null ? join(root, 'assets/product-photos') : '');

  if (dir === '') {
    throw new Error('Katalog papkasi topilmadi. CATALOG_DIR ni bering.');
  }

  const catalog = catalogSchema.parse(
    JSON.parse(await readFile(join(dir, 'catalog.json'), 'utf8')),
  );

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });

  try {
    const prisma = app.get(PrismaService);
    const media = app.get(MediaService);
    const products = app.get(ProductsService);

    const category = await prisma.productCategory.upsert({
      where: { slug: catalog.category.slug },
      update: {},
      create: { slug: catalog.category.slug, name: json(catalog.category.name) },
    });

    let created = 0;
    let skipped = 0;
    let photos = 0;

    for (const item of catalog.products) {
      let product = await prisma.product.findUnique({ where: { slug: item.slug } });

      if (product === null) {
        product = await prisma.product.create({
          data: {
            slug: item.slug,
            sku: item.sku,
            categoryId: category.id,
            name: json(item.name),
            flavor: json(item.flavor),
            displayOrder: item.displayOrder,
            variants: {
              create: { sku: item.variant.sku, volumeMl: item.variant.volumeMl },
            },
          },
        });
        created += 1;
      } else {
        skipped += 1;
      }

      const hasImages = (await prisma.productImage.count({ where: { productId: product.id } })) > 0;

      if (hasImages) continue;

      for (const [index, image] of item.images.entries()) {
        const buffer = await readFile(join(dir, image.file));
        const checksum = createHash('sha256').update(buffer).digest('hex');

        // Oldingi to'liq bo'lmagan ishga tushirishdan qolgan fayl qayta yuklanmaydi.
        let asset = await prisma.mediaAsset.findFirst({
          where: { checksum, visibility: MediaVisibility.PUBLIC, deletedAt: null },
        });

        asset ??= await media.upload({
          buffer,
          originalName: image.file.replace('/', '-'),
          visibility: MediaVisibility.PUBLIC,
          ctx,
        });

        await prisma.mediaAsset.update({
          where: { id: asset.id },
          data: { altText: json(image.alt) },
        });

        await products.addImage(
          product.id,
          { mediaAssetId: asset.id, isPrimary: index === 0, displayOrder: index },
          undefined,
          ctx,
        );
        photos += 1;
      }
    }

    // Eski namunaviy ([MOCK]) yozuvlar saytda qolmasligi kerak. Yumshoq
    // o'chiriladi: ombor/buyurtma yozuvlari ularga havola qilgan bo'lishi
    // mumkin va tarix buzilmaydi.
    const retired = await prisma.product.updateMany({
      where: { sku: { startsWith: 'MOCK-' }, deletedAt: null },
      data: { deletedAt: new Date(), isActive: false },
    });
    await prisma.productCategory.updateMany({
      where: { slug: 'mock-sharbatlar', deletedAt: null },
      data: { deletedAt: new Date(), isActive: false },
    });

    process.stdout.write(
      `Katalog: ${created} ta yangi mahsulot, ${skipped} ta mavjud (tegilmadi), ` +
        `${photos} ta rasm biriktirildi, ${retired.count} ta MOCK yashirildi.\n`,
    );
  } finally {
    await app.close();
  }
}

run().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
