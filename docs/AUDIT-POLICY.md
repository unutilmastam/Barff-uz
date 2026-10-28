# Audit siyosati (CLAUDE.md §23, S38)

## 1. Nima yoziladi

Har yozuv: **bajaruvchi** (id + email nusxasi), **amal**, **obyekt** va
uning id si, **oldin/keyin** (faqat xavfsiz maydonlar), **IP**,
**brauzer**, **so'rov ID** va **vaqt**.

| §23 talabi         | Amallar                                                                                                                                               |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| kirish             | `auth.login.success`, `auth.login.failed`, `auth.login.locked`, `auth.logout`, `auth.token.*`                                                         |
| rol o'zgarishi     | `user.role.changed`                                                                                                                                   |
| mahsulot/narx      | `product.created/updated/deleted`, `product.variant.*`, `product.price.changed` (oldingi narx `before` da), `product.image.*`, `pricing.rule.changed` |
| buyurtma holati    | `order.created`, `order.status.changed`, `order.note.changed`                                                                                         |
| ombor tuzatishi    | `stock.adjusted`, `stock.moved`, `stock.reserved/released/fulfilled`, `stock.threshold.changed`                                                       |
| to'lov             | `payment.recorded`, `payment.allocated`, `invoice.*`, `dealer.credit_limit.changed`                                                                   |
| diler              | `dealer.registered/updated/status.changed/terms.changed/tier.changed/address.*`                                                                       |
| admin sozlamalari  | `settings.updated`                                                                                                                                    |
| ma'lumot chiqarish | `report.exported`, `audit.exported`                                                                                                                   |

S38 da qo'shilgan: mahsulot variantlari va **narx o'zgarishi** (avval
jurnalda yo'q edi — §23 ning aniq talabi).

## 2. Nima HECH QACHON yozilmaydi

Parol, token, sir, xesh, cookie, imzo. Ikki qatlam:

1. **Kalit nomi bo'yicha** — nomda `password`, `token`, `secret`, `hash`,
   `authorization`, `cookie`, `apikey`, `privatekey`, `signature` bo'laklari
   bo'lsa qiymat `[REDACTED]` bo'ladi. Avval aniq nomlar ro'yxati edi va
   `passwordHash`, `mfaSecret` kabilarni o'tkazib yuborardi.
2. **Qiymat bo'yicha** — begunoh nomli maydondagi JWT yoki argon2 xesh ham
   yashiriladi.

Avtomatik tekshiruv (`test/audit.e2e-spec.ts`): jurnal jadvalining
**hamma** qatorlari skanerlanadi va sir izi topilsa test yiqiladi.

## 3. Tahrirlanmaydi

- Ilovada yozuvni o'zgartiradigan yoki o'chiradigan endpoint yo'q.
- Bazada `UPDATE` trigger bilan to'silgan (`audit_logs_no_update`).
  Yagona istisno — foydalanuvchi o'chirilganda `actorId` ning `NULL` ga
  aylanishi (`ON DELETE SET NULL`); email nusxasi qoladi.
- `DELETE` ataylab ruxsat etilgan — saqlash muddati (§4) uchun.

Yozuv asosiy amalni to'xtatmaydi: jurnalga yozish xatosi loglanadi, lekin
buyurtmani yoki kirishni bekor qilmaydi.

## 4. Saqlash muddati — **QAROR KUTILMOQDA (Q25)**

Muddatni **kompaniya** va qonun belgilaydi, kod emas — bu yerda raqam
o'ylab topilmadi. Hozirgi holat: **yozuvlar o'chirilmaydi**. Muddat
belgilangach, tozalash `created_at < now() - interval` bo'yicha oddiy
`DELETE` bilan bajariladi; tozalashdan oldin `audit.exported` bilan
eksport olib qo'yish tavsiya etiladi.

Hajm: bir yozuv ~0,5–1 KB; kuniga 1000 amalda yiliga ~0,2–0,4 GB.

## 5. Ko'rish

Admin → Tizim → **Audit jurnali** (`audit.view` ruxsati, server tomonda
tekshiriladi). Filtr: sana (Toshkent kuni), soha, amal, bajaruvchi,
obyekt ID. CSV eksport oqimli; eksportning o'zi ham jurnalga yoziladi.
API: `GET /admin/audit`, `/admin/audit/facets`, `/admin/audit/export.csv`,
`/admin/audit/:id`.
