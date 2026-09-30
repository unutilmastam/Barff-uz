# HISOBOTLAR SIYOSATI

> Qamrov: `S37`. Kod: `services/api/src/reports/`,
> `packages/types/src/reports.ts`. Tekshiruv:
> `services/api/test/reports.e2e-spec.ts`.
>
> Bu hujjat QARORLARNI va ularning SABABINI yozadi.

---

## 0. NIMA ROADMAP'DAN FARQ QILADI

`ROADMAP.md` S37: _"large exports run as background jobs"_.

**Fon vazifalari (job queue) QURILMADI.** Sabab kodda emas, muhitda:
joylash muhiti hostmaster.uz cPanel va unda **Redis yo'q** (Q18).
Navbat uchun Redis yoki alohida ishchi jarayon kerak; ulushli
xostingda ikkalasi ham yo'q.

Buning o'rniga **OQIMLI eksport** (§5): javob bo'laklab yoziladi va
xotirada bir vaqtda bitta bo'lak turadi. DoD shartining o'zi —
_"exports stream without blocking the API"_ — shu bilan bajariladi.
Fon vazifasi ortiqcha xotirani ham, kutish vaqtini ham yechmaydi;
u faqat foydalanuvchi so'rovini uzoq ushlab turmaslik uchun kerak
bo'lardi, oqim esa birinchi baytni darhol beradi.

Agar keyinchalik haqiqiy navbat infratuzilmasi paydo bo'lsa
(S40, AWS), `ReportExportService.csv()` shu shaklda qoladi va
fon vazifasi uni chaqiradi.

**PDF QO'SHILMADI.** Roadmap "PDF where required" deydi. Hisobotlar
uchun PDF talab qilinmagan (`CLAUDE.md` §22: _"PDF if required"_),
rasmiy hujjat shakli esa hali yo'q (Q17). Kerak bo'lsa brauzerdan
«Chop etish → PDF sifatida saqlash»: ekranda chop etish ko'rinishi
bor (menyu va tugmalar yashiriladi).

---

## 1. RAQAMLAR MANBADAN, NUSXADAN EMAS

Har bir hisobot manba jadvaldan **to'g'ridan-to'g'ri** hisoblanadi
(SQL agregatsiya). Oraliq jadval, keshlangan yig'indi yoki
materializatsiya qilingan ko'rinish YO'Q.

Nusxa manbadan ajralib ketardi va hisobot raqami "hisob-faktura
raqamiga mos kelmaydi" degan shikoyatga aylanardi — va qaysi biri
to'g'ri ekanini bilib bo'lmasdi (omborda ham, moliyada ham shu
sabab: `docs/WAREHOUSE-POLICY.md`, `docs/BILLING-POLICY.md` §2).

**Moslik sinovi (S37 DoD).** `reports.e2e-spec.ts` har bir hisobotni
IKKI yo'l bilan hisoblaydi: API (SQL) va sinovning o'zida — manba
qatorlarni o'qib, JavaScript'da yig'ib (kun uchun `Intl`, SQL emas).
Bundan tashqari bir necha raqam QO'LDA yozilgan: ikkala hisob bir
xil xato qilsa ham ushlanishi uchun.

Sinovning o'zi ham tekshirilgan (mutatsiya): kunlarni UTC bo'yicha
guruhlash, bekor qilingan buyurtmani sotuvga qo'shish, jurnalni
bo'laklamaslik, CSV formula himoyasini olib tashlash — to'rttasi ham
sinovni yiqitadi.

---

## 2. KUN — TOSHKENT KUNI

`REPORT_TIME_ZONE = 'Asia/Tashkent'` (UTC+5, yozgi vaqtsiz).

Bazada vaqt UTC. Kunlar bo'yicha guruhlash UTC bilan qilinsa,
ertalab soat 05:00 gacha bo'lgan buyurtmalar KECHAGI kunga
tushardi va kunlik jami dilerning o'z hisobidan farq qilardi.

- `from`/`to` — `YYYY-MM-DD`, **ikkalasi ham kirgan** kunlar;
- `to` yarim ochiq oraliqqa aylantiriladi (`< keyingi kun boshi`),
  shuning uchun `23:59:59.999` shu kunga kiradi;
- sinovda: `2031-03-10T18:59:59.999Z` (Toshkent 23:59:59) — 10-mart,
  `2031-03-10T19:30:00Z` (Toshkent 00:30) — 11-mart.

To'liq vaqtli sana qabul QILINMAYDI: "gacha" chegarasi yarim kunni
kesib tashlardi. `2026-02-31` kabi mavjud bo'lmagan sana `400`.

---

## 3. "SOTUV" NIMA

