import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { AllExceptionsFilter } from './all-exceptions.filter';

function host() {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const response = { status };
  const request = { method: 'POST', originalUrl: '/api/v1/orders?x=1', requestId: 'rid-9' };

  return {
    json,
    status,
    arguments: {
      switchToHttp: () => ({ getResponse: () => response, getRequest: () => request }),
    } as never,
  };
}

describe('AllExceptionsFilter — tizim xatosi ogohlantirishi', () => {
  it('500 da egasiga xabar beradi (so‘rov ID bilan), javobda ichki tafsilot YO‘Q', () => {
    const reportError = vi.fn(async () => true);
    const filter = new AllExceptionsFilter({ reportError } as never);
    const h = host();

    filter.catch(new TypeError('ichki-sir-xabar'), h.arguments);

    expect(reportError).toHaveBeenCalledWith({
      method: 'POST',
      url: '/api/v1/orders?x=1',
      status: 500,
      requestId: 'rid-9',
      errorName: 'TypeError',
    });
    expect(JSON.stringify(h.json.mock.calls[0])).not.toContain('ichki-sir-xabar');
    expect(h.status).toHaveBeenCalledWith(500);
  });

  it('mijoz xatosi (400, 404) uchun ogohlantirish YO‘Q', () => {
    const reportError = vi.fn(async () => true);
    const filter = new AllExceptionsFilter({ reportError } as never);

    filter.catch(new BadRequestException('noto‘g‘ri'), host().arguments);
    filter.catch(new NotFoundException(), host().arguments);

    expect(reportError).not.toHaveBeenCalled();
  });

  it('ogohlantirish xizmati bo‘lmasa ham filtr ishlaydi', () => {
    const filter = new AllExceptionsFilter();
    const h = host();

    expect(() => filter.catch(new Error('x'), h.arguments)).not.toThrow();
    expect(h.status).toHaveBeenCalledWith(500);
  });
});
