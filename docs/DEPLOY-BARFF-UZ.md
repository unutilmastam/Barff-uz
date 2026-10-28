# barff.uz — cPanel'ga joylash (qisqa yo'l)

Bu qo'llanma **barff.uz** uchun yozilgan va hammasi sinab ko'rilgan: zip'larni
ochish → `npm install` → `npm run setup` → baza → ishga tushirish → tekshiruv
(toza katalogda, haqiqiy PostgreSQL bilan, 5 ta ilovaning hammasi).
Batafsil izohlar va muammolar — `docs/DEPLOY-CPANEL.md`.

> **Sir hech qayerga yozilmaydi.** Parollar va JWT sirlari serverning o'zida
> yaratiladi; chatga, e-pochtaga yoki repoga yubormang.

## 0. Nima kerak

| Narsa            | Izoh                                                                                          |
| ---------------- | --------------------------------------------------------------------------------------------- |
| cPanel hosting   | Node.js **20+**, **PostgreSQL** (MySQL emas), SSH, 5 ta Node ilova, ≥2 GB RAM, ≥10 GB disk    |
| Domen `barff.uz` | DNS hostingga qaratilgan (nameserver yoki A yozuvlari)                                        |
| 5 ta zip         | `barff-api.zip`, `barff-web.zip`, `barff-admin.zip`, `barff-dealer.zip`, `barff-delivery.zip` |

Zip'lar dasturchidan keladi yoki o'zingiz: `pnpm install && pnpm release:cpanel`
(natija — `dist-cpanel/upload/`). `release.env` da manzillar allaqachon `barff.uz` uchun.

## 1. Domenlar va SSL

`Domains` → `barff.uz` ni qo'shing (addon domain), so'ng 4 ta subdomen:

| Subdomen            | Vazifasi          |
| ------------------- | ----------------- |
| `barff.uz`          | ommaviy sayt      |
| `api.barff.uz`      | API               |
| `admin.barff.uz`    | admin panel       |
| `partner.barff.uz`  | diler portali     |
| `delivery.barff.uz` | haydovchi ilovasi |

`SSL/TLS Status` → hammasi uchun **Run AutoSSL** (yashil qulf chiqquncha kuting).

## 2. Baza

`PostgreSQL Databases`: baza yarating (masalan `barff_prod`), foydalanuvchi yarating,
foydalanuvchini bazaga **All Privileges** bilan ulang. Uchala nomni (cPanel ularga
`cpuser_` qo'shadi) va parolni yozib oling — §5 da so'raladi.

## 3. Zip'larni yuklash

`File Manager` → uy katalogida `barff` papka yarating, ichida 5 ta papka:
`api`, `web`, `admin`, `dealer`, `delivery`. Har biriga tegishli zip'ni yuklang va
**Extract** qiling (zip tarkibi to'g'ridan-to'g'ri papka ichiga ochilishi kerak).

> Papkalar `public_html` ichida **bo'lmasin**.

## 4. Node ilovalarini yaratish

`Setup Node.js App` → **Create Application**, beshta marta:

| Ilova    | Application root | Application URL     |
| -------- | ---------------- | ------------------- |
| api      | `barff/api`      | `api.barff.uz`      |
| web      | `barff/web`      | `barff.uz`          |
| admin    | `barff/admin`    | `admin.barff.uz`    |
| dealer   | `barff/dealer`   | `partner.barff.uz`  |
| delivery | `barff/delivery` | `delivery.barff.uz` |

Hammasida: Node **20+**, Mode **Production**, Startup file **`server.js`**.
Yaratgach har birida **Run NPM Install** bosing (web/admin/dealer/delivery uchun
Next.js o'rnatiladi, api uchun Prisma klienti ham yaratiladi).

Frontend ilovalarga (web/admin/dealer/delivery) hech qanday o'zgaruvchi **kiritilmaydi**:
manzillar qurish paytida ichiga yozilgan.

## 5. API ni sozlash (SSH)

`Terminal` (yoki SSH) da, cPanel ko'rsatgan «virtual environment» buyrug'ini bajaring
(`source /home/…/nodevenv/barff/api/…/activate && cd /home/…/barff/api`), so'ng:

```bash
npm run setup          # savol-javob: baza nomi/foydalanuvchi/parol, admin email
npm run env:check      # "✓ .env to'g'ri" chiqishi kerak
npm run db:deploy      # jadvallar
npm run db:seed        # rollar, ruxsatlar, birinchi administrator
npm run env:scrub      # admin parolini .env dan o'chiradi
```

`npm run setup` birinchi administrator parolini **bir marta** ekranga chiqaradi — yozib oling,
kirgach darhol almashtiring. U `api/.env` yaratadi (rejim 600, veb'ga berilmaydi);
JWT sirlari shu yerda tasodifiy yaratiladi. Fayl bor bo'lsa, setup uni **bosmaydi**
(aks holda hamma sessiyalar bekor bo'lardi).

Haqiqiy mahsulot katalogi (36 ta surat) kerak bo'lsa:

```bash
nohup npm run catalog:import > ~/catalog.log 2>&1 &     # ~7 daqiqa, SSH'ni yopmang
```

So'ng `Setup Node.js App` da **beshala ilovani RESTART** qiling.

## 6. Tekshirish

Kompyuteringizdan (Node 20+ bor bo'lsa):

```bash
node scripts/post-deploy-check.mjs
# kirishni ham tekshirish:
ADMIN_EMAIL=… ADMIN_PASSWORD=… node scripts/post-deploy-check.mjs
```

U tekshiradi: API va baza, har bir ilova uchun CORS, sayt va CSS, rasmlar, admin yashirinligi,
haydovchi ilovasi fayllari, cookie bayroqlari (`Secure`, `HttpOnly`, `.barff.uz`).
Yiqilgan qator nima qilish kerakligini ko'rsatadi. Qo'lda: `https://admin.barff.uz` ga kiring.

## 7. Keyin

1. Admin'ga kirib parolni almashtiring (**Tizim → Xodimlar → Parol**).
2. Ma'lumotlarni kiriting: `docs/OWNER-ADMIN-GUIDE.md`.
3. Kontent tayyor bo'lgach qidiruv tizimlariga oching: `release.env` da
   `NEXT_PUBLIC_ALLOW_INDEXING=true`, so'ng `pnpm release:cpanel` va **faqat `web`** ni qayta yuklang.
4. Zaxira: `docs/BACKUP-RESTORE.md` (kunlik cron).

## Yangilash

Kompyuterda `pnpm release:cpanel`; faqat o'zgargan ilovaning zip'ini yuklab **Extract (ustiga yozish)**,
`Run NPM Install`, **RESTART**. Sxema o'zgargan bo'lsa API'da RESTART'dan oldin `npm run db:deploy`.
`api/.env` zip tarkibida YO'Q, shuning uchun yangilash uni o'chirmaydi.

## Muammo bo'lsa

| Belgi                                | Sabab                                                            |
| ------------------------------------ | ---------------------------------------------------------------- |
| Sayt uslubsiz                        | `.next/static` ochilmagan yoki eski jarayon — RESTART            |
| Kirish "ishlamayapti", konsolda CORS | `npm run env:check` — `API_CORS_ORIGINS` to'liqmi                |
| Rasmlar 404                          | `MEDIA_PUBLIC_URL` `/api/v1/media` bilan tugaydimi (`env:check`) |
| `Cannot find module`                 | `Run NPM Install` bosilmagan                                     |
| API 503                              | `.env` dagi baza ma'lumotlari / PostgreSQL ishlayaptimi          |
