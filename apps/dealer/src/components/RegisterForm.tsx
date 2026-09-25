'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { BUSINESS_TYPES, type DealerRegisterInput, dealerRegisterSchema } from '@barff/validation';
import { Button, GlassCard, Input, Select, Textarea } from '@barff/ui';
import { ApiRequestError, apiFetch } from '@/lib/api-client';

type Status = 'idle' | 'sending' | 'sent' | 'error';

const BUSINESS_TYPE_LABELS: Record<string, string> = {
  DISTRIBUTOR: 'Distribyutor',
  WHOLESALE: 'Ulgurji savdo',
  RETAIL: 'Chakana savdo',
  HORECA: 'HoReCa',
  OTHER: 'Boshqa',
};

/**
 * Diler arizasi — AKKAUNT bilan birga (S22).
 *
 * Ommaviy saytdagi `/become-partner` dan FARQI: u anonim lead
 * qoldiradi va uni sotuvchi yuritadi. Bu yerda esa ariza bilan
 * BIRGA kirish akkaunti yaratiladi, ya'ni ariza egasi o'z
 * holatini portalda o'zi kuzatadi.
 *
 * AKKAUNT KIRISH HUQUQINI BERMAYDI. Diler endpoint'lari
 * `APPROVED` holatini talab qiladi (`requireActiveDealer`), ya'ni
 * tasdiqlanmagan ariza egasi kira oladi, lekin faqat o'z arizasi
 * holatini ko'radi. Bu ataylab: "parolingiz noto'g'ri" deb
 * qaytarish uni qo'ng'iroq qilishga majbur qilardi.
 *
 * Sxema SERVERDAGI bilan BIR XIL (`dealerRegisterSchema`) — mijozdagi
 * tekshiruv faqat qulaylik, haqiqiysi serverda (CLAUDE.md §11).
 */
export function RegisterForm() {
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    formState: { errors },
  } = useForm<DealerRegisterInput>({
    resolver: zodResolver(dealerRegisterSchema as never),
    defaultValues: {
      companyName: '',
      taxId: '',
      region: '',
      businessType: 'WHOLESALE',
      contactName: '',
      phone: '',
      email: '',
      password: '',
      message: '',
      honeypot: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setStatus('sending');
    setMessage(null);

    /*
      BO'SH matnli ixtiyoriy maydonlar UMUMAN yuborilmaydi.

      `taxId: ''` serverdagi `regex(/^\d{9}$/)` ni yiqitardi — ya'ni
      STIR ni ataylab bo'sh qoldirgan odam "STIR 9 ta raqamdan
      iborat bo'lishi kerak" xatosini olardi.
    */
    const body: Record<string, unknown> = { ...values };
    for (const key of ['taxId', 'message', 'honeypot']) {
      const value = body[key];
      if (typeof value === 'string' && value.trim() === '') delete body[key];
    }

    try {
      await apiFetch('/dealers/register', { method: 'POST', body });
      setStatus('sent');
    } catch (error) {
      if (error instanceof ApiRequestError) {
        // Maydonga tegishli xato o'sha maydon ostida ko'rsatiladi.
        const fieldMessage = error.fieldError('taxId') ?? error.fieldError('email');
        if (error.code === 'DEALER_TAX_ID_EXISTS') {
          setError('taxId', { message: error.message });
        }
        setMessage(
          error.statusCode === 429
            ? 'Juda ko‘p ariza yuborildi. Bir soatdan keyin urinib ko‘ring.'
            : (fieldMessage ?? error.message),
        );
      } else {
        setMessage('Arizani yuborib bo‘lmadi. Biroz keyinroq urinib ko‘ring.');
      }
      setStatus('error');
    }
  });

  if (status === 'sent') {
    return (
      <GlassCard className="flex flex-col items-start gap-4 p-6">
        <h2 className="display-4">Ariza qabul qilindi</h2>
        <p className="text-sm text-[var(--color-fg-muted)]">
          Arizangiz ko‘rib chiqilmoqda. Tasdiqlangach portalga kirib buyurtma bera olasiz. Holatni
          kuzatish uchun o‘zingiz kiritgan email va parol bilan kiring.
        </p>
        <Button asChild>
          <Link href="/login">Kirish sahifasiga</Link>
        </Button>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-6">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <Input
          label="Kompaniya nomi"
          required
          error={errors.companyName?.message}
          {...register('companyName')}
        />

        <Input
          label="STIR"
          hint="9 ta raqam. Hozircha bo‘lmasa, bo‘sh qoldiring."
          inputMode="numeric"
          error={errors.taxId?.message}
          {...register('taxId')}
        />

        <Input label="Hudud" required error={errors.region?.message} {...register('region')} />

        <Select
          label="Faoliyat turi"
          value={watch('businessType') ?? 'WHOLESALE'}
          onValueChange={(value) =>
            setValue('businessType', value as DealerRegisterInput['businessType'])
          }
          options={BUSINESS_TYPES.map((type) => ({
            value: type,
            label: BUSINESS_TYPE_LABELS[type] ?? type,
          }))}
        />

        <Input
          label="Kontakt shaxs"
          required
          autoComplete="name"
          error={errors.contactName?.message}
          {...register('contactName')}
        />

        <Input
          label="Telefon"
          type="tel"
          required
          autoComplete="tel"
          error={errors.phone?.message}
          {...register('phone')}
        />

        <Input
          label="Email"
          type="email"
          required
          autoComplete="username"
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="Parol"
          type="password"
          required
          autoComplete="new-password"
          hint="Kamida 10 belgi, katta va kichik harf hamda raqam."
          error={errors.password?.message}
          {...register('password')}
        />

        <Textarea
          label="Qo‘shimcha ma‘lumot"
          rows={3}
          error={errors.message?.message}
          {...register('message')}
        />

        {/*
          Bot tuzog'i — lead formasidagi kabi. Ekran o'quvchidan ham,
          ko'zdan ham yashirin, lekin `display: none` EMAS: ba'zi
          botlar ko'rinmas maydonni aniq shu xususiyat bilan
          aniqlaydi.
        */}
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="absolute size-0 overflow-hidden opacity-0"
          {...register('honeypot')}
        />

        {message !== null && (
          <p role="alert" className="text-sm text-[var(--color-danger)]">
            {message}
          </p>
        )}

        <Button type="submit" size="lg" disabled={status === 'sending'}>
          {status === 'sending' ? 'Yuborilmoqda' : 'Ariza yuborish'}
        </Button>
      </form>
    </GlassCard>
  );
}
