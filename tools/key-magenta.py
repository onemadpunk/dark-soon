# Key a single character off a magenta backdrop. Only the backdrop connected to the image border
# or any pocket of exact backdrop colour (plus a thin edge band) is keyed, so purple or pink stickers inside the character stay solid.
import numpy as np, sys
from PIL import Image
from scipy import ndimage
src = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(float)
out, height = sys.argv[2], int(sys.argv[3])
edge = np.concatenate([src[:8].reshape(-1, 3), src[-8:].reshape(-1, 3), src[:, :8].reshape(-1, 3), src[:, -8:].reshape(-1, 3)])
BG = np.median(edge, 0)
mag = np.minimum(src[..., 0] / BG[0], src[..., 2] / BG[2]) * min(BG[0], BG[2]) - src[..., 1]
full = min(BG[0], BG[2]) - BG[1]
alpha = np.clip(1 - (mag - 25) / (full - 45), 0, 1)
lab, n = ndimage.label(alpha < .5)
border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
outside = np.isin(lab, list(border))
# backdrop showing through gaps (under an arm, inside lace loops): pockets that are the exact backdrop colour
near = np.linalg.norm(src - BG, axis=2) < 45
nl, nn = ndimage.label(near)
sizes = ndimage.sum(near, nl, range(1, nn + 1))
outside |= np.isin(nl, [i + 1 for i, sz in enumerate(sizes) if sz >= 12])
band = ndimage.binary_dilation(outside, iterations=3)
alpha = np.where(band, alpha, 1.0)
rgb = np.clip((src - (1 - alpha)[..., None] * BG) / np.maximum(alpha, 1e-3)[..., None], 0, 255)
spill = np.clip(np.minimum(rgb[..., 0], rgb[..., 2]) - rgb[..., 1] - 6, 0, None) * band
rgb[..., 0] -= spill; rgb[..., 2] -= spill
ys, xs = np.where(alpha > .02)
rgba = np.dstack([rgb, alpha * 255])[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
im = Image.fromarray(rgba.round().astype(np.uint8), 'RGBA').convert('RGBa')
im = im.resize((round(im.width * height / im.height), height), Image.LANCZOS).convert('RGBA')
im.save(out, 'WEBP', quality=90, method=6)
print(out, im.size)
