# FAZA 3 — CHIQARISH HUJJATI

> Qamrov: ombor, buyurtmani bajarish, logistika va haydovchi PWA'si
> (`delivery.barff.uz`) hamda ularni ta'minlaydigan API.
> Qadamlar: **S30–S35** (`ROADMAP.md`). Darvoza qadami: **S35**.
> Sana: 2026-09-30.

---

## 1. HOLAT: BIR QARASHDA

| Narsa                                         | Holat                                               |
| --------------------------------------------- | --------------------------------------------------- |
| **Darvoza sharti**                            | ✅ **o'tdi** — quyida, §2                           |
| Zanjir brauzerda                              | ✅ 39 tekshiruvdan 39 tasi o'tdi                    |
| Yarashtirish (baza)                           | ✅ toza — §3                                        |
| Sifat darvozalari                             | ✅ format, lint, tip, test, build                   |
| **Staging'ga joylash**                        | ⛔ **BAJARILMADI — bu muhitda server kirishi yo'q** |
| Haqiqiy ombor, mashina va haydovchi ma'lumoti | ⛔ kutilmoqda — hammasi MOCK                        |

**Ochiq aytilsin:** Faza 1 va 2 dagi kabi, S35 ning "staging'ga
joylash" vazifasi **bajarilmadi**, va sabab kodda emas. cPanel
paroli, SSH kaliti va API kalitlari bu muhitda yo'q va bo'lmasligi
ham kerak (`CLAUDE.md` §12) — ular to'g'ridan-to'g'ri serverda
kiritiladi. Tartib `docs/DEPLOY-CPANEL.md` da.

CI'da beshala Docker tasviri (API, sayt, admin, diler portali,
haydovchi PWA) quriladi va ko'tariladi, lekin quvur hech qachon
HAQIQIY muhitga yugurtirilmagan. "Staging'da ishlayapti" deb ayta
olmayman — faqat "joylashga tayyor" deb aytaman.

---

## 2. DARVOZA SHARTI

> `ROADMAP.md` S35: **"physical fulfilment is fully traceable in the
> system."**

**O'tdi.** Zanjirning har bir qadami brauzerda, HAR BIRI O'Z ROLI
bilan bajarildi. Adminning hamma ruxsati bor va butun zanjirni u
bilan yurish "omborchi o'z ishini qila oladimi" degan savolga javob
bermasdi — darvozaning asl savoli esa aynan shu.

| #   | Qadam                    | Kim           | Qayerda                            |
| --- | ------------------------ | ------------- | ---------------------------------- |
| 0   | Haydovchi profili        | admin         | `admin.barff.uz/logistics/fleet`   |
| 1   | Buyurtma                 | diler         | `partner.barff.uz/catalog`         |
| 2   | Tasdiqlash               | admin         | `admin.barff.uz/orders/[id]`       |
| 3   | Zaxiraga olish           | admin         | `admin.barff.uz/orders/[id]`       |
| 4   | Yig'ish va qadoqlash     | **ombor**     | `admin.barff.uz/warehouse/picking` |
| 5   | Jo'natishga tayyor       | **ombor**     | `admin.barff.uz/warehouse/picking` |
| 6   | Haydovchi biriktirish    | **logist**    | `admin.barff.uz/logistics`         |
| 7   | Olindi → … → Topshirildi | **haydovchi** | `delivery.barff.uz`                |
| 8   | Zanjir yopildi           | —             | buyurtma `DELIVERED`               |

Skript: `qa/e2e-phase3.mjs`. Oxirgi yurish — **39 tekshiruvdan 39
tasi o'tdi**, brauzer konsolida 0 xato.

### Qoldiq har bosqichda RAQAM bilan

