'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { BUSINESS_TYPES, leadCreateSchema } from '@barff/validation';
import { Button, GlassCard, Input, Select, Textarea } from '@barff/ui';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { type Messages } from '@/i18n/dictionary';
import { ApiRequestError, apiFetch } from '@/lib/api-client';
import { withEmptyAsUndefined } from '@/lib/form';

type FormValues = {
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
  region: string;
  businessType: string;
  desiredProducts: string;
  estimatedMonthlyVolume: string;
  message: string;
  honeypot: string;
};

type Status = 'idle' | 'sending' | 'success' | 'error' | 'throttled';

/**
 * B2B hamkorlik formasi (CLAUDE.md §9).
 *
 * Validatsiya SERVER bilan BIR XIL sxemadan (`@barff/validation`):
 * mijozdagi tekshiruv — qulaylik, haqiqiy tekshiruv esa serverda.
 * Ikki joyda ikki xil qoida yozilsa, ular vaqt o'tib bir-biridan
 * ajralib ketardi.
 *
 * `honeypot` — ko'zdan yashirin maydon. Odam uni ko'rmaydi va
 * to'ldirmaydi; avtomatik to'ldiruvchi bot esa to'ldiradi va so'rov
 * serverda rad etiladi. `aria-hidden` va `tabIndex={-1}` bilan u
 * ekran o'quvchi va klaviatura uchun ham mavjud emas.
 */
export function LeadForm({ messages }: { messages: Messages }) {
  const [status, setStatus] = useState<Status>('idle');

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(withEmptyAsUndefined(leadCreateSchema) as never),
    defaultValues: {
      companyName: '',
      contactName: '',
      phone: '',
      email: '',
      region: '',
      businessType: '',
      desiredProducts: '',
      estimatedMonthlyVolume: '',
      message: '',
      honeypot: '',
    },
  });

  const typeLabels: Record<(typeof BUSINESS_TYPES)[number], string> = {
    DISTRIBUTOR: messages.lead.typeDistributor,
    WHOLESALE: messages.lead.typeWholesale,
    RETAIL: messages.lead.typeRetail,
    HORECA: messages.lead.typeHoreca,
    OTHER: messages.lead.typeOther,
  };

  const onSubmit = handleSubmit(async (values) => {
    setStatus('sending');

    /*
      `values` — sxemadan CHIQQAN qiymatlar, forma maydonlari emas:
      resolver bo'sh satrlarni allaqachon `undefined` ga aylantirgan va
      telefonni normallashtirgan. Shuning uchun bu yerda qo'shimcha
      tozalash kerak emas — faqat bot tuzog'i olib tashlanadi, u
      serverga yuborilmasligi kerak.
    */
    const { honeypot: _honeypot, ...payload } = values as Record<string, unknown>;

    try {
      await apiFetch('/leads', { method: 'POST', body: payload });

      setStatus('success');
      reset();
    } catch (error) {
      // 429 — alohida xabar: "xato" emas, "biroz kuting".
      setStatus(
        error instanceof ApiRequestError && error.statusCode === 429 ? 'throttled' : 'error',
      );
    }
  });

  if (status === 'success') {
    return (
      <GlassCard role="status" className="p-8">
        <h2 className="text-xl font-semibold">{messages.lead.successTitle}</h2>
        <p className="mt-3 text-[var(--color-fg-muted)]">{messages.lead.successBody}</p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-6 sm:p-8">
      {/*
        `noValidate` — brauzerning o'z xabarlari o'chiriladi: ular
        tarjima qilinmaydi va sahifa tilidan farq qilib qolardi.
        Tekshiruvni sxema bajaradi.
      */}
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label={messages.lead.companyName}
            required
            autoComplete="organization"
            error={errors.companyName?.message}
            {...register('companyName')}
          />

          <Input
            label={messages.lead.contactName}
            required
            autoComplete="name"
            error={errors.contactName?.message}
            {...register('contactName')}
          />

          <Input
            label={messages.lead.phone}
            required
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            hint={messages.lead.phoneHint}
            error={errors.phone?.message}
            {...register('phone')}
          />

          <Input
            label={messages.lead.email}
            type="email"
            inputMode="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label={messages.lead.region}
            required
            autoComplete="address-level1"
            error={errors.region?.message}
            {...register('region')}
          />

          <Controller
            control={control}
            name="businessType"
            render={({ field }) => (
              <Select
                label={messages.lead.businessType}
                required
                placeholder={messages.lead.businessTypePlaceholder}
                options={BUSINESS_TYPES.map((value) => ({ value, label: typeLabels[value] }))}
                value={field.value}
                onValueChange={field.onChange}
                error={errors.businessType?.message}
              />
            )}
          />

          <Input
            label={messages.lead.desiredProducts}
            error={errors.desiredProducts?.message}
            {...register('desiredProducts')}
          />

          <Input
            label={messages.lead.estimatedMonthlyVolume}
            type="number"
            inputMode="numeric"
            min={0}
            error={errors.estimatedMonthlyVolume?.message}
            {...register('estimatedMonthlyVolume')}
          />
        </div>

        <Textarea
          label={messages.lead.message}
          rows={4}
          error={errors.message?.message}
          {...register('message')}
        />

        {/*
          Bot tuzog'i: maydon `display: none` bilan yashiringan, shuning
          uchun odam ham, ekran o'quvchi ham uni ko'rmaydi va hech
          qachon to'ldirmaydi. Formani ko'r-ko'rona to'ldiradigan
          oddiy bot esa to'ldiradi va server so'rovni rad etadi.

          Bu YAGONA himoya emas: haqiqiy brauzerda ishlaydigan murakkab
          bot yashirin maydonni chetlab o'tishi mumkin. Shu sababli
          tezlik chegarasi va takrorni aniqlash ham bor.
        */}
        <div hidden aria-hidden="true">
          {/* i18n-exempt: yashirin maydon yorlig'i, uni hech kim ko'rmaydi. */}
          <label htmlFor="barff-hp">Do not fill</label>
          <input id="barff-hp" tabIndex={-1} autoComplete="off" {...register('honeypot')} />
        </div>

        {(status === 'error' || status === 'throttled') && (
          <div role="alert" className="rounded-lg border border-[var(--color-danger)] px-4 py-3">
            <p className="font-medium">
              {status === 'throttled' ? messages.lead.tooManyTitle : messages.lead.errorTitle}
            </p>
            <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
              {status === 'throttled' ? messages.lead.tooManyBody : messages.lead.errorBody}
            </p>
          </div>
        )}

        <div>
          <Button type="submit" size="lg" disabled={status === 'sending'}>
            {status === 'sending' ? messages.lead.submitting : messages.lead.submit}
          </Button>
        </div>
      </form>
    </GlassCard>
  );
}
