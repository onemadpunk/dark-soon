# Magenta chroma key: soft alpha from "how magenta" each pixel is, then un-mix the magenta out of edge pixels
import numpy as np, json, base64, sys
from PIL import Image
from scipy import ndimage
src = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(float)
BG = np.median(src[:30, 300:700].reshape(-1, 3), 0)          # the sheet's magenta, about (250,7,250)
mag = np.minimum(src[..., 0], src[..., 2]) - src[..., 1]      # magenta-ness: high R and B, low G
full = np.minimum(BG[0], BG[2]) - BG[1]
alpha = np.clip(1 - (mag - 25) / (full - 25 - 20), 0, 1)       # <=25 solid, within 20 of the backdrop clear
a3 = np.maximum(alpha, 1e-3)[..., None]
rgb = np.clip((src - (1 - alpha)[..., None] * BG) / a3, 0, 255)  # remove the magenta that bled into edges
# despill: no foreground pixel should still lean magenta
spill = np.clip(np.minimum(rgb[..., 0], rgb[..., 2]) - rgb[..., 1] - 6, 0, None)
rgb[..., 0] -= spill; rgb[..., 2] -= spill
K = 0.62
meta = {}
def cut(box, name):
    x0, y0, x1, y1 = box
    al = alpha[y0:y1, x0:x1]; solid = al > .5
    lab, n = ndimage.label(solid)
    sizes = ndimage.sum(solid, lab, range(1, n + 1))
    keep = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s > sizes.max() * .15])
    keep = ndimage.binary_dilation(keep, iterations=3)          # keep the soft edge around the kept parts
    al = al * keep
    ys, xs = np.where(al > .02)
    by0, by1, bx0, bx1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    rgba = np.dstack([rgb[y0:y1, x0:x1], al * 255])[by0:by1, bx0:bx1]
    im = Image.fromarray(rgba.round().astype(np.uint8), 'RGBA').convert('RGBa')  # premultiplied so resizing can't bleed colour
    im = im.resize((round(im.width * K), round(im.height * K)), Image.LANCZOS).convert('RGBA')
    hh = by1 - by0; low = keep[by0 + int(hh * .4):by1, bx0:bx1] & (al[by0 + int(hh * .4):by1, bx0:bx1] > .5)
    ax = float(np.where(low)[1].mean()) / (bx1 - bx0)
    im.save(name + '.webp', 'WEBP', quality=90, method=6, exact=False)
    meta[name] = dict(w=im.width, h=im.height, ax=round(ax, 3), src='data:image/webp;base64,' + base64.b64encode(open(name + '.webp', 'rb').read()).decode())
    print(name, im.size, round(ax, 2))
cut((270, 10, 440, 295), 'idle0'); cut((450, 10, 620, 295), 'idle1')
for i, (a, b) in enumerate([(15, 200), (190, 375), (350, 535), (515, 705)]): cut((a, 305, b, 545), f'run{i}')
cut((210, 555, 425, 800), 'jump0'); cut((410, 590, 615, 800), 'jump1')
cut((190, 785, 425, 1086), 'float0'); cut((450, 780, 710, 1086), 'float1')
json.dump(meta, open('frames.json', 'w'))
# checks: every frame on dark, light and mid backgrounds, plus a 4x zoom of the umbrella gap
ims = [Image.open(n + '.webp') for n in meta]
W = sum(i.width for i in ims) + 10 * len(ims); H = max(i.height for i in ims)
rows = []
for col in [(30, 22, 50), (235, 225, 210), (190, 120, 70)]:
    c = Image.new('RGB', (W, H), col); x = 0
    for i in ims: c.paste(i, (x, H - i.height), i); x += i.width + 10
    rows.append(c)
out = Image.new('RGB', (W, H * 3)); [out.paste(r, (0, k * H)) for k, r in enumerate(rows)]; out.save('frames.png')
f = Image.open('float1.webp'); z = Image.new('RGB', f.size, (235, 225, 210)); z.paste(f, (0, 0), f)
z.resize((f.width * 3, f.height * 3), Image.NEAREST).save('zoom.png')
