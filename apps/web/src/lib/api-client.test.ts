import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError, apiFetch } from './api-client';

function mockFetch(status: number, body: unknown, ok = status < 400) {
  const fn = vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(body),
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('apiFetch', () => {
  it('muvaffaqiyatli javobni qaytaradi', async () => {
    mockFetch(200, { id: '1', name: 'Anor' });
    await expect(apiFetch('/products/1')).resolves.toEqual({ id: '1', name: 'Anor' });
  });

  it('204 uchun tana kutmaydi', async () => {
    const fn = vi.fn().mockResolvedValue({ ok: true, status: 204, json: () => Promise.reject() });
    vi.stubGlobal('fetch', fn);

    await expect(apiFetch('/auth/logout', { method: 'POST' })).resolves.toBeUndefined();
  });

  it('cookie bilan yuboradi (S04 autentifikatsiyasi)', async () => {
    const fn = mockFetch(200, {});
    await apiFetch('/auth/me');

    expect(fn.mock.calls[0]?.[1]).toMatchObject({ credentials: 'include' });
  });

  it('tana berilganda Content-Type qoshadi', async () => {
    const fn = mockFetch(200, {});
    await apiFetch('/leads', { method: 'POST', body: { companyName: 'Anor' } });

    const init = fn.mock.calls[0]?.[1] as RequestInit;
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect(init.body).toBe(JSON.stringify({ companyName: 'Anor' }));
  });

  it('tana berilmaganda Content-Type qoshmaydi', async () => {
    const fn = mockFetch(200, {});
    await apiFetch('/products');

    const headers = (fn.mock.calls[0]?.[1] as RequestInit).headers as Record<string, string>;
    expect(headers['Content-Type']).toBeUndefined();
  });

  it('locale berilsa Accept-Language yuboradi', async () => {
    const fn = mockFetch(200, {});
    await apiFetch('/products', { locale: 'ru' });

    const headers = (fn.mock.calls[0]?.[1] as RequestInit).headers as Record<string, string>;
    expect(headers['Accept-Language']).toBe('ru');
  });

  it('server xatosini ApiRequestError ga aylantiradi', async () => {
    mockFetch(400, {
      statusCode: 400,
      message: "So'rov ma'lumotlari noto'g'ri",
      code: 'VALIDATION_FAILED',
      requestId: 'abc-123',
      details: { phone: ["Telefon raqami noto'g'ri"] },
    });

    const error = await apiFetch('/leads', { method: 'POST', body: {} }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiRequestError);
    const api = error as ApiRequestError;
    expect(api.statusCode).toBe(400);
    expect(api.code).toBe('VALIDATION_FAILED');
    expect(api.requestId).toBe('abc-123');
    expect(api.fieldError('phone')).toBe("Telefon raqami noto'g'ri");
    expect(api.fieldError('email')).toBeUndefined();
  });

  it('JSON bolmagan xato javobini ham yutadi', async () => {
    const fn = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: () => Promise.reject(new Error('not json')),
    });
    vi.stubGlobal('fetch', fn);

    const error = (await apiFetch('/products').catch((e: unknown) => e)) as ApiRequestError;

    expect(error).toBeInstanceOf(ApiRequestError);
    expect(error.statusCode).toBe(502);
    expect(error.code).toBe('UNKNOWN_ERROR');
  });
});
