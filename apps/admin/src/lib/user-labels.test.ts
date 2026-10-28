import { describe, expect, it } from 'vitest';
import { formatLastLogin, generatePassword, roleLabel, STAFF_ROLE_OPTIONS } from './user-labels';

describe('generatePassword', () => {
  it('berilgan uzunlikda va serverning 10 belgi talabidan uzun', () => {
    expect(generatePassword()).toHaveLength(14);
    expect(generatePassword(20)).toHaveLength(20);
    expect(generatePassword().length).toBeGreaterThanOrEqual(10);
  });

  it('adashtiradigan belgilarsiz va har safar boshqacha', () => {
    const seen = new Set<string>();

    for (let i = 0; i < 200; i += 1) {
      const password = generatePassword();
      expect(password).toMatch(/^[A-HJ-NP-Za-km-z2-9]+$/);
      seen.add(password);
    }

    expect(seen.size).toBe(200);
  });
});

describe('rol nomlari', () => {
  it('har bir xodim roli o‘zbekcha nomga ega', () => {
    for (const role of STAFF_ROLE_OPTIONS) expect(roleLabel(role.code)).toBe(role.label);
    expect(roleLabel('NOMA_LUM')).toBe('NOMA_LUM');
  });

  it('oxirgi kirish', () => {
    expect(formatLastLogin(null)).toBe('Hali kirmagan');
    expect(formatLastLogin('2026-10-28T10:00:00Z')).not.toBe('Hali kirmagan');
  });
});
