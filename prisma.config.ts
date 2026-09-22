import path from 'node:path';
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/**
 * Prisma CLI konfiguratsiyasi.
 *
 * `package.json#prisma` Prisma 7 da olib tashlanadi, shuning uchun sozlamalar
 * shu yerda. `dotenv/config` alohida import qilinadi: config fayli .env ni
 * o'zi yuklamaydi, natijada `DATABASE_URL` topilmay qolardi.
 */
export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    path: path.join('prisma', 'migrations'),
    seed: 'tsx prisma/seed.ts',
  },
});