Darvoza "kuzatiladi" deydi, ya'ni raqam kerak. Har bosqichda
qoldiq API'dan o'qildi (ekrandan emas: ekrandagi raqam keshdan
kelgan bo'lishi mumkin):

| Bosqich         | Qoldiq  | Band  |
| --------------- | ------- | ----- |
| boshlanish      | 484     | 0     |
| tasdiqlandi     | 484     | 0     |
| zaxiraga olindi | 484     | **1** |
| qadoqlandi      | **483** | 0     |
| topshirildi     | 483     | 0     |

Ya'ni: **zaxira qoldiqni kamaytirmaydi, qadoqlash kamaytiradi.**
Bu `docs/WAREHOUSE-POLICY.md` dagi asosiy qoida va u endi
o'lchandi, o'qilmadi.

---

## 3. YARASHTIRISH

Skript: `qa/reconcile-phase3.mjs`. U BAZANING O'ZIDAN o'qiydi va
beshta invariantni tekshiradi:

| #   | Invariant                                                   | Natija |
| --- | ----------------------------------------------------------- | ------ |
| 1   | `warehouse_stock.quantity` = harakat jurnalining yig'indisi | ✅ 3/3 |
| 2   | `reservedQuantity` = ochiq zaxiralarning yig'indisi         | ✅ 3/3 |
| 3   | Qadoqlangan har bir buyurtmada `OUT` bor va miqdori mos     | ✅ 6/6 |
| 4   | Jo'natishga tayyor har bir buyurtmada yetkazma bor          | ✅ 6/6 |
| 5   | Topshirilgan yetkazmaning buyurtmasi ham topshirilgan       | ✅ 2/2 |

**Tekshiruv O'ZI ham tekshirildi.** Yashil natija "hammasi joyida"
degani emas, "tekshiruv hech nima ko'rmadi" degani ham bo'lishi
mumkin. Shuning uchun tetik vaqtincha o'chirilib, qoldiq QO'LDA 7
ga o'zgartirildi:

```
MAIN/MOCK-OLMA-1000: qoldiq 495, jurnal 488
XATO qoldiq jurnal yigindisiga TENG — 3 ta juftlik, 1 tasi mos kelmadi
NATIJA: 1 ta nomuvofiqlik   (chiqish kodi 1)
```

Tiklangandan keyin yana toza. Ya'ni yarashtirish HAQIQATAN
farqni ko'radi.

Skript bo'sh bazani ham xato deb hisoblaydi: tekshiriladigan
buyurtma bo'lmasa, "0 ta nomuvofiqlik" darvozani yopmaydi.

---

## 4. DARVOZA TOPGAN NOSOZLIK

Darvozaning vazifasi — ishlamayotgan narsani topish. Bittasi
topildi va tuzatildi:

**Haydovchi biriktirish oynasi birinchi haydovchini OLDINDAN
tanlab qo'yardi.** Sinov aniq bir haydovchini tanlagan deb o'ylab
tugmani bosdi, yetkazma esa ro'yxatdagi BIRINCHI haydovchiga
ketdi. Bu yerda odam manzilga BORADI — standart qiymat
qo'yiladigan joy emas. Endi oyna «Tanlang» bilan ochiladi va
tanlanmaguncha tugma o'chiq turadi (xuddi «bajarilmadi» dagi
«qayta urinish» tugmasi kabi: bir bosish bilan xatoni takrorlash
oson bo'lmasligi kerak).

Qolgan to'rtta nosozlik SINOVNING O'ZIDA edi va ular
`qa/README.md` da yozilgan — eng muhimi: `stockOf` qoldiqni
o'qiy olmaganda `-1` qaytarardi va "qoldiq o'zgarmadi" tekshiruvi
`-1 === -1` bo'lib O'TARDI. Ikkita tekshiruv NOTO'G'RI SABABDAN
yashil edi.

---

## 5. NIMA MOCK, NIMA HAQIQIY

Tizimdagi HAMMA fizik ma'lumot hali MOCK:

- ombor: `MAIN — Asosiy ombor (MOCK)`, hududi
  `REPLACE_WITH_REAL_DATA`
- mahsulotlar: `[MOCK] Olma sharbati`, `[MOCK] Anor sharbati`
- mashinalar va haydovchilar: sinov yozuvlari
- qoldiqlar: sinov uchun kiritilgan raqamlar

**Haqiqiy ma'lumot BARFF dan keladi** (`CLAUDE.md`: "Never invent
real company facts"). Zanjir ishlaydi; unga solinadigan ma'lumot
kutilmoqda.

---

## 6. KEYINGI QADAMLAR

1. Haqiqiy ombor(lar), mashina va haydovchi ro'yxati.
2. Boshlang'ich qoldiqlarni kiritish (`admin.barff.uz/warehouse/stock`).
3. Staging'ga joylash — `docs/DEPLOY-CPANEL.md`, kirish berilgandan keyin.
4. Faza 4: hisob-faktura, to'lov, balans (S36–S39).