**Tasdiqlangan va undan keyingi buyurtmalar**: `CONFIRMED`,
`RESERVED`, `PICKING`, `PACKED`, `READY_FOR_DELIVERY`,
`DRIVER_ASSIGNED`, `IN_TRANSIT`, `DELIVERED`.

Kirmaydi:

- `DRAFT`, `PENDING_REVIEW` — hali qabul qilinmagan taklif;
- `CANCELLED` — bekor qilingan.

Faqat `DELIVERED` ni olish sotuvni kechiktirardi: zaxiraga olingan
va yo'ldagi tovar allaqachon dilerga va'da qilingan. Yetkazilgani
alohida ustunda ko'rsatiladi.

**Bu tushum EMAS.** Pul tushumi — to'lovlar va hisob-fakturalar
(`docs/BILLING-POLICY.md`). Sotuv hisoboti "nima buyurtma qilindi va
qabul qilindi"ni ko'rsatadi, "nima to'landi"ni emas.

`orders` (Buyurtmalar) hisoboti esa HAMMA holatni, shu jumladan
bekor qilinganlarni ko'rsatadi: uning savoli "qayerda turibdi".

---

## 4. FILTRLAR

`from`, `to`, `region`, `dealerId`, `productId`.

**Hisobotga tegishli bo'lmagan filtr — `400`, jim e'tiborsizlik
emas** (`REPORT_FILTER_UNSUPPORTED`). `stock` ga `dealerId`
yuborgan iste'molchi filtrlangan natija oldim deb o'ylardi, aslida
BUTUN qoldiq kelardi. Ekranda ham tegishli bo'lmagan filtr umuman
ko'rinmaydi.

**`sales` va `regional-sales` da `productId` YO'Q ATAYLAB.**
Buyurtmada bir nechta mahsulot bo'lsa, filtr butun buyurtma
summasini ko'rsatib, tanlangan mahsulotning ulushini emas.
Mahsulot kesimi — `product-sales` da.

`region` — matn bo'yicha, katta-kichik harfga va chetdagi
bo'shliqqa befarq, lekin **aniq moslik**. Hududlar erkin matn
(buyurtma manzilidan nusxa); qisman moslik ("Tosh") boshqa
hududni ham olib kelardi.

---

## 5. EKSPORT

| Format | Qatorlar         | Qanday                                         |
| ------ | ---------------- | ---------------------------------------------- |
| JSON   | 1000 (5000)      | `limit`; jami baribir TO'LIQ                   |
| CSV    | **cheklanmagan** | OQIMLI, bo'laklab (kursor)                     |
| XLSX   | 50 000           | xotirada; kattasi `413` va CSV'ga yo'naltiradi |

### Nega XLSX o'zim yozdim

`exceljs`/`xlsx` o'nlab tranzitiv bog'liqlik qo'shadi; ulushli
xostingda bu xotira va o'rnatish vaqtiga tegadi (`CLAUDE.md` §30:
_"add unnecessary dependencies"_). Kerak bo'lgani bitta varaq —
XLSX oddiy ZIP ichidagi XML. Yozuvchi ~200 qator (`export/xlsx.ts`).

CRC-32 ham o'zimniki: `zlib.crc32` faqat Node 22.2+ da, xosting
versiyasi esa noma'lum (Q18).

