#!/usr/bin/env python3
"""匯入戰鬥畫面與單挑畫面的插圖（提示詞見 art/battle_prompts.md）。

用法：python3 sangoku/tools/import_battle.py <素材資料夾或 zip>
  field_plain／field_river／field_mountain／field_snow → scenes/<名>.jpg（1800×600）
  duel_day／duel_dusk                                  → scenes/<名>.jpg（1280×800）
  wall／wall_damaged（白底）                            → 去背、裁掉空白 → scenes/<名>.png（高 600）
放在 scenes/ 是為了沿用事件背景的打包流程（網頁版用到才下載）。之後執行 node sangoku/build.js。
"""
import os
import sys
import tempfile

from PIL import Image, ImageOps
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from import_bundle import unpack  # noqa: E402
from import_units import remove_white  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'scenes')
FIELDS = {'field_plain', 'field_river', 'field_mountain', 'field_snow'}
DUELS = {'duel_day', 'duel_dusk'}
WALLS = {'wall', 'wall_damaged'}


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    folder = unpack(sys.argv[1], tempfile.mkdtemp())
    done = []
    for dp, _, fs in os.walk(folder):
        for f in fs:
            name, ext = os.path.splitext(f)
            if ext.lower() not in ('.png', '.jpg', '.jpeg', '.webp'):
                continue
            im = ImageOps.exif_transpose(Image.open(os.path.join(dp, f)))
            if name in FIELDS:
                ImageOps.fit(im.convert('RGB'), (1800, 600), Image.LANCZOS, centering=(0.5, 0.4)).save(os.path.join(OUT, name + '.jpg'), quality=80, optimize=True, progressive=True)
            elif name in DUELS:
                ImageOps.fit(im.convert('RGB'), (1280, 800), Image.LANCZOS).save(os.path.join(OUT, name + '.jpg'), quality=80, optimize=True, progressive=True)
            elif name in WALLS:
                rgb = np.asarray(im.convert('RGB')).copy()
                rgba = Image.fromarray(np.dstack([rgb, remove_white(rgb)]), 'RGBA')
                rgba = rgba.crop(rgba.getchannel('A').point(lambda v: 255 if v > 16 else 0).getbbox())
                h = 600
                rgba.resize((round(rgba.width * h / rgba.height), h), Image.LANCZOS).save(os.path.join(OUT, name + '.png'), optimize=True)
            else:
                continue
            done.append(name)
    missing = sorted((FIELDS | DUELS | WALLS) - set(done))
    print('已匯入：' + '、'.join(sorted(done)))
    if missing:
        print('缺少：' + '、'.join(missing))


if __name__ == '__main__':
    main()
