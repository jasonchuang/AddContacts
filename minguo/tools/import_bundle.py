#!/usr/bin/env python3
"""匯入外部生成的武將頭像素材包（zip 或資料夾），先自動驗收，產生對照圖給人確認，再正式匯入。

用法：
  python3 sangoku/tools/import_bundle.py 素材包1.zip 素材包2.zip ...          # 只驗收：列出結果並產生對照圖
  python3 sangoku/tools/import_bundle.py 素材包.zip --apply                   # 驗收通過的正式匯入
  python3 sangoku/tools/import_bundle.py 素材包.zip --apply --skip 逢紀,郭圖   # 人工確認後排除某些人
  python3 sangoku/tools/import_bundle.py 素材包.zip --apply --replace 呂布     # 已有立繪的武將要換新圖時明確指定

自動擋下（不會匯入）：
  - 名字不在任何劇本的武將名單裡
  - 素材包標示為 placeholder／需重畫（mapping 的 status、quality，或 README 寫明）
  - 圖片底部有燒進去的名字標籤（常見於從別張概念圖裁出來、名字對不上的圖）
  - 與已匯入的圖完全相同
  - 遊戲裡已經有立繪（除非用 --replace 指定）
只提醒、需要人看的：
  - 與其他武將的臉很像（可能撞臉，或圖跟名字配錯）
  - 素材包標示為 draft／需檢查

對照圖存在 sangoku/art/review/，匯入後會自動執行 import_portraits.py。
"""
import argparse
import hashlib
import itertools
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, 'art', 'raw')
REVIEW = os.path.join(ROOT, 'art', 'review')
CROPS = os.path.join(RAW, 'crops.json')
DEFAULT_CROP = {'x': 0.52, 'y': 0.36, 'size': 0.56}
FONT_PATHS = ['/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc', '/System/Library/Fonts/PingFang.ttc', 'C:/Windows/Fonts/msjh.ttc']
BAD_WORDS = re.compile(r'placeholder|regenerat|not faithful|重畫|佔位|佔位', re.I)
DRAFT_WORDS = re.compile(r'draft|review|pending|待|檢查', re.I)
LOOKALIKE = 30  # 臉部 dHash 距離小於此值就提醒（0～144，越小越像）


def roster():
    """所有劇本武將的名字（呼叫 node 讀 js/scenarios.js）。"""
    js = ("global.TK={};for(const f of ['tuning.js','data.js','scenarios.js'])require('./js/'+f);"
          "const s=new Set();for(const sc of TK.SCENARIOS)for(const g of sc.generals)s.add(g.name);"
          "console.log(JSON.stringify([...s]))")
    out = subprocess.run(['node', '-e', js], cwd=ROOT, capture_output=True, text=True, check=True).stdout
    return set(json.loads(out))


def unpack(src, tmp):
    if os.path.isdir(src):
        return src
    d = tempfile.mkdtemp(dir=tmp)
    with zipfile.ZipFile(src) as z:
        for m in z.namelist():
            # 只解出檔案本身，不照 zip 裡的路徑（避免 ../ 之類的路徑寫到外面）
            if m.endswith('/'):
                continue
            target = os.path.join(d, os.path.dirname(m).replace('..', '_'), os.path.basename(m))
            os.makedirs(os.path.dirname(target), exist_ok=True)
            with z.open(m) as f, open(target, 'wb') as o:
                shutil.copyfileobj(f, o)
    return d


def entries(folder, label):
    """讀素材包的 mapping.json（各種寫法都接受），回傳 [{name, path, flags, source}]。"""
    maps = [os.path.join(dp, f) for dp, _, fs in os.walk(folder) for f in fs if f.startswith('mapping') and f.endswith('.json')]
    readme = ' '.join(open(os.path.join(dp, f), encoding='utf-8', errors='ignore').read()
                      for dp, _, fs in os.walk(folder) for f in fs if f.lower().startswith('readme'))
    out = []
    for m in maps:
        data = json.load(open(m, encoding='utf-8'))
        top = data if isinstance(data, dict) else {}
        items = data if isinstance(data, list) else data.get('characters') or data.get('entries') or []
        bundle_text = ' '.join(str(top.get(k, '')) for k in ('status', 'quality', 'note')) + ' ' + readme
        for c in items:
            img = c.get('output_image') or c.get('image') or c.get('file')
            if not img or not c.get('name_zh'):
                continue
            path = os.path.join(os.path.dirname(m), img)
            note = ' '.join(str(c.get(k, '')) for k in ('status', 'quality', 'quality_review', 'notes'))
            flags = []
            if BAD_WORDS.search(note) or BAD_WORDS.search(bundle_text):
                flags.append('placeholder')
            elif DRAFT_WORDS.search(note) or DRAFT_WORDS.search(bundle_text):
                flags.append('draft')
            out.append({'name': c['name_zh'], 'path': path, 'flags': flags, 'source': label})
    return out


def face(im):
    w, h = im.size
    return im.crop((int(w * .25), int(h * .05), int(w * .8), int(h * .6)))


def dhash(path, n=12):
    im = face(Image.open(path).convert('L')).resize((n + 1, n))
    px = im.load()
    return [px[c, r] > px[c + 1, r] for r in range(n) for c in range(n)]


def has_label(path):
    """圖片底部中央是否有深色底、白字的名字標籤。"""
    im = Image.open(path).convert('RGB')
    w, h = im.size
    reg = im.crop((int(w * .2), int(h * .86), int(w * .8), h)).resize((120, 28))
    px = [reg.getpixel((x, y)) for y in range(28) for x in range(120)]
    dark = sum(1 for r, g, b in px if r + g + b < 120) / len(px)
    white = sum(1 for r, g, b in px if min(r, g, b) > 215) / len(px)
    return dark > 0.28 and white > 0.015


