# Release — Faza 4 (S36–S39): moliya, hisobot, audit

**Darvoza sharti** (`ROADMAP.md` S39): _yetkazilgan buyurtma → hisob-faktura
→ to'lov → balans → hisobot_ zanjiri ishlaydi va BAZA bilan yarashadi.

Sana: 2026-10-28. Muhit: lokal (PostgreSQL 16, Redis, hamma 5 ilova
`production` rejimida qurilgan va ishga tushirilgan).

## 1. Natija

| Tekshiruv                                              | Natija                       |
| ------------------------------------------------------ | ---------------------------- |
| `format:check`, `lint`, `typecheck`                    | ✅                           |
| Birlik va e2e testlar                                  | ✅ 594 (API) + 260 (qolgani) |
| `pnpm build` (9 ta vazifa)                             | ✅                           |
| Faza 1 darvozasi (`e2e-phase1.mjs`): ommaviy ariza     | ✅                           |
| Faza 2 darvozasi (`e2e-phase2.mjs`): diler → buyurtma  | ✅                           |
| Faza 3 darvozasi (`e2e-phase3.mjs`): ombor → yetkazish | ✅ (buyurtma YETKAZILDI)     |
| **Faza 4 darvozasi (`e2e-phase4.mjs`)**                | ✅ 40+ tekshiruv, 0 muammo   |
| **Yarashtirish (`reconcile-phase4.mjs`)**              | ✅ 9 invariant               |
| axe (WCAG 2 A/AA): 6 ta sahifa, desktop va mobil       | ✅ 0 buzilish                |
| Brauzer konsoli / tarmoq xatolari                      | ✅ 0                         |
| Gorizontal skroll                                      | ✅ yo'q                      |

## 2. Zanjir (§28) — har qadam o'z roli bilan

```
tashrifchi ariza (F1) → diler akkaunti (F2) → buyurtma (diler)
  → tasdiq (admin) → zaxira → yig'ish/qadoqlash (OMBOR)
  → biriktirish (LOGIST) → topshirish (HAYDOVCHI)          [F3]
  → hisob-faktura yaratish + berish (admin)
  → diler: qoralamani KO'RMAYDI, berilganini ko'radi
  → qisman to'lov → qolgani (admin)                          [F4]
  → balans nolga tushdi (diler o'zi ham ko'radi)
  → hisobot sotuv summasini O'ZGARTIRMAGAN
  → audit jurnalida har bir qadam, bajaruvchisi bilan
```

Raqamlar API'dan o'qiladi (ekrandan emas). Misol yurish:
buyurtma `BRF-2026-000455` 1 200 000 tiyin → hisob-faktura `INV-2026-000079`
→ to'lov 600 000, so'ng qolgan 600 000 → qarz 0, hujjat `PAID`.

## 3. Yarashtirish — bazaning o'zidan

1. hujjat jami = pozitsiyalar yig'indisi (− chegirma + soliq);
2. hujjat jami = buyurtma jami;
3. hujjat holati taqsimotdan kelib chiqadi (qo'lda qo'yilmagan);
4. hujjatga taqsimlangan summa jamidan oshmaydi;
5. to'lovning taqsimlangan qismi to'lov summasidan oshmaydi;
6. balans ikki usulda (JS va SQL) bir xil;
7. berilgan hujjatning buyurtmasi YETKAZILGAN;
8. har bir hujjat va to'lov uchun audit yozuvi bor;
9. audit jadvalida parol xeshi / token izi yo'q (hamma qator skanerlanadi).

## 4. Darvozaning o'zi tekshirildi

"Hammasi yashil" o'zi hech narsa isbotlamaydi — tekshiruv yolg'on yashil
berishi mumkin. Shuning uchun uni ataylab buzdim:

| Buzish                                                  | Natija                                               |
| ------------------------------------------------------- | ---------------------------------------------------- |
| bazada hujjat holatini taqsimotga zid qilish            | `reconcile` ushladi (holat mos emas)                 |
| hujjat jamini 1 tiyinga o'zgartirish                    | `reconcile` 3 ta tekshiruvda ushladi                 |
| to'lovning audit yozuvini o'chirish                     | `reconcile` ushladi (1/2)                            |
| **ilova**: qoralama hujjat dilerga ko'rinadigan qilindi | `e2e-phase4` 2 ta xato berdi (ro'yxat + id bo'yicha) |

Buzishlar qaytarildi; yakuniy yurish toza ma'lumotda qayta bajarildi.

## 5. Gate topgan nosozliklar (hammasi tuzatildi)

1. **Narxsiz mahsulot savatga qo'shiladigandek ko'rinardi.** Diler katalogida
   narxi yo'q variantda ham «Savatga» tugmasi yoqilgan edi; bosilganda server
   `400` qaytarardi. Haqiqiy katalog narxsiz (narxlarni BARFF admin panelda
   kiritadi), ya'ni bu HAMMA mahsulotda yuz berardi. Endi tugma faqat narxli
   variantda. Faza 2 darvozasi shu sababli yiqilgan edi.
2. **QA skriptlarida admin paroli kodga yozilgan edi** (`e2e-phase1`,
   `e2e-phase2`, `load-phase2`, `picking-check`, `warehouse-check`). Endi faqat
   `ADMIN_PASSWORD` muhit o'zgaruvchisidan; berilmasa skript to'xtaydi.
3. Hajm dilerda `1000 ml` deb chiqardi — endi `1 L` (`@barff/utils`).

S38 (shu fazaning ichida) ham ikkita bo'shliq topgan edi: mahsulot **narxi
o'zgarishi** jurnalga yozilmagan, va redaksiya `passwordHash`/`mfaSecret`
kabi nomlarni o'tkazib yuborardi (`docs/AUDIT-POLICY.md`).

## 6. Bajarilmagan va nega

- **Staging'ga joylash** — cPanel paroli va SSH kaliti bu muhitda yo'q va
  bo'lmasligi ham kerak (CLAUDE.md §12). Joylash `docs/DEPLOY-CPANEL.md` bo'yicha.
- **Soliq (QQS)** — hisob-fakturada qator bor, lekin 0 va «kutilmoqda»
  deb belgilangan; qoida kelmaguncha o'ylab topilmadi (Q17).
- **Audit saqlash muddati** — qaror kutilmoqda (Q25).
- **PDF hisob-faktura** — rasmiy shakl yo'q (Q17).

## 7. Qayta yurgizish

```bash
STAFF_PASSWORD=... ADMIN_EMAIL=... ADMIN_PASSWORD=... node qa/seed-staff.mjs
node qa/e2e-phase3.mjs        # buyurtmani YETKAZILGAN holatga olib boradi
node qa/e2e-phase4.mjs        # moliya zanjiri
node qa/reconcile-phase4.mjs  # bazadan yarashtirish
```

Eslatma: bu muhitda API fayl-tizim yoki S3 saqlashsiz ishga tushsa, rasmlar
`memory://` manzil oladi va brauzer konsolida `ERR_UNKNOWN_URL_SCHEME`
chiqadi. Bu faqat lokal sozlama; production'da xotiradagi saqlash taqiqlangan.
