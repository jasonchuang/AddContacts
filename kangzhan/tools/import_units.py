#!/usr/bin/env python3
"""匯入戰場兵種圖（每個兵種 3 個姿勢＋換色遮罩），產生 sangoku/sprites/ 與 sprites.json。

用法：python3 sangoku/tools/import_units.py <素材資料夾或 zip>
素材格式：spear_idle.png、spear_attack.png、spear_fall.png（cav、xbow 同理），白底、側面、面向右；
          faction-masks/<同名>.png：Alpha 標出要換成勢力色的區域。

處理：
  1. 去背：從圖片四邊連通的白色區域變透明，邊緣做柔化。
  2. 遮罩區（含外圍 2px 的紅色殘邊）先改成中性灰，遊戲執行時再依勢力色上色，避免殘留紅邊。
  3. 同一兵種 3 個姿勢用同一個裁切框（三張的聯集），腳底位置一致；縮成高 TARGET_H px。
之後執行 node sangoku/build.js 套用。
"""
import json
import os
import sys
import tempfile

import numpy as np
from PIL import Image, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from import_bundle import unpack  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'sprites')
UNITS = ['spear', 'cav', 'xbow', 'general']  # general（主將）為選用
POSES = ['idle', 'attack', 'fall']
MIN_HOLE = 120             # 封閉白色區塊大於此面積（1024 原圖的像素數）就去掉
TARGET_H = 180               # 輸出高度（遊戲內顯示約 48～64px，留給高解析度螢幕）
HEIGHT = {'spear': 50, 'xbow': 50, 'cav': 64, 'general': 86}  # 遊戲中顯示高度（px）


def find(folder, name):
    for dp, _, fs in os.walk(folder):
        if name in fs and ('faction-masks' in dp) == name.startswith('MASK:'):
            return os.path.join(dp, name)
    return None


def find_file(folder, name, mask):
    for dp, _, fs in os.walk(folder):
        if name in fs and (os.path.basename(dp) == 'faction-masks') == mask:
            return os.path.join(dp, name)
    return None