**Tekshirilgan:** sinovda ZIP MUSTAQIL o'quvchi bilan ochiladi
(o'lcham va CRC tekshiriladi) va CRC-32 standart vektorga
(`123456789 → CBF43926`) teng; `qa/reports-check.mjs` esa faylni
haqiqiy o'quvchi — `openpyxl` — bilan ochib, qiymatlarni JSON'ga
solishtiradi.

### Nega CSV cheklanmagan, XLSX cheklangan

CSV qatorma-qator yoziladi — xotira bir bo'lak. XLSX varaqi XML
sifatida xotirada quriladi, shuning uchun chegara. Chegaradan
oshsa, katta jurnalni yuklashdan OLDIN rad etiladi: yuklab bo'lgach
rad etish xotirani bekorga band qilgan bo'lardi.

### Oqim qanday ishlaydi

Harakat jurnali (`stock-movements`) — eng katta jadval: har bir
zaxira, qadoqlash va tuzatishda yoziladi va hech qachon o'chirilmaydi.
Uni bir so'rov bilan xotiraga olish jurnal o'sgan sari API'ni
yiqitardi.

- **kursor** (`createdAt`, `id`) bilan bo'laklanadi — `OFFSET` katta
  sahifada sekinlashadi;
- bo'laklar orasida `setImmediate` — uzun eksport hodisalar siklini
  band qilmaydi;
- javob `Transfer-Encoding: chunked`, `Content-Length` yo'q.

Sinovda 10 000 qatorli jurnal: qatorlar soni manbaga teng, har bir
bo'lak 1000 dan oshmaydi, takrorlanish ham, tushib qolish ham yo'q.

**Ma'lum cheklov:** javob boshlangach xato yuz bersa (baza uzildi),
status kodini o'zgartirib bo'lmaydi — mijoz kesilgan fayl oladi.
Shuning uchun filtr xatolari oqim BOSHLANISHIDAN oldin tekshiriladi.

---

## 6. CSV XAVFSIZLIGI

**Formula in'eksiyasi.** `=`, `+`, `-`, `@`, tabulyatsiya yoki qator
boshi bilan boshlangan MATN Excel'da formula sifatida ochiladi.
Dilerning kompaniya nomini o'zi kiritadi (ochiq ariza formasi), ya'ni
`=HYPERLINK("http://...","Bosing")` degan nom buxgalterning jadvaliga
to'g'ridan-to'g'ri tushardi.

Tuzatish — matn boshiga `'` qo'yish. **Raqamga tegilmaydi**: manfiy
tiyin (`-500`) `number` bo'lib keladi va `'` olmaydi, aks holda
balans matnga aylanardi.

**S36 hisob-faktura eksportida ham shu nuqson bor edi** — o'z
`escape` funksiyasi formuladan himoya qilmasdi. S37 yozilganda
topildi va ikkalasi endi bitta yordamchidan foydalanadi
(`reports/export/csv.ts`).

XLSX da bu kerak emas: `inlineStr` katak MATN, formula emas
(`=1+1` katakda aynan `=1+1` bo'lib qoladi). XML uchun taqiqlangan
boshqaruv belgilari esa olib tashlanadi — bittasi butun faylni
Excel'da "buzilgan" qilardi.

**Birlik ochiq yoziladi:** pul ustunlari sarlavhada `(tiyin)`,
foiz `(%)`. Eksportda pul tiyinda (`docs/BILLING-POLICY.md` §1),
ekranda so'mda.

---

## 7. RUXSAT VA AUDIT

- `reports.view` — hisobotni ko'rish;
- `reports.export` — fayl olish.

**Ikkalasi ALOHIDA.** Eksport ma'lumotni tizimdan CHIQARIB oladi;
`SALES` roli ko'radi, lekin fayl ola olmaydi (sinovda `403`).

Har bir eksport audit jurnaliga yoziladi (`report.exported`: kim,
qaysi hisobot, format, filtrlar). XLSX da audit fayl QURILGANDAN
KEYIN yoziladi: rad etilgan (`413`) eksport ma'lumotni chiqarmadi.

**Ma'lum bo'shliq:** `WAREHOUSE` va `LOGISTICS` rollarida
`reports.view` yo'q, shuning uchun ular o'z sohasidagi hisobotni
(`stock`, `deliveries`) ko'rmaydi. Bu boshlang'ich ruxsatlar
jadvalidagi qaror (S03); uni o'zgartirish BARFF ning rol siyosatiga
bog'liq va o'ylab topilmaydi.

---

## 8. HISOBOTLAR

| Kalit                | Nimani ko'rsatadi                               |
| -------------------- | ----------------------------------------------- |
| `sales`              | Kunlar bo'yicha sotuv                           |
| `orders`             | Holatlar bo'yicha buyurtmalar (hammasi)         |
| `dealer-performance` | Diler bo'yicha; yetkazilgan ulushi              |
| `product-sales`      | Variant bo'yicha miqdor va tushum               |
| `regional-sales`     | Yetkazish hududi bo'yicha                       |
| `stock`              | HOZIRGI qoldiq, band, mavjud (sana filtri yo'q) |
| `stock-movements`    | Harakat jurnali (oqimli eksport shu yerda)      |
| `deliveries`         | Holatlar bo'yicha; o'rtacha vaqt                |
| `driver-performance` | Haydovchi bo'yicha; muvaffaqiyat foizi          |
| `lead-conversion`    | Ariza holatlari; diler bo'lganlar ulushi        |

**Foiz** bir kasr raqamgacha (`percent()`): hisobot ham, sinov ham
bir xil qoida bilan.

**Haydovchi muvaffaqiyati** faqat YAKUNLANGAN ishlardan
(`topshirilgan / (topshirilgan + bajarilmagan)`). Yo'ldagi yetkazma
muvaffaqiyatsizlik emas: uni maxrajga qo'shish faol haydovchini
jazolardi.

**O'rtacha yetkazish vaqti** faqat TOPSHIRILGANLAR uchun; boshqa
holatda `null`, nol emas — nol "bir zumda yetkazildi" degan
ma'noga o'xshardi.

**`product-sales` jamisida `orders` YO'Q:** bitta buyurtma bir necha
mahsulotda uchraydi va yig'indi uni ikki marta sanardi.
