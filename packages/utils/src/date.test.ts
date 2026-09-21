import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, isValidDate, toISODate } from './date';

describe('sana', () => {
  it('ISO sanaga o’giradi', () => {
    expect(toISODate('2026-09-21T10:30:00.000Z')).toBe('2026-09-21');
  });

  it('kun qo’shadi va oy chegarasidan o’tadi', () => {
    expect(toISODate(addDays('2026-09-29T00:00:00.000Z', 3))).toBe('2026-10-02');
  });

  it('kunlar farqini hisoblaydi', () => {
    expect(daysBetween('2026-09-21', '2026-09-24')).toBe(3);
    expect(daysBetween('2026-09-24', '2026-09-21')).toBe(-3);
    expect(daysBetween('2026-09-21', '2026-09-21')).toBe(0);
  });

  it('noto’g’ri sanani aniqlaydi', () => {
    expect(isValidDate(new Date('2026-09-21'))).toBe(true);
    expect(isValidDate(new Date('bunday sana yo’q'))).toBe(false);
    expect(isValidDate('2026-09-21')).toBe(false);
  });
});
