'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ApiRequestError, apiFetch } from '@/lib/api-client';

type Status = 'idle' | 'sending' | 'error' | 'locked' | 'offline';

/**
 * Haydovchi kirishi.
 *
 * TELEFON UCHUN: maydonlar katta (56px), tugma butun kenglikda.
 * `react-hook-form` ATAYLAB ishlatilmagan — ikkita maydon uchun
 * u ortiqcha bayt, haydovchining telefoni esa arzon bo'lishi
 * mumkin (S33 DoD: "mid-range Android").
 *
 * Token JAVOB TANASIDAN O'QILMAYDI: server uni `HttpOnly`
 * cookie'ga yozadi (CLAUDE.md §12).
 */
export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus('sending');

    try {
      await apiFetch('/auth/login', { method: 'POST', body: { email, password } });
      router.replace('/');
      router.refresh();
    } catch (error) {
      if (error instanceof ApiRequestError) {
        setStatus(error.statusCode === 403 ? 'locked' : 'error');
      } else {
        // `fetch` ning O'ZI yiqildi — tarmoq yo'q. Buni "parol
        // noto'g'ri" deb ko'rsatish haydovchini parolini
        // o'zgartirishga majbur qilardi.
        setStatus('offline');
      }
    }
  };

  const message =
    status === 'locked'
      ? 'Akkaunt vaqtincha bloklangan. Birozdan keyin urinib ko‘ring.'
      : status === 'offline'
        ? 'Aloqa yo‘q. Internetni tekshirib qayta urinib ko‘ring.'
        : status === 'error'
          ? 'Email yoki parol noto‘g‘ri.'
          : null;

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <div>
        <label htmlFor="email" className="block text-base font-medium">
          Email
        </label>
        <input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-1 min-h-14 w-full rounded-xl border-2 border-[#ccc] px-3 text-lg"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-base font-medium">
          Parol
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-1 min-h-14 w-full rounded-xl border-2 border-[#ccc] px-3 text-lg"
        />
      </div>

      {message !== null && (
        <p role="alert" className="text-base text-[#8a1f1f]">
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'sending'}
        className="min-h-16 rounded-xl bg-[#0c7830] text-xl font-bold text-white active:bg-[#0a6228] disabled:bg-[#9ab8a5]"
      >
        {status === 'sending' ? 'Tekshirilmoqda…' : 'Kirish'}
      </button>
    </form>
  );
}
