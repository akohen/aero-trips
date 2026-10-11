#!/usr/bin/env python3
"""Builds the OACI map tiles from the SIA 1:1 000 000 charts (« Million » Nord and Sud).

What it does
  Page 3 of each chart is the airspace chart (SFC-FL195), drawn in Lambert-93 (EPSG:2154) at
  1:1 000 000. For each sheet of scripts/oaci-sheets.json the script:
  1. removes everything green from page 3 (airways, waypoints, VOR/NDB and their labels: not
     relevant to a map that only situates airfields and activities), by dropping the vector
     painting operations in green before rendering;
  2. renders page 3 at `dpi`;
  3. fits an affine transform from Lambert-93 to the page, on airfield symbols (`gcps`: ICAO
     code -> symbol centre in PDF points, origin top left; airfield positions are read from
     src/data/airfields.json), and prints the residuals;
  4. clips to `clip` (PDF points: the map frame minus the legend panels) and warps to Web
     Mercator.
  The Corsica inset of the Sud sheet is its own entry (same PDF, its own GCPs and clip). Sheets
  are merged in config order, then cut into 512 px WebP tiles (XYZ, retina) for `zooms`.

Inputs
  The two PDFs, free on the SIA shop (sia.aviation-civile.gouv.fr, « Carte "Million" France
  Nord / Sud - Format PDF »: order them at 0 €, then download from « Mes commandes »). Put them
  in --pdf-dir (default tmp/oaci/, gitignored) under the names given by `pdf` in the config.
  Never commit them.

Setup (once)
  brew install gdal poppler
  python3 -m venv --system-site-packages tmp/oaci/.venv
  tmp/oaci/.venv/bin/pip install pikepdf
  (--system-site-packages: GDAL's Python bindings, numpy and Pillow come from Homebrew's Python.)

Run
  tmp/oaci/.venv/bin/python scripts/oaci-tiles.py --check   # fit + control point crops only
  tmp/oaci/.venv/bin/python scripts/oaci-tiles.py           # full build, ~6 min
  Options: --pdf-dir DIR (PDFs), --out DIR (tiles, default tmp/oaci/tiles-<edition>).
  Intermediate files go to tmp/oaci/work-<edition>/: the green-free PDFs and the renders are
  reused while they are newer than their source, so a rerun after a config change only warps
  and tiles again (~4 min). Delete that folder to start over.

Outputs
  tmp/oaci/tiles-<edition>/{z}/{x}/{y}.webp: ~500 tiles, ~30 MB for zooms 7-9.
  tmp/oaci/work-<edition>/check.png: the lowest zoom stitched, every AeroTrips airfield circled
  in magenta. Circles must sit on the chart's airfield symbols, no legend panel may remain at
  the edges, and the sheets must join without a visible seam.

Yearly update (new edition)
  1. Download the new PDFs, update `edition`, `source` and the `pdf` names in the config.
  2. Run with --check, open tmp/oaci/work-<edition>/gcp-<sheet>.png: one 300 px square per
     control point, covering 60 pt of the page (5 px = 1 pt), crosshair on the configured
     position. If a symbol has moved, add (dx / 5, dy / 5) to its `gcps` entry, dx and dy being
     the offset in pixels from the crosshair to the symbol centre. Residuals must stay under
     ~3 pt (≈ 1 km); a large one means a misplaced point. To add a point, any airfield of
     src/data/airfields.json works: `pdftotext -f 3 -l 3 -bbox <pdf> -` gives the position of
     its ICAO label, a good starting point, then refine with --check.
  3. Run the full build and look at check.png. If a legend panel shows at an edge, move the
     matching `clip` vertex (PDF points: `pdftoppm -r 72` renders the page at 1 px = 1 pt).
  4. Upload the tiles (below) and point the map layer to the new edition.

Upload (production bucket gs://aero-trips.appspot.com; staging: aero-trips-staging.appspot.com)
  Tiles live under oaci/<edition>/ and are served from
  https://storage.googleapis.com/aero-trips.appspot.com/oaci/<edition>/{z}/{x}/{y}.webp
  The bucket has fine-grained access (like the passport images, each object is made public on
  its own) and the edition in the path makes every tile immutable. gcloud's active account is
  not the one with access to aero-trips: always pass --account.

  Once per bucket, CORS (the TileLayer requests tiles with crossOrigin, so the service worker
  can cache them without opaque responses). The bucket had no CORS configuration on
  2026-10-11; --cors-file replaces the whole configuration, so check first and merge:
    gcloud storage buckets describe gs://aero-trips.appspot.com --format="json(cors_config)" \\
      --account alexandre.kohen@gmail.com
    cat > tmp/oaci/cors.json <<'JSON'
    [{"origin": ["https://aerotrips.fr", "http://localhost:5173"], "method": ["GET"],
      "responseHeader": ["Content-Type"], "maxAgeSeconds": 3600}]
    JSON
    gcloud storage buckets update gs://aero-trips.appspot.com --cors-file=tmp/oaci/cors.json \\
      --account alexandre.kohen@gmail.com

  Each edition (re-running it is safe: same paths, same content):
    gcloud storage cp -r 'tmp/oaci/tiles-2026/*' gs://aero-trips.appspot.com/oaci/2026/ \\
      --predefined-acl=publicRead --cache-control="public, max-age=31536000, immutable" \\
      --account alexandre.kohen@gmail.com
  Check one tile (200, image/webp, the Cache-Control above, and the CORS header):
    curl -sI -H "Origin: https://aerotrips.fr" \\
      https://storage.googleapis.com/aero-trips.appspot.com/oaci/2026/7/64/44.webp
  Once the map uses the new edition and a release is out, remove the previous one:
    gcloud storage rm -r gs://aero-trips.appspot.com/oaci/2025/ --account alexandre.kohen@gmail.com
"""
import argparse
import json
import math
import os
import subprocess
import sys

