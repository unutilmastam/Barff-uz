# MOLIYA SIYOSATI — HISOB-FAKTURA, TO'LOV, BALANS

> Qamrov: `S36`. Kod: `services/api/src/billing/`,
> `packages/types/src/billing.ts`.
>
> Bu hujjat QARORLARNI va ularning SABABINI yozadi. Kod nima
> qilishini ko'rsatadi; bu yerda nega shunday qilingani turadi.

---

## 0. NIMA HALI YO'Q VA NEGA

**QQS va hisob-faktura shakli — BARFF dan kelmagan** (Q17).

Shuning uchun:

- `Invoice.taxAmount` maydon sifatida BOR, lekin HAR DOIM `0` va
  hech qayerda hisoblanmaydi;
- rasmiy O'zbekiston hisob-faktura shakli CHIZILMAGAN;
- PDF generatori QO'SHILMAGAN.

Soliq stavkasini yoki rasmiy shaklni o'ylab topish — soliq
hujjatini soxtalashtirish. `CLAUDE.md`: _"Never invent real
company facts"_.

Hozircha bor narsa: **chop etishga tayyor ko'rinish** (brauzerdan
«Chop etish → PDF sifatida saqlash») va **CSV eksport**
buxgalteriya uchun. Ikkalasi ham yangi bog'liqliksiz ishlaydi va
ikkalasi ham RASMIY HUJJAT EMASLIGI ochiq yozilgan.

Q17 ga javob kelganda shakl qo'shiladi va `taxAmount` hisoblana
boshlaydi — jadval va summalar shunga TAYYOR.

---

## 1. PUL BUTUN SONDA, TIYINDA

Har bir summa — `Int`, eng kichik birlikda.

`0.1 + 0.2 !== 0.3`. Kasr bilan hisoblangan balansda xato
to'planadi va u HECH QAYERDA ko'rinmaydi: har bir qator to'g'ri
ko'rinadi, faqat jami noto'g'ri bo'ladi.

Sxema (`Int`), validatsiya (`z.number().int()`) va
`packages/utils/src/money.ts` — uchtasi ham shu qoidani
majburlaydi. Kasr summa yuborilsa `400` qaytadi va bu sinovda
qulflangan.

---

## 2. BALANS SAQLANMAYDI — HISOBLANADI

```
qarz = berilgan hisob-fakturalar − kelgan to'lovlar
```

Saqlangan balans jurnaldan ajralib ketishi mumkin va ajralganda
**qaysi biri to'g'ri ekani ko'rinmaydi**. Omborda ham shu sabab
qoldiq harakat jurnalining proyeksiyasi qilingan (S30,
`docs/WAREHOUSE-POLICY.md`).

Farqi: omborda tetik kerak edi, chunki qoldiq har o'qishda
hisoblansa so'rov og'ir bo'lardi. Bu yerda jadvallar kichik va
to'rtta `SUM` arzon.

**BERILGAN HAMMA HUJJAT QO'SHILADI, faqat ochiqlari emas.**

Bu yerda men deyarli xato qilgandim. Birinchi versiyada balans
faqat `ISSUED` va `PARTIALLY_PAID` hujjatlarni qo'shardi,
to'lovlarni esa HAMMASINI. To'liq to'langan hisob-faktura `PAID`
bo'lib ro'yxatdan chiqardi, uning to'lovi esa qolardi — natijada
**qarz manfiy ko'rinardi** va har bir to'lagan diler "oldindan
to'lagan" bo'lib chiqardi.

`CANCELLED` va `DRAFT` qo'shilmaydi: birinchisi yo'q qilingan
majburiyat, ikkinchisi hali berilmagan hujjat.

---

## 3. HISOB-FAKTURA FAQAT YETKAZILGAN BUYURTMADAN

`DELIVERED` — yagona holat.

Hisob-faktura "tovar yetkazildi, endi to'lang" degan hujjat.
Yo'ldagi buyurtmaga hujjat berilsa va yetkazish BAJARILMASA,
dilerda to'lanishi kerak bo'lmagan hujjat qolardi va uni bekor
qilish alohida ish bo'lardi.

