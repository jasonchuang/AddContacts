#!/usr/bin/env python3
"""把外部武將插畫轉成遊戲用的肖像。

用法：python3 sangoku/tools/import_portraits.py
輸入：sangoku/art/raw/<武將名>.(png|jpg|jpeg|webp)，以及選填的 art/raw/crops.json（臉部位置）
輸出：sangoku/portraits/<武將名>.jpg       半身像 480×600（4:5）
      sangoku/portraits/<武將名>_head.jpg  頭像 256×256（以臉為中心）
之後執行 node sangoku/build.js 即會套用。
需要：pip install pillow
"""
import glob
import json
import os
import sys

from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, 'art', 'raw')
OUT = os.path.join(ROOT, 'portraits')
FULL = (480, 600)
HEAD = 256
DEFAULT = {'x': 0.5, 'y': 0.28, 'size': 0.4}


def crop_box(w, h, cx, cy, bw, bh):
    """以 (cx, cy) 為中心取 bw×bh 的框，超出邊界就往內推。"""
    bw, bh = min(bw, w), min(bh, h)
    left = min(max(0, cx - bw / 2), w - bw)
    top = min(max(0, cy - bh / 2), h - bh)
    return (round(left), round(top), round(left + bw), round(top + bh))


def process(path, crop):
    name = os.path.splitext(os.path.basename(path))[0]
    im = ImageOps.exif_transpose(Image.open(path)).convert('RGB')
    w, h = im.size
    fx, fy, fs = crop['x'] * w, crop['y'] * h, crop['size'] * w
    # 半身像：4:5，盡量用滿寬度；臉放在上方約 30% 處
    bw = min(w, h * 4 / 5)
    bh = bw * 5 / 4
    full = im.crop(crop_box(w, h, fx, fy - bh * 0.3 + bh / 2, bw, bh)).resize(FULL, Image.LANCZOS)
    # 頭像：以臉為中心的正方形，比臉框略大
    s = fs * 1.2
    head = im.crop(crop_box(w, h, fx, fy + fs * 0.08, s, s)).resize((HEAD, HEAD), Image.LANCZOS)
    full.save(os.path.join(OUT, f'{name}.jpg'), quality=86, optimize=True, progressive=True)
    head.save(os.path.join(OUT, f'{name}_head.jpg'), quality=88, optimize=True)
    return name


def main():
    crops_path = os.path.join(RAW, 'crops.json')
    crops = {}
    if os.path.exists(crops_path):
        with open(crops_path, encoding='utf-8') as f:
            crops = {k: v for k, v in json.load(f).items() if not k.startswith('_')}
    files = sorted(p for ext in ('png', 'jpg', 'jpeg', 'webp') for p in glob.glob(os.path.join(RAW, f'*.{ext}')))
    if not files:
        sys.exit(f'{RAW} 裡沒有圖片')
    os.makedirs(OUT, exist_ok=True)
    done = [process(p, {**DEFAULT, **crops.get(os.path.splitext(os.path.basename(p))[0], {})}) for p in files]
    print(f'已處理 {len(done)} 位：{"、".join(done)}')


if __name__ == '__main__':
    main()
