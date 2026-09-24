import Link from 'next/link';
import { GlassCard } from '@barff/ui';

export const dynamic = 'force-dynamic';

/**
 * Sahifa kontenti bo'limlariga kirish nuqtasi.
 *
 * Bosh sahifa bo'limlari, ishlab chiqarish bosqichlari va SEO — uchalasi
 * ham "sahifa kontenti", shuning uchun ular bitta joydan ochiladi.
 */
const LINKS = [
  {
    href: '/content/homepage',
    title: 'Bosh sahifa bo‘limlari',
    body: 'Hero, zavod, CTA va boshqa bo‘limlarning matni va rasmi.',
  },
  {
    href: '/content/production',
    title: 'Ishlab chiqarish bosqichlari',
    body: 'Xomashyodan yetkazib berishgacha bo‘lgan bosqichlar matni.',
  },
  {
    href: '/content/seo',
    title: 'SEO',
    body: 'Har bir sahifaning sarlavhasi, tavsifi va indekslash qoidasi.',
  },
];

export default function PagesHub() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sahifalar va SEO</h1>
        <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
          Ommaviy saytdagi sahifalarning matni va qidiruv ma‘lumoti.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LINKS.map((link) => (
          <GlassCard key={link.href} interactive className="relative p-5">
            <h2 className="font-medium">
              <Link href={link.href} className="after:absolute after:inset-0 after:content-['']">
                {link.title}
              </Link>
            </h2>
            <p className="mt-2 text-sm text-[var(--color-fg-muted)]">{link.body}</p>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
