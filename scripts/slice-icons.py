"""ChatGPT ikon sayfasını (siyah zemin, ızgara) şeffaf PNG'lere böler.

Kullanım: python3 scripts/slice-icons.py <sayfa.png> <sütun> <satır> <boyut> <ad1> <ad2> ...
Siyah zemin parlaklıktan alfa hesaplanarak kaldırılır (parıltı yumuşak kalır).
"""
import sys

import numpy as np
from PIL import Image

src, cols, rows, size = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])
names = sys.argv[5:]
OPAQUE_AT = 70.0  # bu parlaklığın üstü tamamen opak

im = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
h, w, _ = im.shape
cw, ch = w / cols, h / rows
for idx, name in enumerate(names):
    r, c = divmod(idx, cols)
    cell = im[int(r * ch):int((r + 1) * ch), int(c * cw):int((c + 1) * cw)]
    lum = cell.max(axis=2)
    alpha = np.clip(lum / OPAQUE_AT, 0, 1)
    rgb = np.where(alpha[..., None] > 0, np.clip(cell / np.maximum(alpha[..., None], 1e-3), 0, 255), 0)
    rgba = np.dstack([rgb, alpha * 255]).astype(np.uint8)
    img = Image.fromarray(rgba, 'RGBA')
    bbox = img.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
    if bbox:
        x0, y0, x1, y1 = bbox
        side = max(x1 - x0, y1 - y0)
        cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
        half = side // 2 + 4
        img = img.crop((cx - half, cy - half, cx + half, cy + half))
    img.resize((size, size), Image.LANCZOS).save(name)
    print(name)
