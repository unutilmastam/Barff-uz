import { type CookieOptions, type Response } from 'express';
import { type AppConfig } from '../config/app.config';
import { type AuthTokens } from './auth.types';
import { ACCESS_TOKEN_COOKIE } from './guards/jwt-auth.guard';

export const REFRESH_TOKEN_COOKIE = 'barff_refresh';

/**
 * Token'lar brauzerga HttpOnly cookie orqali beriladi (CLAUDE.md §12).
 *
 * `httpOnly` — JavaScript o'qiy olmaydi, ya'ni XSS token'ni o'g'irlay olmaydi.
 * localStorage'da saqlash aynan shu himoyadan mahrum bo'lardi.
 */
function baseOptions(config: AppConfig): CookieOptions {
  const { domain, secure, sameSite } = config.cookie;

  return {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
    ...(domain !== undefined ? { domain } : {}),
  };
}

export function setAuthCookies(res: Response, tokens: AuthTokens, config: AppConfig): void {
  const options = baseOptions(config);

  res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    ...options,
    maxAge: tokens.expiresIn * 1_000,
  });

  res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    ...options,
    // Refresh cookie faqat refresh/logout yo'llariga yuboriladi — boshqa
    // endpoint'larga bekorga tarqalmaydi.
    path: '/api/v1/auth',
  });
}

export function clearAuthCookies(res: Response, config: AppConfig): void {
  const options = baseOptions(config);

  res.clearCookie(ACCESS_TOKEN_COOKIE, options);
  res.clearCookie(REFRESH_TOKEN_COOKIE, { ...options, path: '/api/v1/auth' });
}
