import { describe, expect, it } from 'vitest';
import { buildIndicators } from './health.module';
import { type HealthIndicator } from './health.types';

const indicator = (name: string): HealthIndicator => ({ name, check: async () => true });

describe('buildIndicators', () => {
  it('Redis sozlanmagan (cPanel): faqat baza — /health/ready doim 503 bermaydi', () => {
    const list = buildIndicators(false, indicator('database'), indicator('redis'));
    expect(list.map((item) => item.name)).toEqual(['database']);
  });

  it('Redis sozlangan: ikkalasi ham tekshiriladi', () => {
    const list = buildIndicators(true, indicator('database'), indicator('redis'));
    expect(list.map((item) => item.name)).toEqual(['database', 'redis']);
  });
});
