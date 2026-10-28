# Zaxira, tiklash, yangilash va orqaga qaytarish (S40)

> ROADMAP'dagi S40 AWS uchun yozilgan edi. Joylash muhiti — cPanel yoki VPS
> (`docs/OPEN-QUESTIONS.md` Q18), shuning uchun S40 shu muhit uchun
> bajarildi: AWS infratuzilmasi QURILMADI. Kod ikkala yo'lga ham mos
> (`docs/DEPLOY-CPANEL.md`, `docker-compose.yml`).

## 1. Nimani zaxiralaymiz

| Narsa                                    | Qayerda                 | Qanday                       |
| ---------------------------------------- | ----------------------- | ---------------------------- |
| Baza (buyurtma, pul, dilerlar, audit)    | PostgreSQL              | `pg_dump` (custom format)    |
| Yuklangan rasm va hujjatlar              | `MEDIA_ROOT` (diskda)   | `tar.gz`                     |
| Sirlar (`JWT_*`, `MEDIA_SIGNING_SECRET`) | cPanel muhit maydonlari | **parol menejerida alohida** |

Bazaning o'zi yetarli emas: fayllar bazada EMAS, diskda. Faqat baza
tiklansa rasmlar yo'q bo'lib qoladi (bazada yozuv bor, fayl yo'q).

Sirlar zaxiraga KIRMAYDI (zaxira faylini yo'qotgan odam sirni ham olib
ketmasligi uchun). Ularni mijoz parol menejerida o'zi saqlaydi.
`MEDIA_SIGNING_SECRET` yo'qolsa maxfiy havolalar yaroqsiz bo'ladi, lekin
`JWT_*` yo'qolsa hamma foydalanuvchi qayta kirishi kerak — ma'lumot
yo'qolmaydi.

## 2. Zaxira olish

Serverda skriptlar `~/barff/api/scripts/` da (`pnpm package:cpanel` ularni to'plamga qo'shadi; ishga tushirish huquqi: `chmod +x ~/barff/api/scripts/*.sh`).

```bash
DATABASE_URL=postgresql://... \
MEDIA_ROOT=$HOME/barff/media \
BACKUP_DIR=$HOME/barff/backups \
  ~/barff/api/scripts/db-backup.sh
```

Skript: dump + media arxivi + SHA-256 nazorat summalari yozadi va
`KEEP_DAYS` (14) dan eskilarini o'chiradi. Fayl huquqlari `600`.

**Kunlik avtomatik** — cPanel → `Cron Jobs`:

```
15 3 * * *  DATABASE_URL=... MEDIA_ROOT=... BACKUP_DIR=... $HOME/barff/api/scripts/db-backup.sh >> $HOME/barff/backup.log 2>&1
```

**MUHIM:** zaxira bilan bir serverda turgan nusxa serverning o'zi
yo'qolsa ham yo'qoladi. Kamida haftada bir marta `BACKUP_DIR` ni boshqa
joyga (mijozning kompyuteri, boshqa bulut) ko'chirish kerak.
Provayderning o'z "backup" xizmati ham yordam beradi, lekin unga yolg'iz
ishonmang — uni tiklab ko'rilmagan.

## 3. Zaxira ishlashini tekshirish (oyiga bir marta)

```bash
DATABASE_URL=... BACKUP_DIR=... ~/barff/api/scripts/db-restore-check.sh
```

Eng yangi dump'ni VAQTINCHALIK bazaga tiklaydi, har bir jadvaldagi
qatorlar sonini asl baza bilan solishtiradi va vaqtinchalik bazani
o'chiradi. Asl bazaga tegmaydi. Chiqish:

- `TIKLASH TASDIQLANDI` — zaxira ishonchli;
- `nazorat summasi MOS EMAS` — fayl buzilgan, yangi zaxira oling;
- `FARQ QILADI` — dump olingandan keyin baza o'zgargan (normal) YOKI
  tiklash to'liq emas; yangi dump olib qayta tekshiring.

### Mashq natijasi (2026-10-28, lokal, haqiqiy baza)

| Qadam                                              | Natija                                        |
| -------------------------------------------------- | --------------------------------------------- |
| Zaxira: baza 248 KB + 36 ta rasm 12 MB             | 1,3 soniya                                    |
| Tiklash va solishtirish                            | 53 jadval, qatorlar soni aynan bir xil, 1,1 s |
| Tekshiruvning o'zi: dump bir bayt buzildi          | nazorat summasi topdi, chiqish kodi 3         |
| Tekshiruvning o'zi: dump'dan keyin qator qo'shildi | farqni topdi (`system_settings` 5 ≠ 4)        |
| Vaqtinchalik baza                                  | har safar o'chirildi (0 ta qoldi)             |

Eslatma: bu kichik baza. Katta bazada vaqt oshadi; mashqni haqiqiy
ma'lumot bilan bir marta ishga tushirishdan oldin takrorlang.

## 4. Tiklash (haqiqiy avariya)

1. **Hamma ilovani to'xtating** (`Setup Node.js App` → Stop), aks holda
   tiklash paytida yangi yozuvlar tushadi.
2. Hozirgi (buzilgan) bazani ham zaxiralang — keyin kerak bo'lishi mumkin.
3. Bo'sh baza yarating yoki mavjudini tozalang, so'ng:

   ```bash
   pg_restore --no-owner --no-privileges --clean --if-exists \
     --dbname "$DATABASE_URL" barff-db-YYYYmmdd-HHMMSS.dump
   tar -C "$MEDIA_ROOT" -xzf barff-media-YYYYmmdd-HHMMSS.tar.gz
   ```

4. `cd ~/barff/api && npm run db:deploy` (zaxira eski bo'lsa, keyingi
   migratsiyalarni qo'llaydi).
5. Ilovalarni ishga tushiring, `/api/v1/health` va admin'ga kirishni
   tekshiring.
6. Zaxira olingandan keyingi buyurtmalar YO'QOLADI. Diler va sotuvchilarga
   shu oraliq aytilishi kerak. Zaxira tez-tez bo'lsa, oraliq qisqa.

## 5. Yangilash (deploy) tartibi

```
1. scripts/db-backup.sh                      ← har doim, migratsiyadan OLDIN
2. pnpm build && pnpm package:cpanel         (o'z kompyuteringizda)
3. dist-cpanel/* ni serverga yuklash
4. cd ~/barff/api && npm run db:deploy       (faqat yangi migratsiyalar)
5. Har ilovada: Run NPM Install → RESTART
6. /api/v1/health, admin va diler portalga kirish, bitta buyurtma ochib ko'rish
```

**Migratsiyalar faqat oldinga** (`prisma migrate deploy`): "ortga" migratsiya
yo'q. Shuning uchun 1-qadam shart — u yagona ishonchli orqaga qaytish yo'li.

Xavfsiz migratsiya qoidasi: ustunni bir yangilashda qo'shib-olib tashlamang.
Avval YANGI ustunni qo'shing (eski kod ishlayveradi), kodni yangilang,
KEYINGI yangilashda eskisini olib tashlang. Shunda yangilash o'rtasida
yoki orqaga qaytganda eski va yangi kod bir vaqtda ishlaydi.

## 6. Orqaga qaytarish

| Holat                                       | Nima qilinadi                                                                                     |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Yangi kod ishlamayapti, **migratsiya yo'q** | Oldingi `dist-cpanel` ni qayta yuklab, RESTART. Baza tegilmaydi.                                  |
| Yangi kod ishlamayapti, **migratsiya bor**  | Oldingi kod + §4 bo'yicha 1-qadamdagi zaxirani tiklash. Migratsiyadan keyingi yozuvlar yo'qoladi. |
| Migratsiya o'rtada yiqildi                  | `prisma migrate status` ni ko'ring; bazani zaxiradan tiklang, sababni tuzatib qayta urining.      |

Qaytarishni oson qilish uchun **oldingi `dist-cpanel` ni o'chirmang**
(`~/barff-prev/`) — bir daqiqada qaytariladi.

## 7. Muhitlar (CLAUDE.md §14)

Uch muhit — HECH QAYSI narsa umumiy emas:

| Muhit       | Baza         | Sirlar (JWT, signing) | Fayllar (`MEDIA_ROOT`) | Domen                      |
| ----------- | ------------ | --------------------- | ---------------------- | -------------------------- |
| development | lokal        | lokal `.env`          | lokal papka            | `localhost`                |
| staging     | alohida baza | ALOHIDA sirlar        | alohida papka          | masalan `staging.barff.uz` |
| production  | alohida baza | ALOHIDA sirlar        | alohida papka          | `barff.uz`                 |

- Production bazasi hech qachon ishlab chiqish uchun ishlatilmaydi.
- Staging'ga production ma'lumotini ko'chirsangiz — dilerlarning telefon va
  manzillari shaxsiy ma'lumot: ularni maskalash yoki umuman ko'chirmaslik kerak.
- `NODE_ENV=production` da API xotiradagi saqlash bilan ishga tushmaydi
  (`MEDIA_ROOT` majburiy).
