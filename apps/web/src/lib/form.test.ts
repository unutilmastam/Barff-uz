import { describe, expect, it } from 'vitest';
import { leadCreateSchema } from '@barff/validation';
import { withEmptyAsUndefined } from './form';

const base = {
  companyName: 'Anor Savdo',
  contactName: 'Ali Valiyev',
  phone: '+998 90 123 45 67',
  region: 'Toshkent',
  businessType: 'DISTRIBUTOR',
};

describe('withEmptyAsUndefined', () => {
  /**
   * Eng muhim holat: to'ldirilmagan ixtiyoriy maydon formani
   * bloklamasligi kerak. Busiz `email: ''` "noto'g'ri email" berardi.
   */
  it('toldirilmagan ixtiyoriy maydon xato bermaydi', () => {
    const schema = withEmptyAsUndefined(leadCreateSchema);

    const result = schema.safeParse({
      ...base,
      email: '',
      desiredProducts: '',
      estimatedMonthlyVolume: '',
      message: '',
      honeypot: '',
    });

    expect(result.success).toBe(true);
  });

  it('xom sxema bosh email bilan yiqiladi (shuning uchun bu qatlam kerak)', () => {
    const result = leadCreateSchema.safeParse({ ...base, email: '' });

    expect(result.success).toBe(false);
  });

  it('toldirilgan qiymatlar oz holicha qoladi', () => {
    const schema = withEmptyAsUndefined(leadCreateSchema);

    const result = schema.safeParse({ ...base, email: 'a@barff.uz', message: 'Salom' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('a@barff.uz');
      expect(result.data.message).toBe('Salom');
    }
  });

  it('majburiy maydon bosh bolsa baribir xato beradi', () => {
    const schema = withEmptyAsUndefined(leadCreateSchema);

    const result = schema.safeParse({ ...base, companyName: '   ' });

    expect(result.success).toBe(false);
  });

  it('honeypot toldirilgan bolsa rad etiladi', () => {
    const schema = withEmptyAsUndefined(leadCreateSchema);

    const result = schema.safeParse({ ...base, honeypot: 'bot' });

    expect(result.success).toBe(false);
  });
});
