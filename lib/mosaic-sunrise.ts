import type { ArtRegion, NumberArt } from './number-art';

type Point = readonly [number, number];

const regions: ArtRegion[] = [];

function addRegion(id: string, color: number, label: Point, path: string) {
  regions.push({ id, color, x: label[0], y: label[1], path });
}

function tile(id: string, color: number, points: readonly Point[], label?: Point) {
  const center: Point = label ?? [
    points.reduce((sum, [x]) => sum + x, 0) / points.length,
    points.reduce((sum, [, y]) => sum + y, 0) / points.length,
  ];
  addRegion(id, color, center, `M${points.map(([x, y]) => `${x} ${y}`).join('L')}Z`);
}

const sun: Point = [150, 92];
const radius = 38;
const skyFrame: readonly Point[] = [
  [16, 16], [65, 16], [110, 16], [150, 16], [190, 16], [235, 16], [284, 16],
  [284, 58], [284, 100], [284, 147], [284, 178], [244, 155], [220, 145],
  [184, 179], [135, 136], [85, 182], [52, 166], [16, 173], [16, 130], [16, 86], [16, 46],
];
const skyColors = [2, 3, 2, 4, 3, 2, 3, 4, 5, 4, 5, 6, 5, 6, 5, 6, 5, 4, 5, 4, 3];

function sunEdge([x, y]: Point): Point {
  const dx = x - sun[0];
  const dy = y - sun[1];
  const scale = radius / Math.hypot(dx, dy);
  return [sun[0] + dx * scale, sun[1] + dy * scale];
}

addRegion('frame', 1, [8, 150], 'M0 0H300V300H0Z');
skyFrame.forEach((outerStart, index) => {
  const outerEnd = skyFrame[(index + 1) % skyFrame.length];
  const innerStart = sunEdge(outerStart);
  const innerEnd = sunEdge(outerEnd);
  const midpoint: Point = [
    (outerStart[0] + outerEnd[0]) / 2,
    (outerStart[1] + outerEnd[1]) / 2,
  ];
  const innerMid = sunEdge(midpoint);
  addRegion(
    `sky-${index}`,
    skyColors[index],
    [(midpoint[0] + innerMid[0]) / 2, (midpoint[1] + innerMid[1]) / 2],
    `M${innerStart.join(' ')}L${outerStart.join(' ')}L${outerEnd.join(' ')}L${innerEnd.join(' ')}A${radius} ${radius} 0 0 0 ${innerStart.join(' ')}Z`,
  );
});

addRegion('sun', 7, sun, 'M112 92a38 38 0 1 0 76 0a38 38 0 1 0-76 0Z');

tile('foothill-west', 8, [[16, 173], [52, 166], [62, 205], [16, 221]]);
tile('ridge-west', 9, [[52, 166], [85, 182], [105, 213], [62, 205]]);
tile('summit-west', 10, [[85, 182], [135, 136], [136, 171], [105, 213]]);
tile('summit-east', 8, [[135, 136], [184, 179], [170, 194], [136, 171]]);
tile('slope-west', 11, [[105, 213], [136, 171], [170, 194], [155, 216]]);
tile('slope-east', 9, [[170, 194], [184, 179], [205, 213], [155, 216]]);
tile('peak-east', 10, [[184, 179], [220, 145], [226, 191], [205, 213]]);
tile('ridge-east', 11, [[220, 145], [244, 155], [249, 201], [226, 191]]);
tile('foothill-east', 8, [[244, 155], [284, 178], [284, 217], [249, 201]]);
tile('bank-east', 9, [[226, 191], [249, 201], [284, 217], [205, 213]]);

tile('water-west', 12, [[16, 221], [62, 205], [105, 213], [84, 238], [16, 247]]);
tile('water-center-west', 13, [[105, 213], [155, 216], [135, 234], [84, 238]]);
tile('reflection-top', 6, [[155, 216], [205, 213], [194, 236], [135, 234]]);
tile('water-east', 12, [[205, 213], [284, 217], [284, 245], [194, 236]]);
tile('shore-west', 11, [[16, 247], [84, 238], [67, 260], [16, 270]]);
tile('water-middle-west', 9, [[84, 238], [135, 234], [125, 259], [67, 260]]);
tile('reflection-middle', 5, [[135, 234], [194, 236], [188, 261], [125, 259]]);
tile('water-middle-east', 13, [[194, 236], [284, 245], [284, 268], [188, 261]]);
tile('shore-front', 8, [[16, 270], [67, 260], [85, 284], [16, 284]]);
tile('water-front-west', 12, [[67, 260], [125, 259], [138, 284], [85, 284]]);
tile('reflection-bottom', 4, [[125, 259], [188, 261], [214, 284], [138, 284]]);
tile('water-front-east', 9, [[188, 261], [284, 268], [284, 284], [214, 284]]);

export const MOSAIC_SUNRISE: NumberArt = {
  id: 'mosaic_sunrise',
  title: 'Mosaic Sunrise',
  category: 'Mosaic',
  palette: [
    '#30425B', '#663F68', '#9B5278', '#CA6580', '#EE8D79', '#F8BD87', '#FFDC87',
    '#314968', '#3E6B83', '#F6DDC1', '#4C8B8A', '#2B6479', '#65A6A0',
  ],
  regions,
};
