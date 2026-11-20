import React from 'react';
import type { GestureResponderEvent } from 'react-native';
import Svg, { G, Path, Text as SvgText } from 'react-native-svg';
import { type NumberArt } from '@/lib/number-art';
import PageArtwork from './PageArtwork';
import RegionFill, { type FillRevealEnd, type FillReveals } from './RegionFill';

export type ArtworkProps = {
  art: NumberArt;
  filled?: string[];
  preview?: boolean;
  outlineOnly?: boolean;
  selected?: number;
  hint?: string;
  onRegion?: (id: string, event: GestureResponderEvent) => void;
  reveals?: FillReveals;
  onRevealEnd?: FillRevealEnd;
};
export type RegionPressProps = {
  onPress?: (event: GestureResponderEvent) => void;
};

export default function Artwork({art, filled=[], preview=false, outlineOnly=false, selected, hint, onRegion, reveals, onRevealEnd}: ArtworkProps) {
  if (art.outline != null) return <PageArtwork art={art} filled={filled} preview={preview} outlineOnly={outlineOnly} selected={selected} hint={hint} onRegion={onRegion} reveals={reveals} onRevealEnd={onRevealEnd}/>;
  const lineColor = art.lineWidth === undefined ? '#A4A3AA' : '#332D39';
  return <Svg width="100%" height="100%" viewBox="0 0 300 300">
    {art.regions.map(region=>{
      const reveal = reveals?.[region.id];
      const done = preview || (filled.includes(region.id) && !reveal);
      return <G<RegionPressProps> key={region.id} onPress={onRegion ? (event) => onRegion(region.id, event) : undefined}>
        <Path d={region.path} fill={done ? art.palette[region.color-1] : hint===region.id ? '#F9DEA5' : selected===region.color ? '#E4E6F2' : '#FFFFFF'} stroke={preview ? '#FFFFFF70' : lineColor} strokeWidth={preview ? 0.7 : art.lineWidth ?? 0.85}/>
        {reveal && <>
          <RegionFill region={region} color={art.palette[region.color - 1]} size={300} reveal={reveal} onEnd={onRevealEnd} />
          <Path d={region.path} fill="none" stroke={lineColor} strokeWidth={art.lineWidth ?? 0.85} />
        </>}
      </G>;
    })}
    {!preview && !outlineOnly && art.regions.filter(r=>!filled.includes(r.id)).map(region=><SvgText key={region.id} x={region.x} y={region.y} dy={3.5} textAnchor="middle" fontSize={10} fontWeight="500" fill={region.color===selected?'#514991':'#8B8994'} onPress={onRegion ? (event) => onRegion(region.id, event) : undefined}>{region.color}</SvgText>)}
  </Svg>;
}
