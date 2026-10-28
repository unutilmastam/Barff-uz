# Mahsulot fotosuratlari

BARFF yuborgan haqiqiy fotosuratlar (2026-10-28). Har bir mahsulot —
alohida papka: `<slug>/front.jpg` (asosiy), `back.jpg`, `lying.jpg`
(yoki `angle.jpg`). Fayllar 1600 px kenglikka siqilgan, EXIF olib
tashlangan; sayt ulardan AVIF/WebP variantlarini o'zi tayyorlaydi.

`catalog.json` — nomlar (uz/ru/en), ta'm, hajm va suratlar ro'yxati.
Yuklash: `pnpm --filter @barff/api build && pnpm --filter @barff/api catalog:import`.

| Papka                                  | Ta'm            | Hajm         |
| -------------------------------------- | --------------- | ------------ |
| `anor-sharbati-350`                    | Anor            | 350 ml       |
| `olma-sharbati-350`                    | Olma            | 350 ml       |
| `olcha-sharbati-350` / `-1l`           | Olcha           | 350 ml / 1 L |
| `mango-sharbati-350` / `-1l`           | Mango           | 350 ml / 1 L |
| `shaftoli-sharbati-350`                | Shaftoli        | 350 ml       |
| `apelsin-sharbati-350`                 | Apelsin         | 350 ml       |
| `qulupnay-ananas-sharbati-350` / `-1l` | Qulupnay-ananas | 350 ml / 1 L |
| `multifrukt-sharbati-350` / `-1l`      | Multifrukt      | 350 ml / 1 L |

Hajm etiketdagi yozuvdan olingan: «1 л» (1 L shisha) va «350 мл».

## Hali kiritilmagan (BARFF admin paneldan o'zi yozadi)

Narx, tarkib, ozuqaviy qiymat, saqlash sharti, yaroqlilik muddati,
tavsif. Skript bularni **yaratmaydi** (CLAUDE.md §1).

## Etiketdan o'qilgan shtrix-kodlar — TASDIQLANMAGAN

Surat tekshiruvida o'qildi; EAN-13 nazorat raqami hammasida mos keldi,
lekin qaysi mahsulotga tegishliligini BARFF tasdiqlamaguncha bazaga
KIRITILMAGAN.

| Mahsulot            | Shtrix-kod      |
| ------------------- | --------------- |
| Anor 350 ml         | `4780151950237` |
| Qulupnay-ananas 1 L | `4780151950824` |
| Olcha 1 L           | `4780151950831` |
| Multifrukt 1 L      | `4780151950794` |
| Mango 1 L           | `4780151950800` |

350 ml shishalarning qolgan shtrix-kodlari (`…950220`, `…950251`,
`…950350`, `…950367`, `…950411`, `…950435`) oldingi suratlardan o'qilgan
va qaysi ta'mga tegishli ekani ANIQ EMAS.

Etiketda `№ UZ.SMT-01-0103-193638` ro'yxat raqami bor — u qaysi
hujjatga tegishli ekani noma'lum, sertifikat sifatida ko'rsatilmaydi.
