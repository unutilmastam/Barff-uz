import { ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { AdminUsersService } from './admin-users.service';

const ctx = { ip: '127.0.0.1' };
const actor = { id: 'actor', email: 'actor@barff.uz' };

function build(options: { targetRoles: string[]; otherActiveAdmins: number; isActive?: boolean }) {
  const target = {
    id: 'target',
    email: 't@barff.uz',
    fullName: 'T',
    phone: null,
    isActive: options.isActive ?? true,
    lastLoginAt: null,
    createdAt: new Date(),
    roles: options.targetRoles.map((code) => ({ role: { code } })),
  };

  const prisma = {
    user: {
      findFirst: vi.fn().mockResolvedValue(target),
      count: vi.fn().mockResolvedValue(options.otherActiveAdmins),
      update: vi.fn().mockResolvedValue({ ...target, isActive: false }),
    },
  };
  const users = { invalidate: vi.fn() };
  const userRoles = { setRoles: vi.fn() };
  const refreshTokens = { revokeAllForUser: vi.fn() };
  const audit = { record: vi.fn() };

  const service = new AdminUsersService(
    prisma as never,
    users as never,
    userRoles as never,
    {} as never,
    refreshTokens as never,
    audit as never,
  );

  return { service, prisma, userRoles, refreshTokens };
}

describe('AdminUsersService — lockout himoyasi', () => {
  it('OXIRGI faol adminni bloklab bo‘lmaydi', async () => {
    const { service, prisma } = build({ targetRoles: ['ADMIN'], otherActiveAdmins: 0 });

    await expect(service.update('target', { isActive: false }, actor, ctx)).rejects.toMatchObject({
      response: { code: 'LAST_ADMIN' },
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('boshqa faol admin bo‘lsa bloklaydi va sessiyalarni bekor qiladi', async () => {
    const { service, prisma, refreshTokens } = build({
      targetRoles: ['ADMIN'],
      otherActiveAdmins: 1,
    });

    await service.update('target', { isActive: false }, actor, ctx);

    expect(prisma.user.update).toHaveBeenCalledOnce();
    expect(refreshTokens.revokeAllForUser).toHaveBeenCalledWith('target');
  });

  it('admin bo‘lmagan xodim uchun adminlar soni tekshirilmaydi', async () => {
    const { service, prisma } = build({ targetRoles: ['SALES'], otherActiveAdmins: 0 });

    await service.update('target', { isActive: false }, actor, ctx);

    expect(prisma.user.count).not.toHaveBeenCalled();
  });

  it('oxirgi adminni boshqa rolga o‘tkazib bo‘lmaydi', async () => {
    const { service, userRoles } = build({ targetRoles: ['ADMIN'], otherActiveAdmins: 0 });

    await expect(service.setRoles('target', ['SALES'], actor, ctx)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(userRoles.setRoles).not.toHaveBeenCalled();
  });

  it('o‘zini bloklab / admin rolidan mahrum qilib bo‘lmaydi', async () => {
    const { service } = build({ targetRoles: ['ADMIN'], otherActiveAdmins: 5 });

    await expect(service.update('actor', { isActive: false }, actor, ctx)).rejects.toMatchObject({
      response: { code: 'CANNOT_DEACTIVATE_SELF' },
    });
    await expect(service.setRoles('actor', ['SALES'], actor, ctx)).rejects.toMatchObject({
      response: { code: 'CANNOT_DEMOTE_SELF' },
    });
  });

  it('allaqachon bloklangan adminni qayta bloklash oxirgi-admin xatosini bermaydi', async () => {
    const { service } = build({ targetRoles: ['ADMIN'], otherActiveAdmins: 0, isActive: false });

    await expect(service.update('target', { isActive: false }, actor, ctx)).resolves.toBeDefined();
  });
});
