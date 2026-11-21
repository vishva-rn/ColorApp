import type { ArtRegion, NumberArt } from './number-art';

type Shape = [color: number, x: number, y: number, path: string];

const oval = (color: number, x: number, y: number, rx: number, ry = rx): Shape =>
  [color, x, y, `M${x - rx} ${y}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`];

const box = (color: number, x: number, y: number, width: number, height: number): Shape =>
  [color, x + width / 2, y + height / 2, `M${x} ${y}h${width}v${height}h-${width}Z`];

// Keep number labels within the visible part of overlapping shapes.
const labelPositions: Record<string, Record<number, [number, number]>> = {
  coral_dress: { 3: [150, 88] },
  evening_pearls: { 2: [149, 266], 3: [118, 201] },
  love_letters: { 1: [149, 261], 4: [87, 157], 5: [77, 208], 6: [223, 208], 7: [145, 223] },
  mosaic_sun: { 0: [14, 16], 8: [71, 96], 9: [229, 96], 12: [73, 200], 13: [227, 200], 21: [133, 86], 22: [202, 145], 23: [194, 170], 24: [175, 189], 25: [150, 197], 26: [125, 189], 27: [106, 170], 28: [97, 145], 29: [106, 120], 30: [125, 101], 31: [150, 92], 32: [175, 101], 33: [194, 120], 34: [130, 123] },
  bright_message: { 1: [149, 220], 6: [182, 152], 7: [214, 112] },
  studio_still_life: { 1: [177, 111] },
  kite_afternoon: { 4: [170, 163], 10: [135, 216] },
  family_picnic: { 7: [91, 111], 8: [192, 102], 12: [147, 166], 14: [213, 267] },
  soccer_sunset: { 3: [34, 154], 9: [143, 222] },
  sunny_market: { 2: [149, 88], 9: [81, 128], 11: [175, 151] },
  festival_lamp: { 1: [138, 115], 2: [99, 247], 3: [142, 228], 5: [160, 125] },
  knitting_corner: { 1: [145, 104], 3: [151, 132], 4: [174, 108], 5: [101, 165], 7: [134, 171], 9: [178, 172], 10: [167, 222], 11: [151, 262] },
  cosmic_comic: { 2: [124, 215], 3: [238, 197] },
};

function picture(id: string, title: string, category: string, palette: string[], shapes: Shape[]): NumberArt {
  const regions: ArtRegion[] = [box(1, 0, 0, 300, 300), ...shapes].map(([color, x, y, path], index) => ({
    id: `region-${index}`,
    x: labelPositions[id]?.[index]?.[0] ?? (index === 0 ? 19 : x),
    y: labelPositions[id]?.[index]?.[1] ?? (index === 0 ? 19 : y),
    path,
    color,
  }));

  return { id, title, category, palette, regions };
}

function star(color: number, x: number, y: number, radius: number): Shape {
  return [color, x, y, `M${x} ${y - radius}Q${x + 2} ${y - 2} ${x + radius} ${y}Q${x + 2} ${y + 2} ${x} ${y + radius}Q${x - 2} ${y + 2} ${x - radius} ${y}Q${x - 2} ${y - 2} ${x} ${y - radius}Z`];
}

function heart(color: number, x: number, y: number, size: number): Shape {
  return [color, x, y, `M${x} ${y - size * 0.2}c${size * 0.65} -${size} ${size * 1.55} ${size * 0.05} 0 ${size}c-${size * 1.55} -${size * 0.95} -${size * 0.65} -${size * 2} 0 -${size}Z`];
}