try:
    import numpy as np
    import pikepdf
    from osgeo import gdal, osr
    from PIL import Image, ImageDraw
except ImportError as e:
    sys.exit(f'{e}: see the setup in the docstring of {__file__}')

gdal.UseExceptions()
osr.UseExceptions()

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG = os.path.join(ROOT, 'scripts', 'oaci-sheets.json')
AIRFIELDS = os.path.join(ROOT, 'src', 'data', 'airfields.json')
PAINT_FILL = {'f', 'F', 'f*', 'B', 'B*', 'b', 'b*'}
PAINT_STROKE = {'S', 's', 'B', 'B*', 'b', 'b*'}
PATH_OPS = {'m', 'l', 'c', 'v', 'y', 'h', 're'}
TEXT_SHOW = {'Tj', 'TJ', "'", '"'}
WHITE = (0.0, 0.0, 0.0, 0.0)
MAX_RESIDUAL_PT = 3


def is_green(cmyk):
    """Every green of the chart: equal-ish cyan and yellow, no magenta (CMYK, any black)."""
    return (cmyk is not None and len(cmyk) == 4 and cmyk[1] < 0.05
            and cmyk[0] > 0.05 and cmyk[2] > 0.05 and abs(cmyk[0] - cmyk[2]) < 0.2)