def md5(path):
    return hashlib.md5(open(path, 'rb').read()).hexdigest()


def font(size):
    for p in FONT_PATHS:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def contact_sheet(items, out):
    cell, cols = 220, 6
    rows = (len(items) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * cell, rows * (cell + 44)), 'white')
    d = ImageDraw.Draw(sheet)
    f = font(20)
    colors = {'ok': (40, 140, 60), 'warn': (210, 130, 0), 'reject': (190, 40, 40)}
    for i, it in enumerate(items):
        x, y = (i % cols) * cell, (i // cols) * (cell + 44)
        im = Image.open(it['path']).convert('RGB').resize((cell - 6, cell - 6))
        sheet.paste(im, (x + 3, y + 3))
        d.rectangle([x + 1, y + 1, x + cell - 2, y + cell - 2], outline=colors[it['verdict']], width=4)
        d.text((x + 6, y + cell + 2), f"{it['name']}　{it['why'] or 'OK'}"[:14], fill=colors[it['verdict']], font=f)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    sheet.save(out, quality=85)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('bundles', nargs='+')
    ap.add_argument('--apply', action='store_true', help='驗收通過的正式匯入')
    ap.add_argument('--skip', default='', help='人工排除的名字，逗號分隔')
    ap.add_argument('--replace', default='', help='已有立繪、要換成新圖的名字，逗號分隔')
    a = ap.parse_args()
    skip = {s for s in a.skip.split(',') if s}
    replace = {s for s in a.replace.split(',') if s}

    names = roster()
    existing = {os.path.splitext(f)[0]: os.path.join(RAW, f) for f in os.listdir(RAW) if f.endswith('.png')}
    existing_md5 = {md5(p): n for n, p in existing.items()}
    tmp = tempfile.mkdtemp()
    items, seen = [], {}
    for b in a.bundles:
        for e in entries(unpack(b, tmp), os.path.basename(b)):
            if not os.path.exists(e['path']):
                continue
            h = md5(e['path'])
            if h in seen:  # 同一張圖在多個素材包重複出現
                continue
            seen[h] = e
            e['md5'] = h
            items.append(e)

    # 逐張判定
    for it in items:
        n, why, verdict = it['name'], '', 'ok'
        if n not in names:
            verdict, why = 'reject', '不在名單'
        elif it['md5'] in existing_md5:
            verdict, why = 'reject', '已匯入過'
        elif n in skip:
            verdict, why = 'reject', '人工排除'
        elif 'placeholder' in it['flags']:
            verdict, why = 'reject', '標示待重畫'
        elif has_label(it['path']):
            verdict, why = 'reject', '圖上有名字標籤'
        elif n in existing and n not in replace:
            verdict, why = 'reject', '已有立繪'
        elif 'draft' in it['flags']:
            verdict, why = 'warn', '草稿'
        it['verdict'], it['why'] = verdict, why

    # 撞臉：這次要匯入的 vs 彼此、vs 已有的立繪
    cand = [it for it in items if it['verdict'] != 'reject']
    pool = {n: dhash(p) for n, p in existing.items() if not n.startswith('_') and n not in {c['name'] for c in cand}}
    pool.update({it['name']: dhash(it['path']) for it in cand})
    alike = []
    for x, y in itertools.combinations(pool, 2):
        if not any(c['name'] in (x, y) for c in cand):
            continue
        d = sum(p != q for p, q in zip(pool[x], pool[y]))
        if d < LOOKALIKE:
            alike.append((d, x, y))
    for d, x, y in sorted(alike):
        for it in cand:
            if it['name'] in (x, y) and '像' not in it['why']:
                other = y if it['name'] == x else x
                it['verdict'], it['why'] = 'warn', '、'.join(filter(None, [it['why'], f'像{other}']))

    # 報告
    order = {'ok': 0, 'warn': 1, 'reject': 2}
    items.sort(key=lambda it: (order[it['verdict']], it['source'], it['name']))
    label = {'ok': '✅ 可匯入', 'warn': '⚠️ 請人工確認', 'reject': '⛔ 擋下'}
    for v in ('ok', 'warn', 'reject'):
        group = [it for it in items if it['verdict'] == v]
        if group:
            print(f"{label[v]}（{len(group)}）：" + '、'.join(f"{it['name']}" + (f"（{it['why']}）" if it['why'] else '') for it in group))
    if alike:
        print('臉部相似度（越小越像）：' + '、'.join(f'{x}／{y} {d}' for d, x, y in sorted(alike)[:12]))
    sheet = os.path.join(REVIEW, 'review.jpg')
    contact_sheet(items, sheet)
    print(f'對照圖：{os.path.relpath(sheet, os.getcwd())}（綠框可匯入、橘框請確認、紅框擋下）')

    if not a.apply:
        print('確認後加上 --apply 匯入；不要的用 --skip 名字1,名字2 排除。')
        return
    todo = [it for it in items if it['verdict'] in ('ok', 'warn')]
    crops = json.load(open(CROPS, encoding='utf-8')) if os.path.exists(CROPS) else {}
    for it in todo:
        shutil.copyfile(it['path'], os.path.join(RAW, it['name'] + '.png'))
        if it['name'] not in crops or it['name'] in replace:
            crops[it['name']] = dict(DEFAULT_CROP)
    json.dump(crops, open(CROPS, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print(f"已複製 {len(todo)} 張到 art/raw/：" + '、'.join(it['name'] for it in todo))
    subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'import_portraits.py')], check=True)
    print('下一步：node sangoku/build.js，再用 E2E 測試或遊戲畫面確認裁切。')


if __name__ == '__main__':
    main()