**Oldindan to'lov kerak bo'lsa** — u TO'LOV sifatida kiritiladi
va balansda diler foydasiga turadi, hisob-fakturasiz. Taqsimot
keyin, hujjat berilganda bo'ladi.

**BITTA BUYURTMAGA BITTA HISOB-FAKTURA** (`orderId` yagona) —
yetkazma bilan bir xil qoida. Ikkitasi bo'lsa, diler bir ishni
ikki marta to'lashi mumkin edi.

---

## 4. KREDIT LIMITI: BLOKLAYDI, BELGILAMAYDI

`ROADMAP.md` S36 ikki variantni beradi: _"block or flag —
decision documented"_.

**QAROR: BLOKLAYDI.**

Sabab: "belgilangan" buyurtma baribir kimningdir qo'lda ko'rib
chiqishini talab qiladi, ya'ni ish kamaymaydi — lekin bu paytda
tovar zaxiraga olingan bo'lardi va u boshqa dilerga
yetmasdi.

Tekshiruv buyurtma YARATILISHIDAN OLDIN. Keyin bo'lsa, limitdan
oshgan buyurtma bazaga tushib, keyin bekor qilinishi kerak
bo'lardi — va bekor qilish yiqilsa, u qolib ketardi.

### `creditLimit === null` — LIMIT SOZLANMAGAN