def strip_greens(src, dst, page):
    """Drops green paths, hides green text, and drops the white fill of green-outlined symbols."""
    pdf = pikepdf.open(src)
    pg = pdf.pages[page - 1]
    out, stack, path, last_fill = [], [], [], None
    fill = stroke = None
    render_mode = 0
    paths = texts = 0
    for operands, op in pikepdf.parse_content_stream(pg):
        o = str(op)
        if o == 'q':
            stack.append((fill, stroke, render_mode))
        elif o == 'Q' and stack:
            fill, stroke, render_mode = stack.pop()
        elif o == 'k':
            fill = tuple(float(x) for x in operands)
        elif o == 'K':
            stroke = tuple(float(x) for x in operands)
        elif o == 'Tr':
            render_mode = int(operands[0])
        elif o == 'n':
            path = []
        if o in PATH_OPS:
            path.append((o, tuple(float(x) for x in operands)))
        if o in PAINT_FILL | PAINT_STROKE:
            this_path, path = tuple(path), []
            green_fill = o in PAINT_FILL and is_green(fill)
            green_stroke = o in PAINT_STROKE and is_green(stroke)
            # Waypoint triangles and VOR boxes: a white fill, then the same path stroked in green.
            if green_stroke and o in ('S', 's') and last_fill and last_fill[1] == this_path and last_fill[2] == WHITE:
                out[last_fill[0]] = ([], pikepdf.Operator('n'))
                paths += 1
            last_fill = (len(out), this_path, fill) if o in ('f', 'F', 'f*') else None
            keep_fill = o in PAINT_FILL and not green_fill
            keep_stroke = o in PAINT_STROKE and not green_stroke
            if green_fill or green_stroke:
                paths += 1
                replacement = 'B' if keep_fill and keep_stroke else 'f' if keep_fill else 'S' if keep_stroke else 'n'
                out.append(([], pikepdf.Operator(replacement)))
                continue
        if o in TEXT_SHOW and is_green(fill):
            out += [([3], pikepdf.Operator('Tr')), (operands, op), ([render_mode], pikepdf.Operator('Tr'))]
            texts += 1
            continue
        out.append((operands, op))
    pg.Contents = pdf.make_stream(pikepdf.unparse_content_stream(out))
    pdf.save(dst)
    print(f'  {os.path.basename(src)} p.{page}: {paths} green paths and {texts} green texts removed')


def lambert93_positions():
    data = json.load(open(AIRFIELDS))['airfields']
    items = data if isinstance(data, list) else list(data.values())
    wgs84 = osr.SpatialReference()
    wgs84.ImportFromEPSG(4326)
    wgs84.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
    l93 = osr.SpatialReference()
    l93.ImportFromEPSG(2154)
    tr = osr.CoordinateTransformation(wgs84, l93)
    return {a['codeIcao']: tr.TransformPoint(a['position']['longitude'], a['position']['latitude'])[:2]
            for a in items if a.get('position')}


def fit_affine(sheet, positions):
    """Least-squares affine Lambert-93 -> PDF points; returns (coef, residuals in pt)."""
    missing = [c for c in sheet['gcps'] if c not in positions]
    if missing:
        sys.exit(f"{sheet['name']}: unknown airfields {missing} (not in {AIRFIELDS})")
    codes = list(sheet['gcps'])
    a = np.array([[*positions[c], 1] for c in codes])
    p = np.array([sheet['gcps'][c] for c in codes])
    coef, *_ = np.linalg.lstsq(a, p, rcond=None)
    residuals = dict(zip(codes, np.hypot(*(a @ coef - p).T)))
    return coef, residuals


def report_fit(sheet, coef, residuals):
    scale = 1 / math.hypot(coef[0, 0], coef[0, 1])
    worst = max(residuals, key=residuals.get)
    print(f"  {sheet['name']}: 1 pt = {scale:.0f} m, worst residual {worst} {residuals[worst]:.1f} pt "
          f"({residuals[worst] * scale / 1000:.1f} km)")
    for code, r in residuals.items():
        if r > MAX_RESIDUAL_PT:
            print(f'    ⚠ {code}: {r:.1f} pt, check its symbol position')


def render(pdf, page, dpi, dst):
    if os.path.exists(dst) and os.path.getmtime(dst) > os.path.getmtime(pdf):
        return
    print(f'  rendering {os.path.basename(pdf)} p.{page} at {dpi} dpi')
    gdal.SetConfigOption('GDAL_PDF_DPI', str(dpi))
    gdal.Translate(dst, f'PDF:{page}:{pdf}', creationOptions=['TILED=YES', 'COMPRESS=LZW', 'BIGTIFF=IF_SAFER'])
    gdal.SetConfigOption('GDAL_PDF_DPI', None)


