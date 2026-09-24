# FAZA 2 — CHIQARISH HUJJATI

> Qamrov: diler portali (`partner.barff.uz`) + uni ta'minlaydigan API va
> admin paneldagi diler/buyurtma boshqaruvi.
> Qadamlar: **S22–S29** (`ROADMAP.md`). Darvoza qadami: **S29**.
> Sana: 2026-09-24.

---

## 1. HOLAT: BIR QARASHDA

| Narsa                                      | Holat                                               |
| ------------------------------------------ | --------------------------------------------------- |
| **Darvoza sharti**                         | ✅ **o'tdi** — quyida, §2                           |
| Kod tayyorligi                             | ✅ butun zanjir brauzerda o'tdi                     |
| Sifat darvozalari (lint, tip, test, build) | ✅ o'tadi                                           |
| Yuk sog'lig'i                              | ✅ o'lchandi — §4                                   |
| **Staging'ga joylash**                     | ⛔ **BAJARILMADI — bu muhitda server kirishi yo'q** |
| Haqiqiy narx va daraja siyosati            | ⛔ kutilmoqda (Q13, Q14)                            |

**Ochiq aytilsin:** Faza 1 dagi kabi, S29 ning "staging'ga joylash"
vazifasi **bajarilmadi**, va sabab kodda emas.

Joylash muhiti ma'lum (Q18 ga javob keldi: hostmaster.uz cPanel,
AWS emas) va tartib `docs/DEPLOY-CPANEL.md` da yozilgan. Lekin
serverga kirish ma'lumotlari bu muhitda YO'Q va bo'lmasligi ham
kerak: cPanel paroli, SSH kaliti va API kalitlari chatga ham,
repoga ham yozilmaydi (`CLAUDE.md` §12). Ular to'g'ridan-to'g'ri
serverda kiritiladi.

Shuning uchun joylashni BARFF (yoki men, kirish berilgandan keyin)
`DEPLOY-CPANEL.md` bo'yicha bajaradi. CI'da to'rtala Docker tasviri
(API, sayt, admin, diler portali) muvaffaqiyatli quriladi va
ko'tariladi, lekin quvur hech qachon HAQIQIY muhitga
yugurtirilmagan. "Staging'da ishlayapti" deb ayta olmayman — faqat
"joylashga tayyor" deb aytaman.

---

## 2. DARVOZA SHARTI

> `ROADMAP.md` S29: **"a dealer can order without any manual database
> intervention."**

**O'tdi.** Zanjirning HAR BIR qadami brauzerda, haqiqiy foydalanuvchi
kabi bajarildi. Bazaga birorta ham qo'lda yozuv kiritilmadi, birorta
qadam `curl` bilan o'tkazilmadi.

| #   | Qadam                          | Qayerda                        |
| --- | ------------------------------ | ------------------------------ |
| 1   | Diler arizasi + akkaunt        | `partner.barff.uz/register`    |
| 2   | Tasdiqlanmagan diler bloklandi | server javobi `403`            |
| 3   | Admin arizani tasdiqladi       | `admin.barff.uz/dealers/[id]`  |
| 4   | Diler manzil qo'shdi           | `partner.barff.uz/addresses`   |
| 5   | Katalog → savat                | `partner.barff.uz/catalog`     |
| 6   | Buyurtma yuborildi             | `partner.barff.uz/cart`        |
| 7   | Admin buyurtmani tasdiqladi    | `admin.barff.uz/orders/[id]`   |
| 8   | Diler yangi holatni ko'rdi     | `partner.barff.uz/orders/[id]` |

Skript: `qa/e2e-phase2.mjs`. Oxirgi yurish — **18 ta tekshiruvdan 18
tasi o'tdi, brauzer konsolida 0 ta xato.**

### 2.1 DARVOZANI OCHISH UCHUN IKKITA EKRAN QO'SHILDI