export const INTEREST_ART: NumberArt[] = [
  picture('coral_dress', 'Coral Runway', 'Fashion',
    ['#EDF0FA', '#C5CEE8', '#F28186', '#B95074', '#FFBE75', '#4B3B56'], [
      [2, 55, 145, 'M30 237V80a120 120 0 0 1 240 0v157Z'],
      [6, 39, 263, 'M22 249H278L260 288H40Z'],
      [5, 150, 70, 'M148 82V70a12 12 0 1 1 12-12h-6a6 6 0 1 0-6 6h6v18l50 30H96Z'],
      [3, 150, 130, 'M111 93q39 31 78 0l-16 57h-46Z'],
      [4, 150, 157, 'M127 146h46l4 19h-54Z'],
      [3, 98, 218, 'M123 165h54q26 33 62 79-27 15-56 7-33 20-66 0-27 8-56-7Z'],
      [4, 174, 225, 'M153 165h13q8 36 33 87-20 8-37 5Z'],
      star(5, 70, 109, 17), star(5, 221, 130, 22), star(3, 234, 87, 12),
    ]),
  picture('evening_pearls', 'Evening Pearls', 'Classy',
    ['#2F405E', '#3E5976', '#B87052', '#F1B969', '#FCE7CC', '#699A8B'], [
      [2, 41, 170, 'M26 260V132a124 124 0 0 1 248 0v128Z'],
      oval(3, 150, 253, 115, 29),
      [6, 128, 184, 'M80 160Q150 115 220 160l-17 74q-53 38-106 0Z'],
      [4, 150, 169, 'M80 160Q150 124 220 160l-70 53Z'],
      oval(5, 150, 193, 14, 11),
      ...Array.from({ length: 9 }, (_, i) => {
        const angle = i * Math.PI / 8;
        return oval(i % 2 ? 4 : 5, 150 + Math.cos(angle) * 72, 71 + Math.sin(angle) * 54, 9);
      }),
      star(4, 53, 91, 19), star(5, 235, 56, 18), star(5, 246, 146, 12),
    ]),
  picture('love_letters', 'Love Letters', 'Love',
    ['#F6D4D6', '#D97580', '#FF997B', '#FCE8BA', '#9971A2', '#FFF2E5'], [
      oval(5, 150, 250, 121, 23), heart(2, 150, 81, 55),
      box(6, 103, 90, 94, 97),
      [4, 56, 204, 'M35 145h230v92q0 13-13 13H48q-13 0-13-13Z'],
      [3, 84, 217, 'M37 146l116 54-110 47q-6-5-6-15Z'],
      [3, 217, 215, 'M263 146l-116 54 110 47q6-5 6-15Z'],
      [6, 150, 218, 'M39 245l111-72 111 72q-4 5-13 5H52q-9 0-13-5Z'],
      heart(2, 150, 195, 24), star(6, 57, 67, 20), star(6, 237, 95, 24), star(3, 217, 46, 15),
    ]),
  picture('mosaic_sun', 'Mosaic Sunrise', 'Mosaic',
    ['#284B6B', '#397FA4', '#50AAA6', '#FDCC79', '#F58D63', '#D57A89', '#EEE8BA'], [
      ...Array.from({ length: 24 }, (_, index) => index)
        .filter((index) => ![8, 9, 14, 15].includes(index))
        .map((index) => {
          const column = index % 6;
          const row = Math.floor(index / 6);
          return box(2 + (column + 2 * row) % 5, 15 + column * 46, 18 + row * 68, 40, 61);
        }),
      oval(7, 150, 145, 85),
      ...Array.from({ length: 12 }, (_, index): Shape => {
        const a = index * Math.PI / 6;
        const point = (radius: number, delta = 0) => `${150 + Math.cos(a + delta) * radius} ${145 + Math.sin(a + delta) * radius}`;
        return [4 + index % 3, 150 + Math.cos(a) * 62, 145 + Math.sin(a) * 62,
          `M${point(42, -0.21)}L${point(79)}L${point(42, 0.21)}Z`];
      }),
      oval(3, 150, 145, 38), oval(4, 150, 145, 23),
    ]),
  picture('bright_message', 'Hello, Sunshine', 'Messages',
    ['#7973AC', '#AFA5DE', '#4A466A', '#FFF2D0', '#FF9E8A', '#F9CF6C'], [
      box(2, 21, 28, 258, 244),
      [3, 150, 77, 'M37 93q0-29 29-29h168q29 0 29 29v85q0 29-29 29h-93l-42 36 8-36H66q-29 0-29-29Z'],
      [4, 67, 133, 'M63 108h9v21h14v-21h9v52h-9v-22H72v22h-9Z'],
      [6, 108, 133, 'M104 108h28v9h-19v12h16v9h-16v13h19v9h-28Z'],
      [5, 144, 133, 'M140 108h9v43h20v9h-29Z'],
      [4, 182, 133, 'M177 108h9v43h18v9h-27Z'],
      [5, 214, 112, 'M209 120q0-12 14-12t14 12v28q0 12-14 12t-14-12Zm9 2v24q0 5 5 5t5-5v-24q0-5-5-5t-5 5Z'],
      box(6, 245, 108, 9, 36), oval(6, 249.5, 155, 5.5),
      star(5, 107, 42, 13), star(4, 250, 236, 19), star(6, 51, 234, 15),
    ]),
  picture('studio_still_life', 'Studio Still Life', 'Art',
    ['#E7B69A', '#F3CBB2', '#A36F8F', '#C57553', '#F5BB61', '#86A17A', '#563950'], [
      oval(2, 152, 111, 105, 96), box(3, 0, 220, 300, 80),
      [7, 155, 124, 'M143 91h18l17 99h-46Z'],
      [4, 135, 196, 'M116 174h68l21 43q-5 34-54 34-48 0-55-34Z'],
      oval(5, 76, 222, 22, 24), oval(6, 246, 226, 32, 18),
      [6, 192, 140, 'M166 164q1-52 61-53-8 42-61 53Z'],
      [6, 112, 126, 'M146 156q-4-61-62-74 2 48 62 74Z'],
      [5, 157, 51, 'M151 105q-35-31-20-65 10 9 16 12 3-18 15-25 8 11 10 24l19-9q9 36-29 64Z'],
      oval(7, 150, 173, 32, 7),
    ]),
  picture('kite_afternoon', 'Kite Afternoon', 'Kids',
    ['#A5D8EB', '#F8F0D8', '#F78F78', '#E7B953', '#79BAA2', '#5874A3', '#B58BC3'], [
      oval(2, 52, 64, 32, 12), oval(2, 233, 107, 42, 13),
      [5, 35, 247, 'M0 224Q81 188 171 229T300 216v84H0Z'],
      [6, 171, 163, 'M156 129q39 23 3 51-28 22 13 62l-5 6q-47-44-13-73 27-22-2-40Z'],
      [3, 132, 79, 'M154 27l-47 55 47 11Z'],
      [4, 177, 78, 'M154 27l53 55-53 11Z'],
      [7, 134, 107, 'M107 82l47 55V93Z'],
      [5, 174, 108, 'M207 82l-53 55V93Z'],
      [3, 183, 171, 'M171 170l31-13-7 22-24-5Z'],
      [4, 145, 218, 'M148 213l-27-9 8 22 22-8Z'],
      star(4, 54, 265, 19), star(7, 236, 252, 22), star(2, 260, 193, 16),
    ]),
  picture('family_picnic', 'Family Picnic', 'Family',
    ['#B6D7E3', '#FFF0C2', '#89AF79', '#526C75', '#BA785C', '#E7A778', '#F78F87', '#C37582'], [
      oval(2, 242, 55, 36), oval(2, 63, 52, 27, 11),
      [3, 28, 233, 'M0 190Q102 129 188 190T300 178V300H0Z'],
      [8, 150, 271, 'M39 232h222l26 54H13Z'],
      [4, 98, 199, 'M52 228v-29q0-33 40-33t40 33v29Z'],
      [7, 201, 192, 'M159 228v-39q0-33 41-33t41 33v39Z'],
      oval(4, 92, 135, 31, 38), oval(8, 200, 123, 32, 41),
      oval(5, 92, 149, 25, 26), oval(6, 200, 139, 26, 26),
      [2, 148, 222, 'M117 247v-21a32 32 0 0 1 64 0v21Z'],
      oval(4, 149, 182, 24, 26), oval(6, 149, 192, 19, 18),
      oval(2, 226, 266, 23, 9), oval(7, 226, 262, 12, 6),
    ]),
  picture('soccer_sunset', 'Sunset Soccer', 'Sports',
    ['#F0AC87', '#F7D887', '#789E8C', '#527B72', '#E4EFE0', '#475470', '#E8767D'], [
      oval(2, 205, 62, 43), oval(5, 70, 75, 38, 10),
      [4, 36, 153, 'M0 136Q68 116 155 144T300 130V300H0Z'],
      [3, 35, 212, 'M0 189q150-35 300 0v111H0Z'],
      [4, 47, 263, 'M0 259q151-55 300 0v41H0Z'],
      box(5, 36, 102, 90, 8), box(5, 36, 110, 8, 43), box(5, 118, 110, 8, 43),
      oval(5, 163, 202, 60), [6, 163, 200, 'M163 174l24 17-9 29h-30l-9-29Z'],
      [6, 127, 165, 'M120 160q10-11 27-16l3 13-24 20Z'],
      [6, 204, 173, 'M197 154q17 11 23 31l-15 5-14-25Z'],
      [7, 157, 245, 'M139 246l10-15h22l15 20q-23 16-47-5Z'],
    ]),
  picture('sunny_market', 'Sunny Market', 'Black Communities',
    ['#F7CD83', '#F18A79', '#427C81', '#613D49', '#9B5B41', '#C78656', '#D4DD9C', '#FFF0BD'], [
      [2, 20, 249, 'M0 229q154-40 300 0v71H0Z'],
      box(7, 21, 44, 258, 64),
      ...[24, 88, 152, 216].map((x, index) => box(index % 2 ? 7 : 2, x, 45, 60, 42)),
      [3, 68, 244, 'M39 274v-48q0-33 54-33t54 33v48Z'],
      [7, 234, 242, 'M151 274v-48q0-33 54-33t54 33v48Z'],
      oval(4, 93, 155, 38, 45), oval(5, 93, 169, 28, 32),
      oval(4, 205, 152, 40, 43), oval(6, 205, 170, 29, 31),
      [3, 204, 130, 'M166 149q18-59 78-29l-3 26q-43-20-75 3Z'],
      oval(8, 116, 185, 5, 8), oval(8, 229, 184, 5, 8),
      oval(2, 98, 148, 32, 7), star(8, 146, 118, 16),
    ]),
  picture('festival_lamp', 'Festival of Lights', 'India',
    ['#34295A', '#63548F', '#A85772', '#DC765B', '#F5AF54', '#FFF0A4', '#79B09C'], [
      oval(2, 150, 129, 102, 104), oval(3, 150, 235, 113, 28),
      [4, 150, 216, 'M60 190q90-30 180 0-27 57-90 57t-90-57Z'],
      oval(5, 150, 186, 88, 17),
      [5, 148, 123, 'M151 69q10 24 30 52 30 51-31 57-50-5-34-40 9-15 17-24-1 15 9 21 17-27 9-66Z'],
      [6, 153, 152, 'M153 126q-1 19 10 25 14 18-12 24-25-3-14-22Z'],
      ...[94, 122, 150, 178, 206].map((x) => oval(7, x, x === 94 || x === 206 ? 208 : 220, 7)),
      star(6, 50, 106, 24), star(5, 247, 79, 26), star(7, 227, 127, 16),
    ]),
  picture('knitting_corner', 'Knitting Corner', 'Hobbies',
    ['#DFD1ED', '#F5E8F8', '#A784C9', '#E38C84', '#FFC98A', '#76989A', '#526685'], [
      oval(2, 165, 111, 106, 93), oval(3, 150, 250, 110, 29),
      [7, 148, 112, 'M111 219L183 40l9 4-73 179Z'],
      [6, 181, 108, 'M219 218L142 50l9-4 76 168Z'],
      oval(3, 106, 186, 57), oval(4, 199, 196, 55),
      [6, 95, 165, 'M52 177q49 12 99-24l5 11q-50 38-104 23Z'],
      [2, 104, 211, 'M52 194q55 23 108-10l-1 12q-49 33-104 9Z'],
      [5, 204, 187, 'M146 193q44-51 97-31l7 12q-49-26-104 30Z'],
      [7, 205, 222, 'M155 222q47-28 97-26l-2 11q-47-4-89 25Z'],
      [4, 161, 255, 'M201 246q-40 37-65 13-17-12-37 13l-8-4q22-36 50-17 21 18 49-7Z'],
      star(5, 62, 72, 21), star(4, 249, 108, 23),
    ]),
  picture('cosmic_comic', 'Cosmic Comic', 'Comics',
    ['#332F5A', '#645D91', '#F3A3AC', '#FCCB74', '#E8787B', '#81C3C0', '#F8F2DD'], [
      [2, 96, 81, 'M22 26h256l-13 103H22Z'],
      [5, 103, 202, 'M22 141h153l-23 135H22Z'],
      [6, 229, 202, 'M186 141h92v135H164Z'],
      oval(4, 208, 72, 40), oval(3, 222, 59, 10), oval(3, 187, 83, 13),
      [2, 96, 204, 'M52 223l28-31q10-25 54-28-1 44-30 53l-34 28Z'],
      oval(6, 108, 188, 10), star(7, 67, 72, 24), star(7, 224, 220, 34), star(4, 248, 171, 15),
    ]),
];