def georeference(sheet, coef, dpi, raster, work):
    """VRT of the render with the sheet's geotransform, and its clip polygon in Lambert-93."""
    k = dpi / 72
    m = np.array([[coef[0, 0], coef[1, 0]], [coef[0, 1], coef[1, 1]]]) * k  # px = m @ [X, Y] + t
    t = coef[2] * k
    mi = np.linalg.inv(m)
    origin = -(mi @ t)
    gt = [origin[0], mi[0, 0], mi[0, 1], origin[1], mi[1, 0], mi[1, 1]]
    vrt = os.path.join(work, f"{sheet['name']}.vrt")
    ds = gdal.Translate(vrt, raster, format='VRT')
    ds.SetGeoTransform(gt)
    l93 = osr.SpatialReference()
    l93.ImportFromEPSG(2154)
    ds.SetProjection(l93.ExportToWkt())
    ds = None
    ring = [[gt[0] + x * k * gt[1] + y * k * gt[2], gt[3] + x * k * gt[4] + y * k * gt[5]]
            for x, y in sheet['clip'] + sheet['clip'][:1]]
    cut = os.path.join(work, f"{sheet['name']}-clip.geojson")
    json.dump({'type': 'FeatureCollection',
               'crs': {'type': 'name', 'properties': {'name': 'urn:ogc:def:crs:EPSG::2154'}},
               'features': [{'type': 'Feature', 'properties': {},
                             'geometry': {'type': 'Polygon', 'coordinates': [ring]}}]}, open(cut, 'w'))
    return vrt, cut


