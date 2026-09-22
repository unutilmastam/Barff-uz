# @barff/db

Generatsiya qilingan Prisma klienti. Ilovalar `@prisma/client` ni
**to'g'ridan-to'g'ri import qilmaydi** — hammasi shu paket orqali o'tadi,
shuning uchun klient joyi yoki versiyasi o'zgarsa, o'zgarish shu yerda qoladi.

```ts
import { PrismaClient, Prisma, type User } from '@barff/db';
```

Sxema va migratsiyalar repo ildizidagi `prisma/` papkasida (CLAUDE.md §15).
`generated/` commit qilinmaydi — u `pnpm db:generate` bilan qayta yaratiladi,
va turbo `build` zanjirida avtomatik ishlaydi.
