#!/usr/bin/env python3
"""匯入事件背景插圖（ChatGPT 依 art/scene_prompts.json 生成的圖）。

用法：
  python3 sangoku/tools/import_scenes.py 背景.zip ...           # 只驗收：列出結果並產生對照圖 art/review/scenes.jpg
  python3 sangoku/tools/import_scenes.py 背景.zip --apply       # 正式匯入到 sangoku/scenes/<事件id>.jpg

檔名要用 scene_prompts.json 的 file 欄位（例如 oath.png）；也接受 .jpg、.webp。
圖片會從中央裁成 16:10、縮成 1280×800 的 JPG。之後執行 node sangoku/build.js 套用。
"""
import argparse
import json
import os
import shutil
import sys
import tempfile

from PIL import Image, ImageDraw, ImageOps

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from import_bundle import unpack, font  # noqa: E402  共用解壓與字型

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'scenes')
REVIEW = os.path.join(ROOT, 'art', 'review', 'scenes.jpg')
PROMPTS = os.path.join(ROOT, 'art', 'scene_prompts.json')
SIZE = (1280, 800)


def fit(path):
    im = ImageOps.exif_transpose(Image.open(path)).convert('RGB')
    return ImageOps.fit(im, SIZE, Image.LANCZOS, centering=(0.5, 0.5))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('sources', nargs='+')
    ap.add_argument('--apply', action='store_true')
    a = ap.parse_args()
    events = {e['id']: e for e in json.load(open(PROMPTS, encoding='utf-8'))['events']}
    tmp = tempfile.mkdtemp()
    found, unknown = {}, []
    for src in a.sources:
        folder = unpack(src, tmp)
        for dp, _, fs in os.walk(folder):
            for f in sorted(fs):
                stem, ext = os.path.splitext(f)
                if ext.lower() not in ('.png', '.jpg', '.jpeg', '.webp'):
                    continue
                (found.__setitem__(stem, os.path.join(dp, f)) if stem in events else unknown.append(f))
    if not found:
        sys.exit('沒有找到檔名符合事件 id 的圖（例如 oath.png）。')
    small = []
    for i, (eid, path) in enumerate(sorted(found.items())):
        im = fit(path)
        small.append((eid, im.resize((320, 200))))
        if a.apply:
            os.makedirs(OUT, exist_ok=True)
            im.save(os.path.join(OUT, f'{eid}.jpg'), quality=82, optimize=True, progressive=True)
    # 對照圖
    cols = 4
    rows = (len(small) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * 330, rows * 236), 'white')
    d = ImageDraw.Draw(sheet)
    f = font(18)
    for i, (eid, im) in enumerate(small):
        x, y = (i % cols) * 330 + 5, (i // cols) * 236 + 5
        sheet.paste(im, (x, y))
        d.text((x, y + 204), f"{events[eid]['title']}（{eid}）", fill=(40, 30, 20), font=f)
    os.makedirs(os.path.dirname(REVIEW), exist_ok=True)
    sheet.save(REVIEW, quality=85)
    print(f"找到 {len(found)} 張：" + '、'.join(events[e]['title'] for e in sorted(found)))
    if unknown:
        print('檔名對不上事件 id，略過：' + '、'.join(unknown))
    missing = [e['title'] for k, e in events.items() if k not in found and not os.path.exists(os.path.join(OUT, f'{k}.jpg'))]
    if missing:
        print(f'還沒有背景圖的事件（{len(missing)}）：' + '、'.join(missing))
    print(f'對照圖：{os.path.relpath(REVIEW, os.getcwd())}')
    print('已匯入 sangoku/scenes/，接著執行 node sangoku/build.js。' if a.apply else '確認後加上 --apply 匯入。')
    shutil.rmtree(tmp, ignore_errors=True)


if __name__ == '__main__':
    main()
