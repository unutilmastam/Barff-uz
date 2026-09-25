# YETKAZIB BERISH SIYOSATI — QABUL QILINGAN QARORLAR

> `ROADMAP.md` S32: "Order ↔ delivery status synchronization rules
> documented and enforced server-side."
>
> Bu yerdagi qarorlar KOD BILAN BIR XIL bo'lishi shart va ular
> testlar bilan qulflangan.
>
> Sana: 2026-09-25. Qadam: S32.

---

## 1. YETKAZMA BUYURTMANI YETAKLAYDI, AKSINCHA EMAS

**Qaror: holat YETKAZMADA o'zgaradi, buyurtma unga ERGASHADI.**

Haydovchi yetkazmani yangilaydi; buyurtma holati server tomonda
o'z-o'zidan moslashadi.

### Nega bir tomonlama

Ikki tomonlama moslashtirish HALQA hosil qiladi: buyurtma
`IN_TRANSIT` ga o'tadi -> yetkazmani yangilaydi -> u buyurtmani
yangilaydi -> ... Halqani to'xtatish uchun "bu o'zgarish qayerdan
keldi" degan bayroq kerak bo'lardi, va u har bir yangi kodda
unutilardi.

Bir tomonlama qoida esa bitta joyda yoziladi va buzib bo'lmaydi.

---

## 2. MOSLIK JADVALI

| Yetkazma holati | Buyurtma holati      | Izoh                                  |
| --------------- | -------------------- | ------------------------------------- |
| `CREATED`       | `READY_FOR_DELIVERY` | Yetkazma qadoqlashdan keyin tug'iladi |
| `ASSIGNED`      | `DRIVER_ASSIGNED`    | Haydovchi biriktirildi                |
| `PICKED_UP`     | `IN_TRANSIT`         | Buyurtmada `PICKED_UP` YO'Q           |
| `IN_TRANSIT`    | `IN_TRANSIT`         | O'zgarish yo'q — o'tkazib yuboriladi  |
| `ARRIVED`       | `IN_TRANSIT`         | Buyurtmada `ARRIVED` YO'Q             |
| `DELIVERED`     | `DELIVERED`          | Yakuniy                               |
| `FAILED`        | **o'zgarmaydi**      | §3 ga qarang                          |
| `CANCELLED`     | **o'zgarmaydi**      | §3 ga qarang                          |

### Buyurtmada nega kamroq holat bor

Buyurtma holati DILER uchun. Dilerga "haydovchi tovarni oldi" va
"haydovchi yetib keldi" farqi kerak emas — unga "yo'lda" yetarli.
Omborchi va logist esa aniq holatni YETKAZMADA ko'radi.

Shuning uchun uchta yetkazma holati (`PICKED_UP`, `IN_TRANSIT`,
`ARRIVED`) buyurtmaning BITTA holatiga (`IN_TRANSIT`) tushadi. Bu
ma'lumot yo'qotish emas: to'liq tarix `delivery_events` da qoladi.

### O'ZINI-O'ZIGA o'tish o'tkazib yuboriladi

Buyurtma allaqachon `IN_TRANSIT` bo'lsa, `IN_TRANSIT` ga qayta
o'tkazish MUMKIN EMAS — buyurtma holat mashinasi o'zini-o'ziga
o'tishni rad etadi (S26). Shuning uchun moslashtirish maqsad holat
JORIY holatga teng bo'lsa, hech narsa qilmaydi.

Buni bilmasdan yozilgan kod `IN_TRANSIT -> ARRIVED` o'tishida
`409` berardi va haydovchi "yetib keldim" tugmasini bosa
olmasdi.

---

## 3. XATOLIK VA BEKOR QILISH BUYURTMAGA TEGMAYDI

**Qaror: `FAILED` va `CANCELLED` buyurtma holatini
O'ZGARTIRMAYDI.**

### Nega

Yetkazib berilmagan buyurtma nima bo'ladi? Uch xil javob bor va
uchalasi ham ODAM qaroriga bog'liq:

1. **Qayta urinish** — boshqa haydovchi, ertaga.
2. **Bekor qilish** — mijoz rad etdi, tovar omborga qaytadi.
3. **Manzilni o'zgartirish** — mijoz boshqa joyda.

Tizim ularning birortasini o'zi tanlay olmaydi. Avtomatik "bekor
qilish" eng yomoni: tovar ombordan chiqib ketgan (S31), uni
qaytarish esa alohida harakat.

Shuning uchun yetkazma `FAILED` bo'lganda buyurtma `IN_TRANSIT`
da qoladi va logist ekranida "muammoli" bo'lib turadi.

### `FAILED` uchun SABAB SHART

Sababsiz "yetkazilmadi" — logist uchun foydasiz yozuv. U baribir
haydovchiga qo'ng'iroq qilishi kerak bo'lardi.

---

## 4. HAYDOVCHI FAQAT O'Z YETKAZMASIGA TEGADI

**Qaror: `DRIVER` roli FAQAT o'ziga biriktirilgan yetkazmani
ko'radi va o'zgartiradi.**

Tekshiruv SERVERDA: haydovchi boshqa yetkazmaning id sini yozsa,
`404` oladi — `403` emas.

### Nega `404`

`403` "bunday yetkazma BOR, lekin sizga emas" degani. Shu bilan
haydovchi id larni sinab ko'rib, qaysi yetkazmalar borligini
aniqlay olardi. `404` esa hech narsa oshkor qilmaydi.

Bu diler buyurtmalari bilan bir xil yondashuv (S26).

---

## 5. HAYDOVCHI QAYSI O'TISHLARNI QILA OLADI

| O'tish                    | Haydovchi | Logist |
| ------------------------- | --------- | ------ |
| `CREATED -> ASSIGNED`     | yo'q      | ha     |
| `ASSIGNED -> PICKED_UP`   | ha        | ha     |
| `PICKED_UP -> IN_TRANSIT` | ha        | ha     |
| `IN_TRANSIT -> ARRIVED`   | ha        | ha     |
| `ARRIVED -> DELIVERED`    | ha        | ha     |
| `* -> FAILED`             | ha        | ha     |
| `* -> CANCELLED`          | yo'q      | ha     |

Biriktirish va bekor qilish — LOGIST qarori. Haydovchi o'ziga ish
biriktira olmaydi va ishni bekor qila olmaydi; u faqat bajarilish
yo'lini yuritadi va muammo haqida xabar beradi.

---

## 6. JONLI GPS YO'Q

`CLAUDE.md` §6: "Do not add live GPS tracking unless explicitly
required."

Koordinata maydonlari SXEMAGA ham qo'shilmagan. Sabab oddiy:
maydon bo'lsa, uni to'ldirish talabi o'z-o'zidan paydo bo'ladi va
keyin uni olib tashlash "funksiyani yo'qotish" bo'lib ko'rinadi.

Yetkazma holati — haydovchi O'ZI bosgan tugma. Bu kamroq
ma'lumot, lekin u ANIQ va haydovchining telefon batareyasini
yemaydi.

---

## 7. YETKAZMA QACHON TUG'ILADI

Buyurtma `PACKED -> READY_FOR_DELIVERY` ga o'tganda, AVTOMATIK.

Qo'lda yaratish endpointi yo'q: yetkazmasiz `READY_FOR_DELIVERY`
buyurtma — hech kim ko'rmaydigan buyurtma. Manzil o'sha paytda
buyurtmadan NUSXA olinadi.
