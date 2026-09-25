# OMBOR SIYOSATI — QABUL QILINGAN QARORLAR

> `ROADMAP.md` S31 shu hujjatni talab qiladi: "partial-fulfilment
> policy decision recorded in `docs/`".
>
> Bu yerdagi qarorlar KOD BILAN BIR XIL bo'lishi shart. Kod
> o'zgarsa, shu hujjat ham o'zgaradi — aks holda hujjat yolg'onga
> aylanadi.
>
> Sana: 2026-09-25. Qadam: S31.

---

## 1. QISMAN BAJARISH — YO'Q

**Qaror: buyurtma TO'LIQ zaxiraga olinadi yoki UMUMAN olinmaydi.**

Bitta pozitsiyaga qoldiq yetmasa, butun zaxiralash rad etiladi va
buyurtma `CONFIRMED` holatida qoladi.

### Nega

Yarim zaxiralangan buyurtma keyingi har bir qadamda savol
tug'diradi va ularning birortasiga javob yo'q:

- **Yig'ish varaqasi** nimani ko'rsatadi? Omborchi to'liq
  bo'lmagan ro'yxatni yig'ib, "qolgani qani?" degan savol bilan
  qoladi.
- **Hisob-faktura** qaysi summaga yoziladi? Diler tasdiqlangan
  summani ko'rgan, lekin tovarning bir qismi kelmaydi.
- **Yetkazib berish** bir marta bo'ladimi, ikki marta? Ikkinchisi
  qachon va kim hisobidan?

Eng muhimi: **diler bundan xabardor emas.** U to'liq buyurtma
tasdiqlanganini ko'rgan. Qisman yetkazish — bu SHARTNOMA
o'zgarishi va u xodim qaroridan o'tishi kerak, avtomatik
bo'lmasligi.

### Qoldiq yetmasa nima bo'ladi

Zaxiralash `409` bilan rad etiladi va javobda QAYSI pozitsiyaga
qancha yetmagani ko'rsatiladi. Xodim uchta yo'ldan birini
tanlaydi:

1. Ombordagi qoldiqni to'ldirish (kelim) va qayta urinish.
2. Boshqa ombordan ko'chirish (`POST /warehouse/transfers`).
3. Diler bilan gaplashib, buyurtmani o'zgartirish yoki bekor
   qilish.

Uchalasi ham ODAM qarori. Tizim ularning birortasini o'zi
tanlamaydi.

### Qachon qayta ko'rib chiqiladi

BARFF "yarmini bo'lsa ham jo'nating" deb aytsa. O'shanda qisman
bajarish DILER ROZILIGI bilan bo'ladi — ya'ni buyurtmaga
"qisman bajarishga roziman" degan maydon qo'shiladi va u
`CONFIRMED` dan oldin to'ldiriladi. Bu `docs/OPEN-QUESTIONS.md`
ga savol sifatida yozilgan.

---

## 2. BITTA OMBOR — BO'LIB YUBORISH YO'Q

**Qaror: bitta buyurtma BITTA ombordan zaxiraga olinadi.**

Tovar ikki omborda bo'lsa ham, buyurtma ikkiga BO'LINMAYDI.

### Nega

Ikki ombordan yig'ilgan buyurtma ikkita JO'NATMA degani, ya'ni
ikkita yetkazib berish, ikkita haydovchi va ikkita yetkazish
holati. Yetkazib berish domeni (S32) esa buyurtmaga BITTA
yetkazmani bog'laydi. Ikkalasini birga qurish — ikkalasini ham
yarim qurish.

### Qaysi ombor tanlanadi

Buyurtmaning HAMMA pozitsiyasini qoplay oladigan omborlar
ichidan:

1. avval **standart** ombor (`isDefault`),
2. keyin **eng ko'p mavjud qoldig'i** bori.

Hududga qarab tanlash ATAYLAB yo'q: omborlarning haqiqiy
manzillari hali berilmagan (`docs/OPEN-QUESTIONS.md`, Q11) va
hududni taxmin qilish — o'ylab topilgan ma'lumot bo'lardi
(`CLAUDE.md`: "Never invent BARFF facts").

---

## 3. TOVAR QACHON OMBORDAN CHIQADI

**Qaror: `PACKED` holatida.**

| Holat                | Qoldiq (`quantity`) | Band (`reservedQuantity`) |
| -------------------- | ------------------- | ------------------------- |
| `CONFIRMED`          | o'zgarmaydi         | o'zgarmaydi               |
| `RESERVED`           | o'zgarmaydi         | **+miqdor**               |
| `PICKING`            | o'zgarmaydi         | o'zgarmaydi               |
| `PACKED`             | **−miqdor**         | **−miqdor**               |
| `READY_FOR_DELIVERY` | o'zgarmaydi         | o'zgarmaydi               |

### Nega qadoqlashda

Qadoqlangan tovar endi **qoldiq emas, jo'natma**. Uni boshqa
buyurtmaga berib bo'lmaydi va inventarizatsiyada javonda ham
topilmaydi. Yetkazishgacha kutish esa omborchiga javonda
bo'lmagan tovarni ko'rsatib turardi.

### TARTIB MUHIM

`PACKED` da IKKITA harakat yoziladi va ularning TARTIBI qat'iy:

1. avval `RELEASED` (band bo'shaydi),
2. keyin `OUT` (qoldiq kamayadi).

Teskari tartibda `reservedQuantity > quantity` bo'lib qoladi va
bazadagi tekshiruv butun tranzaksiyani rad etadi. Bu shunchaki
nazariya emas — qoida bazada yozilgan (S30) va u ishlaydi.

---

## 4. BEKOR QILISH

| Zaxira holati | Yoziladigan harakat | Sabab                         |
| ------------- | ------------------- | ----------------------------- |
| `ACTIVE`      | `RELEASED`          | Tovar javonda edi — bo'shadi. |
| `FULFILLED`   | `RETURN`            | Tovar chiqib ketgan — qaytdi. |

Ikkinchisi muhim: qadoqlangan buyurtma bekor qilinsa, tovar
o'z-o'zidan omborga qaytmaydi — uni QAYTIM sifatida yozish
kerak, aks holda qoldiq haqiqatdan kam ko'rinib qolardi.

---

## 5. MUDDAT — HOZIRCHA QO'LDA

Zaxirada `expiresAt` maydoni bor, lekin uni O'Z-O'ZIDAN
bo'shatadigan rejalashtirgich HALI YO'Q.

Muddati o'tgan zaxiralar `POST
/warehouse/reservations/release-expired` bilan bo'shatiladi va
uni hozircha xodim yoki tashqi `cron` chaqiradi.

Buni yashirmaslik kerak: "muddat bor" deb yozib, uni
ishlatmaydigan tizim — qoldiqni sekin-asta yeb qo'yadigan tizim.
Rejalashtirgich S41 da qo'shiladi.

---

## 6. KAM QOLDIQ BILDIRISHNOMASI

Har bir harakatdan keyin MAVJUD qoldiq (`quantity −
reservedQuantity`) kuzatuv chegarasiga tushsa, `stock.low`
bildirishnomasi yuboriladi.

Chegara har bir ombor+variant uchun ALOHIDA belgilanadi va
standart qiymati YO'Q: belgilanmagan qator kuzatilmaydi. Umumiy
chegara ("hamma uchun 10 dona") o'ylab topilgan raqam bo'lardi —
1 litrli suv va 5 litrli balon uchun u bir xil bo'la olmaydi.
