import { describe, expect, it } from 'vitest';
import { parseDuration } from './token.service';

describe('parseDuration', () => {
  it('soniya, daqiqa, soat va kunni tushunadi', () => {
    expect(parseDuration('30s')).toBe(30);
    expect(parseDuration('15m')).toBe(900);
    expect(parseDuration('2h')).toBe(7200);
    expect(parseDuration('30d')).toBe(2_592_000);
  });

  it('birliksiz qiymatni soniya deb oladi', () => {
    expect(parseDuration('3600')).toBe(3600);
  });

  it('probellarni kesadi', () => {
    expect(parseDuration(' 15m ')).toBe(900);
  });

  it('notogri formatni rad etadi', () => {
    expect(() => parseDuration('15 daqiqa')).toThrow();
    expect(() => parseDuration('')).toThrow();
    expect(() => parseDuration('15y')).toThrow();
  });
});