Sxemadagi eski izoh buni _"limit yo'q, faqat oldindan to'lov"_
deb o'qishga ham yo'l qo'yardi. Shu ma'noda olinsa, **bugungi
hamma diler** (hammasida `null`) buyurtma bera olmay qolardi —
ishlayotgan oqim buzilardi (`CLAUDE.md` §30: _"Preserve working
functionality"_).

Haqiqiy siyosat BARFF dan kelmagan (Q14, Q17), shuning uchun u
**O'YLAB TOPILMAYDI**: limit qo'yilgan dilerda tekshiriladi,
qo'yilmaganida tekshirilmaydi.

Chegara: `buyurtma > qolgan limit` bloklaydi, ya'ni **aynan
limitga teng buyurtma O'TADI**. `>` va `>=` farqi sinovda
qulflangan.

Xato xabari RAQAM beradi: limit, joriy qarz, qolgan, buyurtma
summasi. "Limit yetmaydi" degan quruq xabar dilerni telefon
qilishga majburlardi.

---

## 5. HOLAT TAQSIMOTDAN KELIB CHIQADI

`PARTIALLY_PAID` va `PAID` **qo'lda qo'yilmaydi** — ular to'lov
taqsimotidan hisoblanadi (`invoiceStatusFor`).

Qo'lda qo'yish imkoni bo'lsa, "to'landi" deb belgilangan, lekin
pul kelmagan hisob-faktura paydo bo'lardi va balans jim yolg'on
gapirardi.

O'tish jadvalida ular MAQSADLI RAVISHDA yo'q va buni sinov
tekshiradi: `INVOICE_STATUSES` ning HAR BIRIDAN `PAID` ga o'tish
`false` qaytaradi.

### `ISSUED` DAN KEYIN SUMMALAR MUZLAYDI

Berilgan hujjatni qoralamaga qaytarish — dilerdagi qog'ozdan
ajralish. Tuzatish yo'li bitta: **bekor qilish va yangisini
berish**.

Bekor qilishda **sabab SHART** (kamida 3 belgi). Sababsiz bekor
qilingan hisob-faktura buxgalter uchun foydasiz yozuv — u
baribir so'rab chiqishi kerak bo'lardi. Xuddi yetkazmadagi
`failureReason` kabi (S32).

**Taqsimlangan to'lovi bor hujjat bekor qilinmaydi.** Aks holda
pul "hech qaysi hisob-fakturaga tegishli emas" holatga tushib
qolardi: avval taqsimot olib tashlanadi, keyin bekor qilinadi.

---

## 6. TO'LOV HISOB-FAKTURAGA EMAS, DILERGA TUSHADI

Sabab amaliy: diler ko'pincha bitta pul o'tkazmasi bilan bir
nechta hisob-fakturani yopadi, yoki oldindan to'laydi.

Qaysi hujjat yopilgani ALOHIDA yoziladi
(`PaymentAllocation`). Shuning uchun **taqsimlanmagan to'lov ham
to'g'ri holat**: u dilerning foydasiga balansda turadi.

### AVTOMATIK TAQSIMOT — ESKISIDAN BOSHLAB

`allocations` berilmasa, servis eng eski ochiq hujjatdan boshlab
yopadi. Bu buxgalteriyada odatiy tartib va u muddati o'tgan
hujjatni birinchi yopadi.

**Ortiqcha summa zo'rlab yopishtirilmaydi.** Uni biror hujjatga
yopishtirish "110% to'langan hisob-faktura" degan ma'nosiz yozuv
yaratardi.

### QAYTA TAQSIMLASH — ALMASHTIRISH, QO'SHISH EMAS

`PUT /billing/payments/:id/allocations` eski taqsimotni butunlay
o'chiradi va yangisini yozadi.

"Qo'shish" bo'lsa, ikki marta yuborilgan so'rov summani ikki
barobar qilardi.

Almashtirishda **eski hujjatlar ham qayta hisoblanadi**:
taqsimot olib tashlangan hujjat "to'landi" bo'lib qolsa, balans
to'g'ri, ro'yxat esa yolg'on ko'rsatardi. Bu sinovda
qulflangan.

---

## 7. DILER FAQAT O'ZINIKINI KO'RADI

`dealerId` SO'ROVDAN OLINMAYDI — sessiyadan topiladi.

Begona hujjat `404` beradi, `403` EMAS: `403` "bunday hujjat
BOR, lekin sizga emas" degani va shu bilan boshqa dilerlarning
hujjat id larini tekshirish vositasiga aylanardi
(`docs/DELIVERY-POLICY.md` §4 dagi bilan bir xil sabab).

**QORALAMA HISOB-FAKTURA DILERGA KO'RSATILMAYDI** — na
ro'yxatda, na to'g'ridan-to'g'ri. U hali BERILMAGAN hujjat.

`internalNote` — ichki izoh, dilerga ko'rsatilmaydi (dilerga
ko'rinadigan sabab alohida maydonda: `cancelReason`).

---

## 8. AUDIT

Har bir moliyaviy o'zgarish jurnalga tushadi (`CLAUDE.md` §23):

| Amal                   | Audit                             |
| ---------------------- | --------------------------------- |
| Hisob-faktura yaratish | `invoice.created`                 |
| Berish                 | `invoice.issued`                  |
| Bekor qilish           | `invoice.cancelled` (sabab bilan) |
| Muddat/izoh            | `invoice.changed`                 |
| To'lov                 | `payment.recorded`                |
| Qayta taqsimlash       | `payment.allocated`               |
| Kredit limiti          | `dealer.credit_limit.changed`     |

Kredit limiti o'zgarishida `before` ham yoziladi: "kim limitni
oshirdi" degan savol moliyaviy tekshiruvda birinchi so'raladi.

---

## 9. RAQAMLAR

`INV-2026-000001`, `PAY-2026-000001`.

Hisoblagich ATOMAR oshiriladi (`INSERT ... ON CONFLICT DO UPDATE
... RETURNING`) va TRANZAKSIYA ICHIDA olinadi: yozuv
yaratilmasa, hisoblagich ham oshmaydi.

Moliyaviy hujjatda bu ayniqsa muhim: ikkita hisob-faktura bir xil
raqam olsa, buxgalteriya qaysi biri to'langanini ayta olmaydi.
"O'qi → +1 → yoz" yondashuvi S26 da o'lchab tekshirilgan va u
bir vaqtda kelgan ikki so'rovga BIR XIL raqam berardi.
