import { useId } from 'react';
import type { GestureResponderEvent } from 'react-native';
import Svg, { Defs, G, Path, Text as SvgText } from 'react-native-svg';
import { type NumberArt } from '@/lib/number-art';
import PageArtwork from './PageArtwork';
import PaletteGradient from './PaletteGradient';
import RegionFill, { type FillRevealEnd, type FillReveals } from './RegionFill';

export type ArtworkProps = {
  art: NumberArt;
  filled?: string[];
  preview?: boolean;
  outlineOnly?: boolean;
  hideNumbers?: boolean;
  selected?: number;
  hint?: string;
  onRegion?: (id: string, event: GestureResponderEvent) => void;
  reveals?: FillReveals;
  onRevealEnd?: FillRevealEnd;
  onOutlineSettled?: () => void;
};
export type RegionPressProps = {
  onPress?: (event: GestureResponderEvent) => void;
};

export default function Artwork({art, filled=[], preview=false, outlineOnly=false, hideNumbers=false, selected, hint, onRegion, reveals, onRevealEnd, onOutlineSettled}: ArtworkProps) {
  const gradientPrefix = `art-${useId().replace(/[^\w-]/g, '')}`;
  if (art.outline != null) return <PageArtwork key={art.outline.uri} art={art} filled={filled} preview={preview} outlineOnly={outlineOnly} hideNumbers={hideNumbers} selected={selected} hint={hint} onRegion={onRegion} reveals={reveals} onRevealEnd={onRevealEnd} onOutlineSettled={onOutlineSettled}/>;
  const lineColor = art.lineWidth === undefined ? '#A4A3AA' : '#332D39';
  const stroke = preview && !art.gradients ? '#FFFFFF70' : lineColor;
  const strokeWidth = preview && !art.gradients ? 0.7 : art.lineWidth ?? 0.85;
  const size = art.size ?? 300;
  const painted = new Set(filled);
  return <Svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`}>
    {art.gradients && <Defs>{art.gradients.map((gradient, index) => (
      <PaletteGradient key={index} id={`${gradientPrefix}-${index}`} color={art.palette[index]} gradient={gradient} />
    ))}</Defs>}
    {art.regions.map(region=>{
      const reveal = reveals?.[region.id];
      const done = preview || (painted.has(region.id) && !reveal);
      const colorIndex = region.color - 1;
      const gradientId = art.gradients?.[colorIndex] ? `${gradientPrefix}-${colorIndex}` : undefined;
      const fill = gradientId ? `url(#${gradientId})` : art.palette[colorIndex];
      return <G<RegionPressProps> key={region.id} onPress={onRegion ? (event) => onRegion(region.id, event) : undefined}>
        <Path d={region.path} fill={done ? fill : hint===region.id ? '#F9DEA5' : selected===region.color ? '#E4E6F2' : '#FFFFFF'} stroke={stroke} strokeWidth={strokeWidth}/>
        {reveal && <>
          <RegionFill region={region} color={art.palette[colorIndex]} gradientId={gradientId} size={size} reveal={reveal} onEnd={onRevealEnd} />
          <Path d={region.path} fill="none" stroke={stroke} strokeWidth={strokeWidth} />
        </>}
      </G>;
    })}
    {art.details && <G pointerEvents="none" fill="none" stroke={lineColor} strokeWidth={0.85} strokeLinecap="round" opacity={0.8}>
      {art.details.map((detail, index) => <Path key={index} d={detail} />)}
    </G>}
    {!preview && !outlineOnly && !hideNumbers && art.regions.filter(r=>!painted.has(r.id)).map(region=><SvgText key={region.id} x={region.x} y={region.y} dy={3.5} textAnchor="middle" fontSize={art.gradients ? 8 : 10} fontWeight="500" fill={region.color===selected?'#514991':'#8B8994'} onPress={onRegion ? (event) => onRegion(region.id, event) : undefined}>{region.color}</SvgText>)}
  </Svg>;
}
