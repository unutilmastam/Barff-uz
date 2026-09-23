'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@barff/validation';
import { Button, GlassCard, Input } from '@barff/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ApiRequestError, apiFetch } from '@/lib/api-client';

type Status = 'idle' | 'sending' | 'error' | 'locked';

/**
 * Kirish formasi.
 *
 * Token JAVOB TANASIDAN O'QILMAYDI va saqlanmaydi: server uni
 * `HttpOnly` cookie'ga yozadi, ya'ni JavaScript unga umuman yeta
 * olmaydi. Shu sababli XSS bo'lgan taqdirda ham token o'g'irlanmaydi
 * (CLAUDE.md §12).
 *
 * Xato xabari ATAYLAB umumiy: "email topilmadi" va "parol noto'g'ri"
 * ni ajratish qaysi emaillar ro'yxatdan o'tganini aniqlashga yo'l
 * ochardi.
 */
export function LoginForm() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('idle');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ email: string; password: string }>({
    resolver: zodResolver(loginSchema as never),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setStatus('sending');

    try {
      await apiFetch('/auth/login', { method: 'POST', body: values });

      // `refresh()` server komponentlarini qayta o'qishga majburlaydi,
      // shunda yangi sessiya bilan `/` ga o'tiladi.
      router.replace('/');
      router.refresh();
    } catch (error) {
      const locked = error instanceof ApiRequestError && error.statusCode === 403;
      setStatus(locked ? 'locked' : 'error');
    }
  });

  return (
    <GlassCard className="p-6">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <Input
          label="Email"
          type="email"
          autoComplete="username"
          required
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="Parol"
          type="password"
          autoComplete="current-password"
          required
          error={errors.password?.message}
          {...register('password')}
        />

        {(status === 'error' || status === 'locked') && (
          <p role="alert" className="text-sm text-[var(--color-danger)]">
            {status === 'locked'
              ? 'Akkaunt vaqtincha bloklangan. Birozdan keyin urinib ko‘ring.'
              : 'Email yoki parol noto‘g‘ri.'}
          </p>
        )}

        <Button type="submit" size="lg" disabled={status === 'sending'}>
          {status === 'sending' ? 'Tekshirilmoqda' : 'Kirish'}
        </Button>
      </form>
    </GlassCard>
  );
}
