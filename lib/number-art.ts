import { INTEREST_ART, REDRAWN_ART } from './interest-art';
import { MOSAIC_SUNRISE } from './mosaic-sunrise';

export type ArtRegion = { id: string; path: string; color: number; x: number; y: number; r?: number };
export type NumberArt = { id: string; title: string; category: string; palette: string[]; regions: ArtRegion[]; size?: number; outline?: number; lineWidth?: number };
const ellipse = (x: number, y: number, rx: number, ry: number) => `M ${x-rx} ${y} a ${rx} ${ry} 0 1 0 ${rx*2} 0 a ${rx} ${ry} 0 1 0 ${-rx*2} 0`;
function scene(id: string, title: string, palette: string[]): NumberArt {
  const shapes: [string, number, number, number][] = [
    ['M0 0H300V165H0Z',1,35,45], [ellipse(230,55,25,25),2,230,55],
    ['M0 165L85 62L180 165Z',3,85,125], ['M105 165L205 85L300 165Z',4,205,135],
    ['M0 165Q80 140 160 170T300 165V300H0Z',5,25,200],
    ['M150 165C220 190 215 213 165 235C135 253 150 280 230 300H95C50 272 75 250 125 228C175 208 175 190 130 165Z',6,125,260],
    ['M0 240Q55 190 105 240L75 300H0Z',7,35,265],
    ['M225 240Q275 195 300 230V300H230L205 270Z',7,268,270],
    ['M47 184V120L25 150H36L18 171H37L25 184Z',8,38,173],
    ['M268 194V125L245 156H256L238 178H257L245 194Z',8,260,180],
    [ellipse(65,42,22,9),9,65,42], [ellipse(135,30,28,10),9,135,30],
  ];
  return {id,title,category:'Nature',palette,regions:shapes.map(([path,color,x,y],i)=>({id:`r${i}`,path,color,x,y}))};
}
function bloom(id: string, title: string, palette: string[]): NumberArt {
  const regions: ArtRegion[] = [{id:'bg',path:'M0 0H300V300H0Z',color:1,x:30,y:35},
    {id:'stem',path:'M145 130H155V280H145Z',color:2,x:150,y:248},
    {id:'leaf1',path:'M145 240Q65 245 60 185Q125 178 145 240Z',color:3,x:100,y:213},
    {id:'leaf2',path:'M155 218Q225 225 240 163Q175 158 155 218Z',color:4,x:204,y:190}];
  for(let i=0;i<8;i++) {
    const a=i*Math.PI/4; const x=150+Math.cos(a)*53; const y=105+Math.sin(a)*53;
    regions.push({id:`petal${i}`,path:ellipse(x,y,26,26),color:i%2?5:6,x,y});
  }
  regions.push({id:'center',path:ellipse(150,105,31,31),color:7,x:150,y:105});
  regions.push({id:'pot',path:'M105 261H195L182 295H118Z',color:8,x:150,y:279});
  return {id,title,category:'Flowers',palette,regions};
}
const VECTOR_ART: NumberArt[] = [
];
// New picture pages first (they are the Home content), the original vector scenes after them.
// eslint-disable-next-line import/first
import { PAGE_ART } from './page-art';
const replacements: Readonly<Record<string, NumberArt>> = {
  ...REDRAWN_ART,
  mosaic_sun: REDRAWN_ART.mosaic_sunrise,
};
export const ARCHIVED_ART = [
  ...INTEREST_ART.filter((art) => art.id in replacements),
  MOSAIC_SUNRISE,
];
export const NUMBER_ART: NumberArt[] = [
  ...PAGE_ART,
  ...INTEREST_ART.map((art) => replacements[art.id] ?? art),
  ...VECTOR_ART,
];
export const getNumberArt = (id?: string) =>
  NUMBER_ART.find((art) => art.id === id) ?? ARCHIVED_ART.find((art) => art.id === id);
