# BARFF — cPanel'ga joylash

Bu qo'llanma `hostmaster.uz` dagi cPanel hostingga mo'ljallangan.
Imkoniyatlar auditi `docs/OPEN-QUESTIONS.md` Q18 da; bu yerda faqat
QADAMLAR.

> **Sir hech qachon repoda emas** (`CLAUDE.md` §12). Parollar, JWT
> sirlari va baza ma'lumotlari FAQAT serverda, cPanel interfeysida
> kiritiladi. To'plam ichida `.env` fayli yo'q va bo'lmaydi.

---

## 0. Bu yo'l ishlaydimi — nima tekshirilgan

Quyidagilar shu repoda **haqiqatda yurgizib** tekshirildi, taxmin emas:

| Tekshiruv                                                | Natija |
| -------------------------------------------------------- | ------ |
| Next `standalone` serveri to'plamdan ko'tariladi         | ✅     |
| CSS/JS `200` qaytaradi (uslubsiz sahifa emas)            | ✅     |
| API `production` rejimida **Redis'siz** ko'tariladi      | ✅     |
| API **S3'siz**, fayl tizimi adapteri bilan ishlaydi      | ✅     |
| Admin login `200` va ikkala cookie qaytaradi (Redis'siz) | ✅     |
| Mahsulotlar API'dan keladi va sahifada chiqadi           | ✅     |

**Hali javob kutilmoqda** (bular hostingga bog'liq, kodga emas):

1. `Setup Node.js App` qaysi Node versiyalarini beradi — kamida **20**
   kerak.
2. Tarifda operativ xotira va jarayon limiti qancha — bu yerda **to'rtta**
   Node ilovasi birga ishlaydi (api, web, admin, dealer).

Ikkalasi ham cPanel'da ko'rinadi (§1). Yetmasa — o'sha provayderdan
kichik VPS; kod o'zgarmaydi.

---

## 1. Avval cPanel'da tekshiring

| cPanel bo'limi                       | Nimaga qaraysiz                      |
| ------------------------------------ | ------------------------------------ |
| `Setup Node.js App` → `Node version` | 20 yoki 22 bormi                     |
| `Metrics` → `Resource Usage`         | Xotira limiti, jarayonlar soni       |
| `PostgreSQL Databases`               | Bormi (MySQL emas!)                  |
| `Domains`                            | `barff.uz` qo'shimcha domen sifatida |

Birlamchi domen `unutilmastam.uz`, shuning uchun `barff.uz` **addon
domain** sifatida ulanadi.

---

## 2. Baza

`PostgreSQL Databases` bo'limida:

1. Baza yarating — masalan `barff_prod`.
2. Foydalanuvchi yarating va bazaga **All Privileges** bering.
3. Ulanish satrini eslab qoling:

```
postgresql://FOYDALANUVCHI:PAROL@127.0.0.1:5432/BAZA
```

> Parolni bu faylga ham, hech qayerga yozmang — uni to'g'ridan-to'g'ri
> cPanel ning muhit o'zgaruvchisi maydoniga qo'ying.

---

## 3. To'plamni yig'ish (o'z kompyuteringizda)

```bash
pnpm install
pnpm build
pnpm package:cpanel
```

Natija — `dist-cpanel/` katalogi:

```
dist-cpanel/
  api/     NestJS API
  web/     barff.uz — ommaviy sayt
  admin/   admin.barff.uz — CMS
  dealer/  partner.barff.uz — diler portali
```

`scripts/package-cpanel.mjs` nima qilishini va NEGA qo'lda
ko'chirilmasligini o'sha faylning boshidagi izoh tushuntiradi.

---

## 4. Serverga yuklash

Har uchala katalogni `File Manager` yoki SSH orqali uy katalogiga
yuklang, masalan:

```
~/barff/api
~/barff/web
~/barff/admin
```

`node_modules` YUKLANMAYDI — u serverda o'rnatiladi (§5).

---

## 5. Node ilovalarini yaratish

`Setup Node.js App` → `CREATE APPLICATION`, har biri uchun:

| Maydon                   | api            | web         | admin            |
| ------------------------ | -------------- | ----------- | ---------------- |
| Node version             | 20+            | 20+         | 20+              |
| Application mode         | Production     | Production  | Production       |
| Application root         | `barff/api`    | `barff/web` | `barff/admin`    |
| Application URL          | `api.barff.uz` | `barff.uz`  | `admin.barff.uz` |
| Application startup file | `server.js`    | `server.js` | `server.js`      |

Yaratgandan keyin har biri uchun `Run NPM Install` tugmasini bosing.

> API'da `npm install` oxirida `prisma generate` avtomatik ishlaydi —
> Prisma klienti SERVERDA yaratilishi shart, chunki uning ichida shu
> platformaga qurilgan ikkilik fayl bor.

---

## 6. Muhit o'zgaruvchilari

`Setup Node.js App` da har bir ilova uchun alohida kiritiladi.

### 6.1 api

| O'zgaruvchi            | Qiymat                                     |
| ---------------------- | ------------------------------------------ |
| `NODE_ENV`             | `production`                               |
| `DATABASE_URL`         | §2 dagi ulanish satri                      |
| `API_BASE_URL`         | `https://api.barff.uz`                     |
| `API_CORS_ORIGINS`     | `https://barff.uz,https://admin.barff.uz`  |
| `API_TRUST_PROXY_HOPS` | `1` (Cloudflare bo'lsa `2`)                |
| `JWT_ACCESS_SECRET`    | tasodifiy, ≥32 belgi                       |
| `JWT_REFRESH_SECRET`   | tasodifiy, ≥32 belgi, birinchisidan BOSHQA |
| `COOKIE_DOMAIN`        | `.barff.uz`                                |
| `COOKIE_SECURE`        | `true`                                     |
| `MEDIA_ROOT`           | `/home/FOYDALANUVCHI/barff/media`          |
| `MEDIA_PUBLIC_URL`     | `https://api.barff.uz/api/v1/media/file`   |
| `MEDIA_SIGNING_SECRET` | tasodifiy, ≥32 belgi                       |
| `SWAGGER_ENABLED`      | `false`                                    |

Sirlarni yaratish (SSH `Terminal` da):

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

**`REDIS_URL` KIRITILMAYDI.** Bu hostda Redis yo'q va u KERAK EMAS:
refresh token'lar va kirish urinishlari PostgreSQL da saqlanadi
(`docs/OPEN-QUESTIONS.md` Q18). O'zgaruvchini bo'sh qoldirish ham
xavfsiz — bo'sh qiymat "berilmagan" deb qaraladi.

**S3 o'zgaruvchilari ham KIRITILMAYDI.** `MEDIA_ROOT` uchligi berilgani
uchun fayl tizimi adapteri tanlanadi va rasmlar diskda saqlanadi.

### 6.2 web

| O'zgaruvchi                  | Qiymat                           |
| ---------------------------- | -------------------------------- |
| `NODE_ENV`                   | `production`                     |
| `NEXT_PUBLIC_API_BASE_URL`   | `https://api.barff.uz/api/v1`    |
| `NEXT_PUBLIC_SITE_URL`       | `https://barff.uz`               |
| `NEXT_PUBLIC_ADMIN_URL`      | `https://admin.barff.uz`         |
| `NEXT_PUBLIC_ALLOW_INDEXING` | `true` (kontent tayyor bo'lgach) |

> **DIQQAT — bu eng ko'p yanglishtiradigan joy.** `NEXT_PUBLIC_*`
> qiymatlari Next tomonidan **QURISH PAYTIDA** bundle ichiga yoziladi.
> Ularni serverda o'zgartirish YETARLI EMAS: to'plamni o'sha qiymatlar
> bilan QAYTA YIG'ISH kerak (§3). Serverdagi qiymat faqat server
> tomonidagi o'qish uchun.

### 6.3 admin va dealer

Ikkalasi uchun bir xil:

| O'zgaruvchi                | Qiymat                        |
| -------------------------- | ----------------------------- |
| `NODE_ENV`                 | `production`                  |
| `NEXT_PUBLIC_API_BASE_URL` | `https://api.barff.uz/api/v1` |

`dealer` uchun qo'shimcha — kirish sahifasidagi "ariza qoldiring"
havolasi uchun:

| O'zgaruvchi            | Qiymat             |
| ---------------------- | ------------------ |
| `NEXT_PUBLIC_SITE_URL` | `https://barff.uz` |

---

## 7. Migratsiyalar va birinchi admin

SSH `Terminal` da, API katalogida:

```bash
cd ~/barff/api
npm run db:deploy
```

Birinchi adminni yaratish uchun `SEED_ADMIN_EMAIL`, `SEED_ADMIN_NAME`
va `SEED_ADMIN_PASSWORD` ni **vaqtincha** qo'shib, seed'ni BIR MARTA
yurgizing, so'ng `SEED_ADMIN_PASSWORD` ni olib tashlang va parolni
admin panelda almashtiring.

---

## 8. Domenlar va SSL

1. `Domains` → `barff.uz` ni addon domain sifatida qo'shing.
2. Subdomenlar: `api.barff.uz`, `admin.barff.uz`, `partner.barff.uz`.
3. `SSL/TLS Status` → uchalasi uchun `Run AutoSSL`.
4. Cloudflare ishlatilsa: DNS `Proxied`, SSL rejimi `Full (strict)`.

---

## 9. Tekshirish

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://api.barff.uz/api/v1/health
curl -s -o /dev/null -w "%{http_code}\n" https://barff.uz/uz
curl -s -o /dev/null -w "%{http_code}\n" https://admin.barff.uz/login
curl -s -o /dev/null -w "%{http_code}\n" https://partner.barff.uz/login
```

Hammasi `200` bo'lishi kerak.

**Eng muhim tekshiruv — sahifa uslubi joyidami.** Buni brauzerda
ko'z bilan emas, port bilan tekshiring:

```bash
CSS=$(curl -s https://barff.uz/uz | grep -o '/_next/static/css/[a-z0-9]*\.css' | head -1)
curl -s -o /dev/null -w "%{http_code}\n" "https://barff.uz$CSS"
```

`400` yoki `404` kelsa — `.next/static` to'plamga tushmagan yoki eski
jarayon ishlab turibdi (`qa/README.md`, 1-tuzoq).

---

## 10. Yangilash

```bash
# kompyuterda
pnpm build && pnpm package:cpanel
# serverga `dist-cpanel/*` ni yuklang, so'ng har bir ilovada:
#   Run NPM Install → RESTART
```

Sxema o'zgargan bo'lsa, RESTART dan OLDIN:

```bash
cd ~/barff/api && npm run db:deploy
```

---

## 11. Agar tarif yetmasa

To'rtta Node jarayoni ulushli tarifda xotiraga sig'masligi mumkin.
Shunda:

1. `admin` va `dealer` ni vaqtincha to'xtatib turing — ular ichki
   foydalanish uchun; ommaviy sayt ulardan mustaqil ishlaydi.
2. Yetmasa — o'sha provayderdan kichik VPS (2 yadro / 4 GB). Domen o'z
   joyida qoladi, kod o'zgarmaydi, `docker-compose.yml` repoda bor.