Darvoza sharti S28 tugaganda ham **bajarilmasdi**, chunki zanjirning
ikkita bo'g'ini UMUMAN yo'q edi:

- **Diler arizasi formasi yo'q edi.** `POST /dealers/register` S22 da
  qurilgan, lekin unga hech qanday ekran ulanmagan — ariza faqat
  `curl` bilan yuborilardi.
- **Admin panelda dilerlar ekrani yo'q edi.** `/dealers` menyuda
  `ready: false` turardi, ya'ni yangi dilerni tasdiqlashning yagona
  yo'li `PATCH /admin/dealers/:id/status` ni qo'lda chaqirish edi.

Ikkalasi ham shu qadamda qo'shildi. Ularsiz "qo'lda aralashuvsiz"
degan shart yolg'on bo'lardi.

---

## 3. FAZA 2 NIMANI O'Z ICHIGA OLADI

### Diler portali — 9 marshrut

`/register` · `/login` · `/` (boshqaruv paneli) · `/catalog` · `/cart` ·
`/orders` · `/orders/[id]` · `/addresses` · `/profile` · `/support`

Mobil birinchi: dilerlar telefondan buyurtma beradi (S24).

### Admin panel — diler va buyurtma boshqaruvi

Dilerlar ro'yxati (holat va qidiruv filtri bilan), diler tafsiloti
(tasdiqlash/rad etish/to'xtatish, daraja, kredit limiti, manzillar,
tarix, ichki izoh), buyurtmalar ro'yxati (holat, diler, hudud, sana,
raqam bo'yicha filtr), buyurtma tafsiloti (pozitsiyalar, narxlar,
holat tugmalari, ichki izoh, tarix).

### API

Diler ro'yxatdan o'tishi va tasdiqlanishi, narx hal qiluvchi (S23),
katalog, savat, buyurtma holatlari mashinasi, admin boshqaruvi.

---

## 4. NIMA O'LCHANDI

Skriptlar `qa/` katalogida. Qayta yurgizish tartibi va **sakkizta
muhit tuzog'i** `qa/README.md` da.

### 4.1 Zanjir (`qa/e2e-phase2.mjs`)

18/18 tekshiruv o'tdi, konsolda 0 xato.

### 4.2 Yuk sog'lig'i (`qa/load-phase2.mjs`)

Bu **yuk sinovi emas**: konteynerda o'lchangan RPS ishlab chiqarish
uchun hech narsa anglatmaydi. Maqsad — ikkita aniq savol.

| O'lchov                                          | Natija                           |
| ------------------------------------------------ | -------------------------------- |
| Katalog: 200 so'rov, 20 tasi parallel            | p50 **73 ms** · p95 **116 ms**   |
| Katalog o'tkazuvchanligi                         | **253 so'rov/s**                 |
| Katalogda xato javoblar                          | **0**                            |
| 3 diler BIR VAQTDA buyurtma berdi                | **3 ta noyob raqam**             |
| Bir xil `idempotencyKey` bilan parallel yuborish | **bitta buyurtma** (`201`+`201`) |

Oxirgi ikkisi tasodifiy tanlanmagan:

- **Buyurtma raqami** yillik hisoblagichdan chiqadi. "O'qi → +1 →
  yoz" yondashuvida ikkita diler bir vaqtda buyurtma bersa IKKALASI
  bir xil raqam olardi. S26 da u `INSERT ... ON CONFLICT DO UPDATE
RETURNING` bilan atomar qilingan — bu o'lchov aynan o'sha da'voni
  sinaydi. Bitta diler bilan buni sinab bo'lmaydi (savat bitta),
  shuning uchun skript uchta diler yaratadi.
- **Takroriy yuborish** — har kunlik holat: diler tugmani ikki marta
  bosadi yoki tarmoq javobni yo'qotadi.

