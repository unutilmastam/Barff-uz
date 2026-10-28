import { describe, expect, it } from 'vitest';
import { formatVolumeMl } from './volume';

describe('formatVolumeMl', () => {
  it('1000 ml dan boshlab litrda ko‘rsatadi', () => {
    expect(formatVolumeMl(350)).toBe('350 ml');
    expect(formatVolumeMl(999)).toBe('999 ml');
    expect(formatVolumeMl(1000)).toBe('1 L');
    expect(formatVolumeMl(1500)).toBe('1,5 L');
    expect(formatVolumeMl(2000)).toBe('2 L');
  });
});
