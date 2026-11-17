#!/usr/bin/env python3
"""把專案用到的字從開源字型中抽出，產生內嵌字型（解決系統缺少中文字型時的亂碼）。

執行：python3 godot/tools/build_fonts.py
需要：pip install fonttools brotli，以及 npm（用來下載字型套件）

輸出：
  godot/fonts/NotoSansTC-Subset.ttf     內文（Noto Sans TC，OFL-1.1）
  godot/fonts/FusionPixel12-Subset.ttf  像素風標題與選單（Fusion Pixel Font 12px，OFL-1.1）
"""
import glob
import os
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile

from fontTools.merge import Merger
from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'fonts')
CACHE = os.path.join(tempfile.gettempdir(), 'qunxiong-fonts')

SOURCES = [
    {
        'out': 'NotoSansTC-Subset.ttf',
        'package': 'noto-sans-tc@36.0.0',
        'glob': 'package/noto_sans_tc_regular/*.woff2',
        'license': 'package/LICENSE_OFL.txt',
        'license_out': 'OFL-NotoSansTC.txt',
    },
    {
        'out': 'FusionPixel12-Subset.ttf',
        'package': '@vp-tw/cjk-web-fonts-fusion-pixel-font@0.0.1',
        'glob': 'package/dist/12px/proportional/*/*.woff2',
        'license': 'package/LICENSE.font.txt',
        'license_out': 'OFL-FusionPixel.txt',
    },
]

# 永遠包含的字元：ASCII、全形標點、常用符號
EXTRA = ''.join(chr(c) for c in range(0x20, 0x7f)) + '，。、；：？！「」『』（）《》〈〉…—～・％＋－×÷●○★☆▶◀▲▼■□→←↑↓　０１２３４５６７８９'


def used_chars():
    chars = set(EXTRA)
    for pattern in ('scripts/**/*.gd', 'data/*.json', 'scenes/*.tscn', 'tests/*.gd', 'project.godot'):
        for path in glob.glob(os.path.join(ROOT, pattern), recursive=True):
            with open(path, encoding='utf-8') as f:
                chars.update(f.read())
    return {c for c in chars if ord(c) >= 0x20 and not (0xD800 <= ord(c) <= 0xDFFF)}


def fetch(package):
    os.makedirs(CACHE, exist_ok=True)
    key = re.sub(r'[^A-Za-z0-9.]+', '_', package)
    dest = os.path.join(CACHE, key)
    if os.path.isdir(dest):
        return dest
    tmp = tempfile.mkdtemp(dir=CACHE)
    subprocess.run(['npm', 'pack', package, '--silent'], cwd=tmp, check=True, stdout=subprocess.DEVNULL)
    tgz = glob.glob(os.path.join(tmp, '*.tgz'))[0]
    os.makedirs(dest)
    with tarfile.open(tgz) as t:
        t.extractall(dest, filter='data')
    shutil.rmtree(tmp)
    return dest


def build(src, chars):
    base = fetch(src['package'])
    files = sorted(glob.glob(os.path.join(base, src['glob'])))
    if not files:
        sys.exit(f'找不到字型檔：{src["glob"]}')
    need = {ord(c) for c in chars}
    picked, covered = [], set()
    for path in files:
        cmap = set(TTFont(path).getBestCmap().keys())
        hit = (cmap & need) - covered
        if hit:
            picked.append(path)
            covered |= hit
    missing = need - covered
    # 分塊字型先轉成 TTF 再合併
    tmpdir = tempfile.mkdtemp()
    ttfs = []
    for i, path in enumerate(picked):
        f = TTFont(path)
        f.flavor = None
        p = os.path.join(tmpdir, f'{i}.ttf')
        f.save(p)
        ttfs.append(p)
    merged = Merger().merge(ttfs) if len(ttfs) > 1 else TTFont(ttfs[0])
    opts = Options()
    opts.layout_features = ['*']
    opts.name_IDs = ['*']
    opts.notdef_outline = True
    sub = Subsetter(opts)
    sub.populate(unicodes=sorted(covered))
    sub.subset(merged)
    os.makedirs(OUT, exist_ok=True)
    out = os.path.join(OUT, src['out'])
    merged.save(out)
    shutil.copy(os.path.join(base, src['license']), os.path.join(OUT, src['license_out']))
    shutil.rmtree(tmpdir)
    # 驗證
    check = set(TTFont(out).getBestCmap().keys())
    lost = covered - check
    print(f'{src["out"]}: {len(check)} 字，{os.path.getsize(out) // 1024} KB，使用 {len(picked)}/{len(files)} 個分塊'
          + (f'，字型本身缺少 {len(missing)} 字：{"".join(sorted(chr(c) for c in missing))[:60]}' if missing else '')
          + (f'，合併後遺失 {len(lost)} 字' if lost else ''))
    return lost


def main():
    chars = used_chars()
    cjk = [c for c in chars if ord(c) > 0x2E80]
    print(f'專案用到 {len(chars)} 個字元（其中中日韓字 {len(cjk)} 個）')
    bad = False
    for src in SOURCES:
        if build(src, chars):
            bad = True
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