**Muhit haqida:** o'lchov `API_RATE_LIMIT_MAX=100000` bilan olingan.
Standart cheklov (60 soniyada 120 so'rov) bilan javoblarning bir
qismi `429` bo'ladi va `p95` aslida CHEKLOVNING tezligini
ko'rsatardi. Skript buni sezadi, o'lchovni "ishonchsiz" deb
belgilaydi va `2` kodi bilan chiqadi — noto'g'ri raqam bermaydi.

---

## 5. SHU QADAMDA TOPILGAN HAQIQIY NOSOZLIK

**`POST /dealers/register` band telefon uchun `500` qaytarardi.**

`User.phone` `@unique`, lekin ro'yxatdan o'tishda u tekshirilmasdi.
Email va STIR tekshirilgan, telefon esa tushib qolgan: ikkinchi ariza
o'sha raqam bilan kelganda `tx.user.create()` `P2002` bilan yiqilib,
endpoint `500` qaytarardi.

Buni kodni o'qib emas, **sinovni ikkinchi marta yurgizib** topdim:
birinchi yurish yashil edi.

Bu haqiqiy foydalanuvchi holati — bitta ofisdan ikkinchi odam ariza
yuborsa, u "server xatosi" ko'rardi va nima qilishni bilmasdi.

**Tuzatish:** telefon endi email bilan bir xil yo'ldan o'tadi —
javob `202` va `{accepted: true}`, lekin yangi yozuv yaratilmaydi.
Jim yutish ataylab: "bu raqam band" javobi kimning raqami ro'yxatda
borligini oshkor qilardi (`CLAUDE.md` §12). Poyga uchun `P2002`
alohida qo'lga olinadi — tekshiruvning o'zi yetarli emas, chunki
tekshiruv bilan `INSERT` orasida oyna bor.

Test: `services/api/test/dealers.e2e-spec.ts` — `"band telefon uchun
javob BIR XIL — 500 emas"`. Mutatsiya bilan tekshirildi: tuzatish
olib tashlansa test aynan `500` bilan yiqiladi.

---

## 6. SINOVNING O'ZIDAGI UCHTA XATO

Ular ham yozib qo'yilsin — ikkinchi marta takrorlanmasligi uchun.
Batafsili `qa/README.md` da (tuzoqlar 5–7).

1. **Telefon qattiq yozilgan edi.** Birinchi yurish yashil, ikkinchisi
   jim yiqildi — aybdor ilova emas, sinov edi.
2. **Tugma matni tipografik apostrof bilan.** `To‘xtatilgan` dagi `’`
   ASCII `'` emas; yorliq faylida ASCII yozilgan edi va sinov tugmani
   topa olmadi.
3. **Ikkita tekshiruv YOLG'ON yashil edi.** "Tasdiqlangan matni
   ko'rindimi" — tugmaning O'ZIDA ham shu matn bor edi, ya'ni
   tasdiqlash umuman ishlamasa ham sinov o'tardi. "Savat bo'sh emas"
   — savat YUKLANMAGANDA ham o'tardi. Ikkalasi ham mutatsiya
   yurgizganda ko'rindi va ikkalasi ham almashtirildi: tugmalarning
   ALMASHISHI va "Jami" qatorining BORLIGI bilan.

---

## 7. NIMA QOLDI

| Narsa                                            | Kim beradi | Savol |
| ------------------------------------------------ | ---------- | ----- |
| Diler darajalari, chegirma qoidalari, MOQ        | BARFF      | Q13   |
| Hududiy narxlash va kredit limiti qo'llanadimi   | BARFF      | Q14   |
| cPanel kirishi, Node versiyasi, xotira chegarasi | BARFF      | Q18   |
| Brendbukdagi RASMIY HEX va SVG logotip           | BARFF      | Q2    |

Faza 3 (`S30–S35`) omborni, zaxirani, yig'ish-qadoqlashni va
haydovchi PWA sini qo'shadi — buyurtma `CONFIRMED` dan keyin shu
yerdan davom etadi.
