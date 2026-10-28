# Avariya qo'llanmasi (S41)

Har bir bo'lim: **nima ko'rinadi → birinchi qadam → keyingi qadam.** Avval
tinchlaning: ma'lumot zaxirada (`docs/BACKUP-RESTORE.md`).

## 0. Qayerga qarash kerak

| Nima                      | Qayerda                                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| Jarayon tirikmi           | `https://api.barff.uz/api/v1/health`                                                     |
| Baza ulanishi             | `https://api.barff.uz/api/v1/health/ready`                                               |
| Ilova logi                | cPanel → `Setup Node.js App` → ilova → log fayli (odatda ilova papkasidagi `stderr.log`) |
| Biror so'rov nega yiqildi | logda `requestId` bo'yicha qidiring (xato javobida va xabarda bor)                       |
| Kim nima qildi            | Admin → Tizim → **Audit jurnali**                                                        |

Loglar JSON qatorlar: `grep 'REQUEST_ID' stderr.log`.

## 1. Sayt umuman ochilmayapti

1. `…/health` ni tekshiring. Javob yo'q → API jarayoni o'lgan.
2. cPanel → `Setup Node.js App` → ilova holati. **Restart**.
3. Qayta tushsa-yu, yana yiqilsa: logda oxirgi xatoni o'qing. Odatda sabab —
   muhit o'zgaruvchisi (`DATABASE_URL`, sirlar) yoki xotira limiti.
4. Faqat bitta ilova (masalan admin) ishlamasa, qolganlariga tegmang —
   ular mustaqil.

## 2. Egasiga "tizim xatosi" xabari keldi

Xabarda: yo'l, status, xato sinfi, **so'rov ID**.

1. Logda shu ID ni toping — to'liq stack shu yerda.
2. `PrismaClientInitializationError` / `…ConnectionError` → baza muammosi (§3).
3. Bitta yo'lda takrorlansa va boshqalari yaxshi → kod xatosi: yo'l, vaqt va
   so'rov ID ni dasturchiga yuboring.
4. Xabar 10 daqiqada bir marta keladi; jim bo'lishi muammo tugadi degani emas.

## 3. Baza ishlamayapti (`/health/ready` xato)

1. cPanel → `PostgreSQL Databases`: baza va foydalanuvchi bormi.
2. Disk to'lganmi (cPanel bosh sahifasi). To'lgan bo'lsa — eski zaxiralarni
   (`BACKUP_DIR`) boshqa joyga ko'chirib, tozalang.
3. Baza buzilgan bo'lsa → `docs/BACKUP-RESTORE.md` §4 (tiklash).

## 4. Rasmlar ko'rinmayapti

1. Rasm manzilini brauzerda oching. `404` → `MEDIA_PUBLIC_URL` noto'g'ri:
   u `https://api.barff.uz/api/v1/media` bo'lishi kerak (`/file` EMAS).
2. Fayl diskda bormi: `MEDIA_ROOT/public/<id>/…`. Yo'q → media zaxirasidan tiklang.
3. Rasm yuklanmayapti/uzilyapti → CPU limiti (rasm ishlash ~15 s CPU).
   Rasmni oldindan 1600 px ga kichraytiring, birma-bir yuklang.

## 5. Kirish ishlamayapti

- **Bitta foydalanuvchi:** ko'p marta noto'g'ri parol → vaqtincha bloklangan.
  Audit jurnalida `auth.login.locked` ni qidiring; blok o'zi tugaydi
  (`AUTH_LOGIN_LOCK_SECONDS`).
- **Hamma kira olmaydi:** `JWT_*` sirlari o'zgargan bo'lishi mumkin — yangi
  sir bilan eski sessiyalar yaroqsiz; qayta kirsalar bo'ladi.
- **Faqat bitta ilova (admin/diler/haydovchi):** `API_CORS_ORIGINS` da uning
  manzili yo'q (brauzer konsolida CORS xatosi) — `docs/DEPLOY-CPANEL.md` §6.1.1.
- **Shubhali ko'p urinish:** audit jurnalini `auth.login.failed` bo'yicha
  filtrlang; bitta IP dan yuzlab bo'lsa — provayder/Cloudflare'da IP'ni to'sing.

## 6. Sir tushib qoldi yoki oshkor bo'ldi

Tezlik muhim; tartib:

1. **Qaysi sir:** bazaga parol, `JWT_*`, `MEDIA_SIGNING_SECRET`, Telegram token,
   SMTP paroli, cPanel/SSH.
2. **Almashtiring** (yangi qiymat bilan):
   - bazaga parol → cPanel'da o'zgartiring + `DATABASE_URL` yangilang;
   - `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` → hamma foydalanuvchi chiqib
     ketadi (ma'lumot yo'qolmaydi);
   - `MEDIA_SIGNING_SECRET` → maxfiy havolalar yaroqsiz bo'ladi;
   - Telegram/SMTP → provayderda eskisini bekor qiling.
3. Restart.
4. Gitga tushgan bo'lsa: sirni almashtirish SHART — tarixdan o'chirish
   yetarli emas (nusxalar bo'lishi mumkin). `pnpm security:secrets` tarixni ham tekshiradi.
5. Audit jurnalida shubhali amallarni ko'rib chiqing (§7).

## 7. Shubhali faoliyat (kimdir ruxsatsiz amal qilgan bo'lishi mumkin)

Audit jurnali: filtr — sana, bajaruvchi, soha (`user`, `order`, `payment`,
`product`). Jurnal tahrirlanmaydi. Qiziq amallar: `user.role.changed`,
`payment.recorded`, `product.price.changed`, `stock.adjusted`, `audit.exported`.
Kerak bo'lsa CSV oling (eksportning o'zi ham jurnalga yoziladi).
Shubhali akkauntni admin panelda faolsizlantiring.

## 8. Yangilashdan keyin buzildi

`docs/BACKUP-RESTORE.md` §6: migratsiya bo'lmasa oldingi to'plamni qaytaring
(1 daqiqa); bo'lsa — zaxiradan tiklash.

## 9. Doimiy tekshiruvlar

| Qachon   | Nima                                                              |
| -------- | ----------------------------------------------------------------- |
| Har kuni | Tashqi monitor `…/health/ready` ni tekshiradi                     |
| Haftada  | Zaxirani boshqa joyga ko'chirish; `security` CI yashilmi          |
| Oyiga    | `scripts/db-restore-check.sh` (zaxira tiklanishini tekshirish)    |
| Chorakda | Paketlarni yangilash (`pnpm audit --prod`), sirlarni almashtirish |
