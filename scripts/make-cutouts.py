#!/usr/bin/env python3
"""
Mahsulot suratlaridan shishani FONSIZ kesib oladi (3D effektlar uchun).

    python3 -m venv /tmp/rb && /tmp/rb/bin/pip install rembg onnxruntime pillow
    /tmp/rb/bin/python scripts/make-cutouts.py

Kiritish:  assets/product-photos/<slug>/front.jpg  (BARFF'ning haqiqiy suratlari)
Chiqarish: apps/web/public/cutouts/<slug>.webp     (shaffof fon, kesilgan)
           apps/web/src/lib/cutouts.json           (o'lcham + yorug'lik rangi)

Bu BUILD'ning qismi EMAS: natija repoga commit qilinadi, `rembg` esa faqat
shu skript uchun (og'ir model ~180 MB, build'ga tushmasligi kerak).

Rasm O'ZGARTIRILMAYDI — faqat fon olinadi. Shishaning shakli, etiketi va
ranglari asl fotosuratdagidek qoladi (CLAUDE.md §1: mahsulotni o'ylab topmaymiz).

`glow` — mahsulot rangidan olingan BEZAK rangi (orqa yorug'lik). U hech
qachon matn rangi sifatida ishlatilmaydi (CLAUDE.md §16).
"""
import colorsys
import json
import sys
from pathlib import Path

from PIL import Image
from rembg import new_session, remove

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "product-photos"
OUT = ROOT / "apps" / "web" / "public" / "cutouts"
MANIFEST = ROOT / "apps" / "web" / "src" / "lib" / "cutouts.json"

HEIGHT = 1100  # px; retina uchun yetarli, fayl esa kichik


def glow_color(image: Image.Image) -> str:
    """Shisha tanasining o'rta qismidagi to'yingan piksellarning o'rtacha rangi."""
    w, h = image.size
    body = image.crop((int(w * 0.25), int(h * 0.38), int(w * 0.75), int(h * 0.62))).convert("RGBA")
    reds = greens = blues = count = 0
    for r, g, b, a in body.getdata():
        if a < 230:
            continue
        _, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        if s > 0.35 and v > 0.3:
            reds += r
            greens += g
            blues += b
            count += 1
    if count == 0:
        return "#888888"
    return "#{:02x}{:02x}{:02x}".format(reds // count, greens // count, blues // count)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    session = new_session("isnet-general-use")
    manifest = {}

    for folder in sorted(p for p in SRC.iterdir() if p.is_dir()):
        front = folder / "front.jpg"
        if not front.exists():
            continue

        cut = remove(Image.open(front), session=session)
        # Shaffof bo'lmagan qismning chegarasiga kesamiz (bo'sh chetlarsiz).
        box = cut.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
        cut = cut.crop(box)
        ratio = HEIGHT / cut.height
        cut = cut.resize((round(cut.width * ratio), HEIGHT), Image.LANCZOS)

        target = OUT / f"{folder.name}.webp"
        cut.save(target, "WEBP", quality=88, method=6)

        manifest[folder.name] = {
            "src": f"/cutouts/{folder.name}.webp",
            "width": cut.width,
            "height": cut.height,
            "glow": glow_color(cut),
        }
        print(f"{folder.name}: {cut.width}x{cut.height}, {target.stat().st_size // 1024} KB, glow {manifest[folder.name]['glow']}")

    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
    print(f"\n{len(manifest)} ta kesilgan shisha -> {OUT}")


if __name__ == "__main__":
    sys.exit(main())
