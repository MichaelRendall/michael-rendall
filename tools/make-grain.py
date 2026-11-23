# Writes src/assets/grain.png: a seamless grain tile as a grey+alpha PNG, standard library only.
# Run: python tools/make-grain.py src/assets/grain.png
#
# It reproduces the site's original SVG grain, which was:
#   <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
#   <feColorMatrix type="saturate" values="0" />
#   drawn over the scene at 14% opacity with mix-blend-mode: multiply.
# The noise is a direct port of the reference feTurbulence code in the SVG specification, so it has the
# same uneven, clumpy Perlin texture (and seed) as the browser's version.
#
# Multiplying by grey g with alpha a at 14% opacity darkens by 0.14 * a * (1 - g). That's the same as
# black at that alpha, so the tile is black with per-pixel alpha and the page needs no blend mode.
import math, struct, sys, zlib

SIZE = 128  # tile size in px; the noise is pixel-scale, so a repeat this size is invisible
STRENGTH = 0.14  # the original layer opacity
BASE_FREQ, OCTAVES, SEED = 0.9, 2, 0

# --- feTurbulence, ported from the SVG 1.1 specification (section 15.24) ---
B_SIZE, BM, PERLIN_N = 0x100, 0xFF, 0x1000
RAND_M, RAND_A, RAND_Q, RAND_R = 2147483647, 16807, 127773, 2836


def setup_seed(seed):
    if seed <= 0:
        seed = -(seed % (RAND_M - 1)) + 1
    return min(seed, RAND_M - 1)


def next_random(seed):
    # C integer division and modulo; seeds stay positive here, so Python's operators match.
    result = RAND_A * (seed % RAND_Q) - RAND_R * (seed // RAND_Q)
    return result + RAND_M if result <= 0 else result


lattice = [0] * (B_SIZE + B_SIZE + 2)
gradient = [[[0.0, 0.0] for _ in range(B_SIZE + B_SIZE + 2)] for _ in range(4)]
seed = setup_seed(SEED)
for k in range(4):
    for i in range(B_SIZE):
        lattice[i] = i
        for j in range(2):
            seed = next_random(seed)
            gradient[k][i][j] = ((seed % (B_SIZE + B_SIZE)) - B_SIZE) / B_SIZE
        s = math.sqrt(gradient[k][i][0] ** 2 + gradient[k][i][1] ** 2)
        gradient[k][i][0] /= s
        gradient[k][i][1] /= s
i = B_SIZE - 1
while i > 0:
    k = lattice[i]
    seed = next_random(seed)
    j = seed % B_SIZE
    lattice[i] = lattice[j]
    lattice[j] = k
    i -= 1
for i in range(B_SIZE + 2):
    lattice[B_SIZE + i] = lattice[i]
    for k in range(4):
        gradient[k][B_SIZE + i] = list(gradient[k][i])


def s_curve(t):
    return t * t * (3.0 - 2.0 * t)


def lerp(t, a, b):
    return a + t * (b - a)


def noise2(channel, vx, vy, stitch):
    t = vx + PERLIN_N
    bx0 = int(t)
    bx1 = bx0 + 1
    rx0 = t - int(t)
    rx1 = rx0 - 1.0
    t = vy + PERLIN_N
    by0 = int(t)
    by1 = by0 + 1
    ry0 = t - int(t)
    ry1 = ry0 - 1.0
    if stitch:
        # Wrap before masking, as browsers do. The spec's sample code masks first, which would make
        # these checks never fire and the tile wouldn't repeat seamlessly.
        if bx0 >= stitch['wrap_x']:
            bx0 -= stitch['width']
        if bx1 >= stitch['wrap_x']:
            bx1 -= stitch['width']
        if by0 >= stitch['wrap_y']:
            by0 -= stitch['height']
        if by1 >= stitch['wrap_y']:
            by1 -= stitch['height']
    bx0 &= BM
    bx1 &= BM
    by0 &= BM
    by1 &= BM
    i, j = lattice[bx0], lattice[bx1]
    b00, b10, b01, b11 = lattice[i + by0], lattice[j + by0], lattice[i + by1], lattice[j + by1]
    sx, sy = s_curve(rx0), s_curve(ry0)
    g = gradient[channel]
    u = rx0 * g[b00][0] + ry0 * g[b00][1]
    v = rx1 * g[b10][0] + ry0 * g[b10][1]
    a = lerp(sx, u, v)
    u = rx0 * g[b01][0] + ry1 * g[b01][1]
    v = rx1 * g[b11][0] + ry1 * g[b11][1]
    b = lerp(sx, u, v)
    return lerp(sy, a, b)


def stitched_frequency(freq, size):
    lo = math.floor(size * freq) / size
    hi = math.ceil(size * freq) / size
    return lo if freq / lo < hi / freq else hi


FREQ = stitched_frequency(BASE_FREQ, SIZE)


def turbulence(channel, x, y):
    width = int(SIZE * FREQ + 0.5)
    stitch = {'width': width, 'wrap_x': PERLIN_N + width, 'height': width, 'wrap_y': PERLIN_N + width}
    total, vx, vy, ratio = 0.0, x * FREQ, y * FREQ, 1.0
    for _ in range(OCTAVES):
        total += noise2(channel, vx, vy, stitch) / ratio  # fractalNoise: signed sum
        vx, vy, ratio = vx * 2, vy * 2, ratio * 2
        stitch['width'] *= 2
        stitch['wrap_x'] = 2 * stitch['wrap_x'] - PERLIN_N
        stitch['height'] *= 2
        stitch['wrap_y'] = 2 * stitch['wrap_y'] - PERLIN_N
    return total


# --- Colour: filters work in linearRGB, then the browser shows the result in sRGB ---
def to_srgb(c):
    return 12.92 * c if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055


def darkness(x, y):
    r, g, b, a = (min(1.0, max(0.0, (turbulence(k, x, y) + 1) / 2)) for k in range(4))
    grey = to_srgb(0.2126 * r + 0.7152 * g + 0.0722 * b)  # saturate="0", then to sRGB
    return STRENGTH * a * (1 - grey)


# --- PNG: 8-bit grey+alpha, black pixels; per-row Sub or Up filter, whichever is smaller ---
def filtered(row, prev):
    sub = bytes((row[i] - (row[i - 2] if i >= 2 else 0)) & 0xFF for i in range(len(row)))
    up = bytes((row[i] - prev[i]) & 0xFF for i in range(len(row)))
    return min((b'\x01' + sub, b'\x02' + up), key=lambda f: sum(min(v, 256 - v) for v in f[1:]))


def chunk(kind, data):
    return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data) & 0xFFFFFFFF)


if __name__ == '__main__':
    rows, prev = [], bytes(SIZE * 2)
    for y in range(SIZE):
        row = bytearray()
        for x in range(SIZE):
            row += bytes([0, round(darkness(x, y) * 255)])
        rows.append(filtered(bytes(row), prev))
        prev = bytes(row)
    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', struct.pack('>IIBBBBB', SIZE, SIZE, 8, 4, 0, 0, 0))
    png += chunk(b'IDAT', zlib.compress(b''.join(rows), 9))
    png += chunk(b'IEND', b'')
    open(sys.argv[1], 'wb').write(png)
    print(f'{len(png)} bytes, frequency {FREQ:.4f} (stitched from {BASE_FREQ})')
