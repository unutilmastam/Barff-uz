import { describe, expect, it } from 'vitest';
import { validateEnv } from './env.schema';

const base = {
  DATABASE_URL: 'postgresql://barff@localhost:5432/barff',
  REDIS_URL: 'redis://localhost:6379',
};

describe('validateEnv', () => {
  it('standart qiymatlar bilan ishlaydi', () => {
    const env = validateEnv({ ...base });
    expect(env.NODE_ENV).toBe('development');
    expect(env.API_PORT).toBe(3000);
    expect(env.API_CORS_ORIGINS).toEqual([]);
  });

  it('REDIS_URL yoq bolsa toxtaydi', () => {
    expect(() => validateEnv({ DATABASE_URL: base.DATABASE_URL })).toThrow(/REDIS_URL/);
  });

  it('DATABASE_URL yoq bolsa toxtaydi', () => {
    expect(() => validateEnv({ REDIS_URL: base.REDIS_URL })).toThrow(/DATABASE_URL/);
  });

  it('notogri DATABASE_URL protokolini rad etadi', () => {
    expect(() => validateEnv({ ...base, DATABASE_URL: 'mysql://localhost:3306/x' })).toThrow(
      /DATABASE_URL/,
    );
  });

  it('notogri REDIS_URL protokolini rad etadi', () => {
    expect(() => validateEnv({ ...base, REDIS_URL: 'postgres://localhost:5432' })).toThrow(
      /REDIS_URL/,
    );
  });

  it('CORS royxatini vergul boyicha ajratadi', () => {
    const env = validateEnv({
      ...base,
      API_CORS_ORIGINS: 'https://barff.uz, https://admin.barff.uz ,',
    });
    expect(env.API_CORS_ORIGINS).toEqual(['https://barff.uz', 'https://admin.barff.uz']);
  });

  it('portni songa aylantiradi', () => {
    expect(validateEnv({ ...base, API_PORT: '4000' }).API_PORT).toBe(4000);
  });

  it('notogri portni rad etadi', () => {
    expect(() => validateEnv({ ...base, API_PORT: '70000' })).toThrow(/API_PORT/);
  });

  it('notogri NODE_ENV ni rad etadi', () => {
    expect(() => validateEnv({ ...base, NODE_ENV: 'prod' })).toThrow(/NODE_ENV/);
  });

  it('SWAGGER_ENABLED ni booleanga aylantiradi', () => {
    expect(validateEnv({ ...base, SWAGGER_ENABLED: 'false' }).SWAGGER_ENABLED).toBe(false);
    expect(validateEnv({ ...base, SWAGGER_ENABLED: '1' }).SWAGGER_ENABLED).toBe(true);
  });
});
