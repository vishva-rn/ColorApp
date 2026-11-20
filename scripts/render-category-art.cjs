// Run with Node 22.18+ to render square PNG covers from the coloring pages.
/* global __dirname */
const fs = require('node:fs');
const path = require('node:path');
const initializeCanvasKit = require('canvaskit-wasm');
const { INTEREST_ART, REDRAWN_ART } = require('../lib/interest-art.ts');
const { MOSAIC_SUNRISE } = require('../lib/mosaic-sunrise.ts');

const root = path.resolve(__dirname, '..');
const catalog = fs.readFileSync(path.join(root, 'lib/art-categories.ts'), 'utf8');
const covers = [...catalog.matchAll(/id: '([^']+)'.*artIds: \['([^']+)'/g)];
const illustrations = new Map([...INTEREST_ART, ...Object.values(REDRAWN_ART), MOSAIC_SUNRISE]
  .map((art) => [art.id, art]));
const outputSize = 300;

async function main() {
  const kit = await initializeCanvasKit();
  const surface = kit.MakeSurface(outputSize, outputSize);
  const canvas = surface.getCanvas();
  const paint = new kit.Paint();
  const outlinePaint = new kit.Paint();
  paint.setAntiAlias(true);
  outlinePaint.setAntiAlias(true);
  outlinePaint.setStyle(kit.PaintStyle.Stroke);
  outlinePaint.setStrokeWidth(1.15);
  outlinePaint.setColor(kit.Color(40, 34, 56, 0.28));

  for (const [, categoryId, artId] of covers) {
    const illustration = illustrations.get(artId);
    const directory = path.join(root, 'assets/pages', artId);
    const art = illustration ?? JSON.parse(fs.readFileSync(path.join(directory, 'page.json'), 'utf8'));
    canvas.clear(kit.WHITE);
    canvas.save();
    const scale = outputSize / (art.size ?? 300);
    canvas.scale(scale, scale);
    for (const region of art.regions) {
      const shape = kit.Path.MakeFromSVGString(region.path);
      if (!shape) throw new Error(`Invalid path in ${artId}/${region.id}`);
      shape.setFillType(kit.FillType.EvenOdd);
      paint.setColor(kit.parseColorString(art.palette[region.color - 1]));
      canvas.drawPath(shape, paint);
      if (illustration) canvas.drawPath(shape, outlinePaint);
      shape.delete();
    }
    if (!illustration) {
      const outline = kit.MakeImageFromEncoded(fs.readFileSync(path.join(directory, 'outline.png')));
      canvas.drawImageRect(
        outline,
        kit.XYWHRect(0, 0, outline.width(), outline.height()),
        kit.XYWHRect(0, 0, art.size, art.size),
        null,
      );
      outline.delete();
    }
    canvas.restore();
    surface.flush();
    const image = surface.makeImageSnapshot();
    const bytes = image.encodeToBytes(kit.ImageFormat.PNG);
    fs.writeFileSync(path.join(root, 'assets/images/categories', `${categoryId}.png`), bytes);
    image.delete();
  }
  console.log(`Rendered ${covers.length} category thumbnails.`);
  paint.delete();
  outlinePaint.delete();
  surface.delete();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