def gcp_crops(sheet, pdf, dst):
    """One crop per GCP at 300 dpi, crosshair on the configured position."""
    dpi, radius = 300, 30
    k = dpi / 72
    crops = []
    for code, (x, y) in sheet['gcps'].items():
        name = f'{dst}-{code}'
        subprocess.run(['pdftoppm', '-f', str(sheet['page']), '-l', str(sheet['page']), '-r', str(dpi),
                        '-x', str(int((x - radius) * k)), '-y', str(int((y - radius) * k)),
                        '-W', str(int(2 * radius * k)), '-H', str(int(2 * radius * k)),
                        '-png', '-singlefile', pdf, name], check=True)
        im = Image.open(name + '.png').convert('RGB')
        os.remove(name + '.png')
        d = ImageDraw.Draw(im)
        c, s = radius * k, im.size[0]
        d.line([(c, 0), (c, s)], fill=(255, 0, 255), width=2)
        d.line([(0, c), (s, c)], fill=(255, 0, 255), width=2)
        d.text((4, 4), code, fill=(0, 0, 0))
        crops.append(im.resize((300, 300)))
    sheet_img = Image.new('RGB', (300 * 4, 300 * math.ceil(len(crops) / 4)), 'white')
    for i, im in enumerate(crops):
        sheet_img.paste(im, ((i % 4) * 300, (i // 4) * 300))
    sheet_img.save(dst + '.png')
    print(f'  {dst}.png')


def tile_xy(lat, lon, z):
    n = 2 ** z
    return (lon + 180) / 360 * n, (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n


def check_image(tiles, z, dst):
    """Stitched tiles at zoom z with every AeroTrips airfield circled: markers must sit on symbols."""
    data = json.load(open(AIRFIELDS))['airfields']
    items = data if isinstance(data, list) else list(data.values())
    xs = [int(x) for x in os.listdir(os.path.join(tiles, str(z))) if x.isdigit()]
    ys = [int(f.split('.')[0]) for x in xs for f in os.listdir(os.path.join(tiles, str(z), str(x)))]
    x0, y0, size = min(xs), min(ys), 512
    img = Image.new('RGB', ((max(xs) - x0 + 1) * size, (max(ys) - y0 + 1) * size), (230, 230, 230))
    for x in xs:
        for f in os.listdir(os.path.join(tiles, str(z), str(x))):
            tile = Image.open(os.path.join(tiles, str(z), str(x), f)).convert('RGBA')
            img.paste(tile, ((x - x0) * size, (int(f.split('.')[0]) - y0) * size), tile)
    d = ImageDraw.Draw(img)
    for a in items:
        if a.get('position'):
            tx, ty = tile_xy(a['position']['latitude'], a['position']['longitude'], z)
            px, py = (tx - x0) * size, (ty - y0) * size
            d.ellipse((px - 8, py - 8, px + 8, py + 8), outline=(255, 0, 255), width=3)
    img.save(dst)
    print(f'  {dst}')


def main():
    parser = argparse.ArgumentParser(description=__doc__.split('\n')[0],
                                     epilog='Setup, inputs and the yearly update: see the docstring of this file.')
    parser.add_argument('--pdf-dir', default=os.path.join(ROOT, 'tmp', 'oaci'), help='folder of the SIA PDFs (default: tmp/oaci)')
    parser.add_argument('--out', help='tiles directory (default: tmp/oaci/tiles-<edition>)')
    parser.add_argument('--check', action='store_true', help='only fit the GCPs and render their crops')
    args = parser.parse_args()

    config = json.load(open(CONFIG))
    edition, dpi = config['edition'], config['dpi']
    work = os.path.join(ROOT, 'tmp', 'oaci', f'work-{edition}')
    out = args.out or os.path.join(ROOT, 'tmp', 'oaci', f'tiles-{edition}')
    os.makedirs(work, exist_ok=True)
    positions = lambert93_positions()

    print('Fitting the sheets on airfield symbols')
    fits = {}
    for sheet in config['sheets']:
        coef, residuals = fit_affine(sheet, positions)
        report_fit(sheet, coef, residuals)
        fits[sheet['name']] = coef
    if args.check:
        print('Control point crops (crosshair = configured position)')
        for sheet in config['sheets']:
            gcp_crops(sheet, os.path.join(args.pdf_dir, sheet['pdf']), os.path.join(work, f"gcp-{sheet['name']}"))
        return

    print('Removing green and rendering')
    rendered = {}
    for sheet in config['sheets']:
        key = (sheet['pdf'], sheet['page'])
        if key in rendered:
            continue
        stem = os.path.join(work, f"{os.path.splitext(sheet['pdf'])[0]}-p{sheet['page']}")
        src = os.path.join(args.pdf_dir, sheet['pdf'])
        if not os.path.exists(src):
            sys.exit(f'{src} not found')
        if not (os.path.exists(stem + '.pdf') and os.path.getmtime(stem + '.pdf') > os.path.getmtime(src)):
            strip_greens(src, stem + '.pdf', sheet['page'])
        render(stem + '.pdf', sheet['page'], dpi, stem + '.tif')
        rendered[key] = stem + '.tif'

    print('Warping to Web Mercator')
    warped = []
    for sheet in config['sheets']:
        vrt, cut = georeference(sheet, fits[sheet['name']], dpi, rendered[(sheet['pdf'], sheet['page'])], work)
        dst = os.path.join(work, f"{sheet['name']}-3857.tif")
        gdal.Warp(dst, vrt, dstSRS='EPSG:3857', resampleAlg='lanczos', cutlineDSName=cut, cropToCutline=True,
                  dstAlpha=True, multithread=True, warpMemoryLimit=2048,
                  creationOptions=['TILED=YES', 'COMPRESS=DEFLATE', 'BIGTIFF=IF_SAFER'])
        warped.append(dst)
    merged = os.path.join(work, 'merged.vrt')
    gdal.BuildVRT(merged, warped)

    zmin, zmax = config['zooms']
    print(f'Cutting 512 px tiles, zooms {zmin}-{zmax}, into {out}')
    subprocess.run(['gdal2tiles.py', '--xyz', '-q', '-z', f'{zmin}-{zmax}', '--tilesize=512', '-r', 'lanczos',
                    f'--processes={os.cpu_count()}', '-w', 'none', '--tiledriver=WEBP', '--webp-quality=85',
                    merged, out], check=True)
    count = sum(len(files) for _, _, files in os.walk(out))
    size = sum(os.path.getsize(os.path.join(d, f)) for d, _, files in os.walk(out) for f in files)
    print(f'  {count} tiles, {size / 1e6:.0f} MB')
    check_image(out, zmin, os.path.join(work, 'check.png'))


if __name__ == '__main__':
    main()
