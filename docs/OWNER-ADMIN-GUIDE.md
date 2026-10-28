# Admin panel — ma'lumot kiritish yo'riqnomasi (zavod egasi uchun)

Admin panel: `https://admin.barff.uz`. Hamma ma'lumot (mahsulot, narx, rasm, xodim)
shu yerda kiritiladi — dasturchi kerak emas.

## 1. Birinchi marta

1. Dasturchi bergan email va parol bilan kiring.
2. **Tizim → Xodimlar** da o'z parolingizni yangilang («Parol» tugmasi).
3. Kerakli xodimlarni qo'shing (§5).

## 2. Kategoriya

**Katalog → Kategoriyalar → Yangi qo'shish.** Nomini kiriting (masalan «Sharbatlar») —
manzil (slug) o'zi to'ladi. Kategoriyasiz mahsulot yaratib bo'lmaydi.
Ichida mahsuloti bor kategoriyani o'chirib bo'lmaydi.

## 3. Mahsulot

**Katalog → Mahsulotlar → Yangi mahsulot.**

1. Kategoriyani tanlang, nomini kiriting (kamida o'zbekcha; ruscha/inglizcha ixtiyoriy).
2. Tarkib, saqlash sharoiti, yaroqlilik muddati — **faqat haqiqiy ma'lumot**.
3. «Yaratish» bosing — sahifa ochiladi va pastda variant hamda rasm bo'limlari paydo bo'ladi.
4. **Saytda ko'rinsin** belgisini ma'lumot to'liq bo'lgandagina qo'ying.

### Variant va narx

Har bir hajm (0,35 L, 1 L …) alohida variant. Hajmni millilitrda yozing (350, 1000).
Narx **so'mda** (masalan `18000`). Narx o'zgarsa — yangisini yozing, eskisi tarixda qoladi
va kim qachon o'zgartirgani audit jurnalida ko'rinadi. Narxsiz variantni dilerlar
savatga qo'sha olmaydi.

### Rasm

Mahsulot sahifasida «Rasm yuklash». Eng yaxshisi — fonsiz (shaffof) PNG yoki toza fotosurat.
Birinchi rasm avtomatik **Asosiy** bo'ladi; boshqasini «Asosiy qilish» bilan almashtirish mumkin.
Rasm o'zgartirilmaydi (shisha shakli va yorlig'i asl holida qoladi).

## 4. Media kutubxona

Yangilik, galereya, bosh sahifa rasmlari uchun. Yuklashda **«Ommaviy»** belgisi turishi kerak —
maxfiy fayl saytda ochilmaydi.

## 5. Xodimlar

**Tizim → Xodimlar → Yangi xodim.** Rol:

| Rol            | Nima qila oladi                                            |
| -------------- | ---------------------------------------------------------- |
| Savdo menejeri | Arizalar, dilerlar, buyurtmalarni ko'rish, hisobotlar      |
| Omborchi       | Ombor, qoldiq, buyurtmalarni yig'ish                       |
| Logist         | Yetkazish, marshrut, haydovchi biriktirish                 |
| Haydovchi      | Faqat o'ziga biriktirilgan yetkazmalar (haydovchi ilovasi) |
| Administrator  | Hamma narsa, shu jumladan xodimlar va sozlamalar           |

Parolni tizim o'zi yaratadi — xodimga topshiring (keyin ko'rsatilmaydi). Ishdan ketgan xodimni
**o'chirmang, bloklang** («Tahrirlash → Faol» belgisini oling): u darhol tizimdan chiqariladi,
jurnaldagi tarixi saqlanadi. O'zingizni bloklab va oxirgi administratorni olib tashlab bo'lmaydi.

Dilerlar bu ro'yxatda yo'q — ular **Savdo → Dilerlar** bo'limida.
