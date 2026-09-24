import { type DealerStatus } from '@barff/types';

/**
 * Diler holatining MIJOZGA ko'rinadigan matni.
 *
 * Bitta joyda: bir xil holat boshqaruv panelida, profilda va
 * menyuda bir xil atalishi kerak. Matn holatning texnik nomidan
 * (`SUSPENDED`) farq qiladi — diler uni ko'rmaydi.
 */
export const DEALER_STATUS_LABELS: Record<DealerStatus, { title: string; body: string }> = {
  PENDING: {
    title: 'Arizangiz ko‘rib chiqilmoqda',
    body: 'Hujjatlaringiz tekshirilmoqda. Tasdiqlangandan so‘ng katalog, narxlar va buyurtma berish ochiladi.',
  },
  APPROVED: {
    title: 'Tasdiqlangan',
    body: 'Akkauntingiz faol. Katalog va narxlar ochiq.',
  },
  REJECTED: {
    title: 'Ariza rad etildi',
    body: 'Ariza qayta ko‘rib chiqilishi mumkin. Savollaringiz bo‘lsa biz bilan bog‘laning.',
  },
  SUSPENDED: {
    title: 'Akkaunt vaqtincha to‘xtatilgan',
    body: 'Buyurtma berish vaqtincha yopilgan. Tafsilotlar uchun biz bilan bog‘laning.',
  },
};
