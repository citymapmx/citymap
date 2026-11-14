#!/usr/bin/env python3
"""Genera el icono 1024x1024 de CityMap para iOS / App Store.

Lee public/apple-touch-icon.png (512, pin negro sobre fondo transparente),
recorta al pin, lo escala al 66% del lienzo y lo centra sobre fondo blanco
(igual que el icono adaptativo de Android), sin transparencia (la App Store
la rechaza). Escribe:
  - assets/icon-1024.png (fuente para @capacitor/assets y App Store Connect)
  - ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png

Uso (en la Mac, una sola vez):
  pip3 install pillow
  python3 scripts/generar-icono-ios.py

Verifica al final que la salida sea 1024x1024 RGB sin canal alfa.
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'public' / 'apple-touch-icon.png'
OUT_MAIN = ROOT / 'assets' / 'icon-1024.png'
OUT_APPICON = (
    ROOT / 'ios' / 'App' / 'App' / 'Assets.xcassets'
    / 'AppIcon.appiconset' / 'AppIcon-512@2x.png'
)

TARGET = 1024
FRACTION = 0.66  # el pin ocupa el 66% del lienzo, como en Android


def main() -> None:
    src = Image.open(SRC).convert('RGBA')
    bbox = src.split()[3].getbbox()
    if not bbox:
        raise SystemExit(f'{SRC}: sin canal alfa, no se encontró el pin')
    pin = src.crop(bbox)
    size = int(TARGET * FRACTION)
    pin = pin.resize((size, int(pin.height * size / pin.width)), Image.LANCZOS)
    canvas = Image.new('RGB', (TARGET, TARGET), (255, 255, 255))
    canvas.paste(pin, ((TARGET - pin.width) // 2, (TARGET - pin.height) // 2), pin)
    for out in (OUT_MAIN, OUT_APPICON):
        out.parent.mkdir(parents=True, exist_ok=True)
        canvas.save(out, 'PNG')
    # Verificación: 1024x1024 RGB sin transparencia.
    check = Image.open(OUT_MAIN)
    assert check.size == (TARGET, TARGET), check.size
    assert check.mode == 'RGB', check.mode
    print(f'OK: {OUT_MAIN} y {OUT_APPICON} ({check.size[0]}x{check.size[1]} {check.mode})')


if __name__ == '__main__':
    main()
