import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

/**
 * Repo ildizini FAYL joylashuviga qarab topadi.
 *
 * NEGA nisbiy yo'l emas: `'../../.env'` kabi yo'l joriy ishchi katalogga
 * (CWD) nisbatan hisoblanadi. Natijada `pnpm --filter @barff/api dev`
 * (CWD = services/api) da to'g'ri ishlaydi, `node services/api/dist/main.js`
 * (CWD = repo ildizi) da esa butunlay boshqa joyga ko'rsatadi va xato
 * bermasdan, jimgina boshqa fayl yuklanadi.
 *
 * Yuqoriga qarab `pnpm-workspace.yaml` izlanadi — u faqat ildizda bo'ladi.
 */
export function findRepoRoot(startDir: string = __dirname): string | null {
  let current = resolve(startDir);

  for (;;) {
    if (existsSync(join(current, 'pnpm-workspace.yaml'))) return current;

    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

/**
 * Lokal ishlab chiqish uchun `.env` yo'li.
 *
 * Production'da bu fayl bo'lmaydi va bo'lmasligi ham kerak: u yerda muhit
 * o'zgaruvchilari ECS task definition va AWS Secrets Manager orqali keladi
 * (CLAUDE.md §12). Fayl topilmasa — bu xato emas.
 */
export function localEnvFilePath(): string[] {
  const root = findRepoRoot();
  return root === null ? [] : [join(root, '.env')];
}
