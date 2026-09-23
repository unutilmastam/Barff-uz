import { GlassCard } from '@barff/ui';

/**
 * Bo'sh va xato holatlari.
 *
 * Har bir bo'lim UCH holatda ham ko'rinishi kerak (CLAUDE.md §29):
 * ma'lumot bor, ma'lumot yo'q, ma'lumot kelmadi. Bo'sh joy qoldirish
 * foydalanuvchiga sayt buzilganday tuyuladi.
 */
export function EmptyState({ message }: { message: string }) {
  return (
    <GlassCard className="px-6 py-10 text-center text-[var(--color-fg-muted)]">{message}</GlassCard>
  );
}

export function ErrorState({ title, body }: { title: string; body: string }) {
  return (
    // `role="status"` — ekran o'quvchi holat o'zgarganini e'lon qiladi.
    <GlassCard role="status" className="px-6 py-10 text-center">
      <p className="font-medium text-[var(--color-fg)]">{title}</p>
      <p className="mt-2 text-sm text-[var(--color-fg-muted)]">{body}</p>
    </GlassCard>
  );
}