def remove_white(rgb):
    """四邊連通的近白色 → 透明；回傳 alpha（0～255）。"""
    a = np.asarray(rgb).astype(np.int16)
    white = (a.min(axis=2) > 232)
    h, w = white.shape
    bg = np.zeros_like(white)
    stack = [(y, x) for x in range(w) for y in (0, h - 1) if white[y, x]] + [(y, x) for y in range(h) for x in (0, w - 1) if white[y, x]]
    for p in stack:
        bg[p] = True
    while stack:
        y, x = stack.pop()
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < h and 0 <= nx < w and white[ny, nx] and not bg[ny, nx]:
                bg[ny, nx] = True
                stack.append((ny, nx))
    # 被人物或馬匹圍住的白底（兩腿之間、馬腹下）：面積夠大的封閉白色區塊也當成背景；小塊的白（眼白、刀刃反光）保留
    seen = bg.copy()
    for y0 in range(h):
        for x0 in range(w):
            if white[y0, x0] and not seen[y0, x0]:
                comp, st = [], [(y0, x0)]
                seen[y0, x0] = True
                while st:
                    y, x = st.pop()
                    comp.append((y, x))
                    for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                        if 0 <= ny < h and 0 <= nx < w and white[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = True
                            st.append((ny, nx))
                if len(comp) >= MIN_HOLE:
                    ys, xs = zip(*comp)
                    bg[list(ys), list(xs)] = True
    alpha = np.where(bg, 0, 255).astype(np.uint8)
    # 邊緣柔化：緊鄰背景、又偏白的像素依白的程度降低不透明度
    edge = np.asarray(Image.fromarray(bg.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(3))) > 0
    near = edge & ~bg
    lum = a.min(axis=2)
    soft = np.clip((255 - lum) / (255 - 180), 0, 1)
    alpha[near] = (soft[near] * 255).astype(np.uint8)
    return alpha


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    folder = unpack(sys.argv[1], tempfile.mkdtemp())
    os.makedirs(OUT, exist_ok=True)
    cfg = {}
    for u in UNITS:
        imgs, masks = {}, {}
        for p in POSES:
            f = find_file(folder, f'{u}_{p}.png', False)
            m = find_file(folder, f'{u}_{p}.png', True)
            if not f:
                if u == 'general':
                    break
                sys.exit(f'缺少 {u}_{p}.png')
            rgb = np.asarray(Image.open(f).convert('RGB')).copy()
            if m:
                mask = np.asarray(Image.open(m).convert('RGBA'))[..., 3] > 127
            else:  # 沒有遮罩：直接抓純紅色區
                c = rgb.astype(int)
                mask = (c[..., 0] > 200) & (c[..., 1] < 70) & (c[..., 2] < 70)
            # 遮罩外擴 2px，連同殘留的紅色邊一起改成灰色
            grown = np.asarray(Image.fromarray(mask.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(5))) > 0
            r, g, b = rgb[..., 0].astype(int), rgb[..., 1].astype(int), rgb[..., 2].astype(int)
            reddish = grown & (r > g + 40) & (r > b + 40)
            gray = ((r + g + b) // 3).clip(60, 200).astype(np.uint8)
            for c in range(3):
                rgb[..., c] = np.where(mask | reddish, gray if c else gray, rgb[..., c])
            alpha = remove_white(rgb)
            # 遮罩內一定不透明（灰色不會被當成白底）
            alpha[mask] = 255
            imgs[p] = Image.fromarray(np.dstack([rgb, alpha]), 'RGBA')
            masks[p] = Image.fromarray(np.where(mask | reddish, 255, 0).astype(np.uint8), 'L')
        if len(imgs) < len(POSES):
            # 既有的主將圖保留（這次素材沒附就沿用）
            old = os.path.join(OUT, 'sprites.json')
            if u == 'general' and os.path.exists(old):
                prev = json.load(open(old, encoding='utf-8')).get('general')
                if prev:
                    cfg[u] = prev
            continue
        # 三個姿勢共用的裁切框
        box = None
        for p in POSES:
            bb = imgs[p].getchannel('A').point(lambda v: 255 if v > 16 else 0).getbbox()
            box = bb if box is None else (min(box[0], bb[0]), min(box[1], bb[1]), max(box[2], bb[2]), max(box[3], bb[3]))
        pad = 6
        box = (max(0, box[0] - pad), max(0, box[1] - pad), min(1024, box[2] + pad), min(1024, box[3] + pad))
        w, h = box[2] - box[0], box[3] - box[1]
        size = (round(w * TARGET_H / h), TARGET_H)
        cfg[u] = {'height': HEIGHT[u], 'facing': 'right', 'poses': {}, 'masks': {}}
        for p in POSES:
            im = imgs[p].crop(box).resize(size, Image.LANCZOS)
            mk = Image.new('RGBA', size, (255, 255, 255, 0))
            mk.putalpha(masks[p].crop(box).resize(size, Image.LANCZOS))
            im.save(os.path.join(OUT, f'{u}_{p}.png'), optimize=True)
            mk.save(os.path.join(OUT, f'{u}_{p}_mask.png'), optimize=True)
            cfg[u]['poses'][p] = f'{u}_{p}.png'
            cfg[u]['masks'][p] = f'{u}_{p}_mask.png'
        print(f'{u}：裁切 {w}×{h} → {size[0]}×{size[1]}')
    cfg['_comment'] = '由 tools/import_units.py 產生：每個兵種 3 個姿勢（行軍、攻擊、倒下）與換色遮罩。'
    json.dump(cfg, open(os.path.join(OUT, 'sprites.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print('已寫入 sangoku/sprites/，接著執行 node sangoku/build.js')


if __name__ == '__main__':
    main()
