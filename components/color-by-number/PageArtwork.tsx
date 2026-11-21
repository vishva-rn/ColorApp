import React, { useEffect, useId, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Defs, G, Path, Text as SvgText } from 'react-native-svg';
import type { ArtworkProps, RegionPressProps } from './Artwork';
import PaletteGradient from './PaletteGradient';
import RegionFill from './RegionFill';


/**
 * Animated hint: a hand glides in, taps with a ripple, glides away, and repeats while the hint is active.
 * The fingertip (measured from the icon font: 57.4% across the ink, 9% below the top of the glyph box)
 * lands exactly on the region's label point.
 */
const HAND_TIP_X = 0.543, HAND_TIP_Y = 0.09;     // fingertip position as a fraction of the icon box
function HintHand({cx, cy, box}: {cx: number; cy: number; box: number}) {
  const H = Math.max(44, box * 0.17);
  const approach = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(0)).current;
  const ripple = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    approach.setValue(0); press.setValue(0); ripple.setValue(0);
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(approach, {toValue: 1, duration: 550, easing: Easing.out(Easing.cubic), useNativeDriver: true}),
      Animated.timing(press, {toValue: 1, duration: 140, useNativeDriver: true}),
      Animated.parallel([
        Animated.timing(press, {toValue: 0, duration: 160, useNativeDriver: true}),
        Animated.timing(ripple, {toValue: 1, duration: 520, easing: Easing.out(Easing.quad), useNativeDriver: true}),
      ]),
      Animated.delay(250),
      Animated.timing(approach, {toValue: 0, duration: 350, useNativeDriver: true}),
      Animated.timing(ripple, {toValue: 0, duration: 0, useNativeDriver: true}),
      Animated.delay(150),
    ]));
    loop.start();
    return () => loop.stop();
  }, [cx, cy, approach, press, ripple]);
  const R = H * 0.75;
  return <View pointerEvents="none" style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%'}}>
    <Animated.View style={{position: 'absolute', left: cx - R / 2, top: cy - R / 2, width: R, height: R, borderRadius: R / 2,
      borderWidth: 3, borderColor: '#6C63C9', backgroundColor: 'rgba(108,99,201,0.18)',
      opacity: ripple.interpolate({inputRange: [0, 0.2, 1], outputRange: [0, 0.7, 0]}),
      transform: [{scale: ripple.interpolate({inputRange: [0, 1], outputRange: [0.3, 1.6]})}]}}/>
    <Animated.View style={{position: 'absolute', left: cx - HAND_TIP_X * H, top: cy - HAND_TIP_Y * H, width: H, height: H,
      opacity: approach.interpolate({inputRange: [0, 0.3, 1], outputRange: [0, 1, 1]}),
      transform: [
        {translateY: approach.interpolate({inputRange: [0, 1], outputRange: [H * 0.9, 0]})},
        {scale: press.interpolate({inputRange: [0, 1], outputRange: [1, 0.84]})},
      ]}}>
      <MaterialCommunityIcons name="hand-pointing-up" size={H} color="#3B3560"
        style={{textShadowColor: '#FFFFFF', textShadowRadius: 4, textShadowOffset: {width: 0, height: 0}}}/>
    </Animated.View>
  </View>;
}

/**
 * Draws an AI-generated colour-by-number page.
 *  - each region is a vector shape (even-odd, so holes work) coloured from the palette
 *  - the picture's own black line art is laid on top as an image, so the artwork keeps its hand-drawn look
 *  - the number sits at the deepest point inside each region, sized so it never leaves the region
 * Same props as <Artwork/>, so the screens that use it need no new logic.
 */
export default function PageArtwork({art, filled=[], preview=false, outlineOnly=false, hideNumbers=false, selected, hint, onRegion, reveals, onRevealEnd, onOutlineSettled}: ArtworkProps) {
  const size = art.size ?? 1024;
  const gradientPrefix = `page-${useId().replace(/[^\w-]/g, '')}`;
  const [box, setBox] = useState(0);
  const [outlineFailed, setOutlineFailed] = useState(false);
  const [outlineDisplayed, setOutlineDisplayed] = useState(false);
  const painted = new Set(filled);
  const hintRegion = hint ? art.regions.find(r => r.id === hint) : undefined;
  const outline = art.outline && !outlineFailed ? (
    <Image
      source={art.outline}
      cachePolicy="memory"
      contentFit="fill"
      onLoad={onOutlineSettled}
      onDisplay={outlineOnly ? () => setOutlineDisplayed(true) : undefined}
      onError={() => {
        setOutlineFailed(true);
        onOutlineSettled?.();
      }}
      style={{ width: '100%', height: '100%' }}
    />
  ) : null;
  // Use the region boundaries until the outline image is visible.
  if (outlineOnly) return <View pointerEvents="none" style={{width:'100%',height:'100%',backgroundColor:'#FFFFFF'}}>
    {(!outlineDisplayed || !outline) && (
      <Svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`}>
        {art.regions.map((region) => (
          <Path key={region.id} d={region.path} fill="none" stroke="#332D39" strokeWidth={size / 400} />
        ))}
      </Svg>
    )}
    {outline && (
      <View style={{position:'absolute',left:0,top:0,width:'100%',height:'100%'}}>{outline}</View>
    )}
  </View>;
  return <View onLayout={e=>setBox(e.nativeEvent.layout.width)} style={{width:'100%',height:'100%',backgroundColor:'#FFFFFF'}}>
    <Svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`}>
      {art.gradients && <Defs>{art.gradients.map((gradient, index) => (
        <PaletteGradient key={index} id={`${gradientPrefix}-${index}`} color={art.palette[index]} gradient={gradient} />
      ))}</Defs>}
      {art.regions.map(region=>{
        const reveal = reveals?.[region.id];
        const done = preview || (painted.has(region.id) && !reveal);
        const index = region.color - 1;
        const gradientId = art.gradients?.[index] ? `${gradientPrefix}-${index}` : undefined;
        const color = art.palette[index];
        const fill = done ? (gradientId ? `url(#${gradientId})` : color)
          : hint===region.id ? '#F9DEA5'
          : selected===region.color ? '#DCE0F5' : '#FFFFFF';
        return <G<RegionPressProps> key={region.id} onPress={onRegion ? (event) => onRegion(region.id, event) : undefined}>
          <Path d={region.path} fill={fill} fillRule="evenodd" stroke={outlineFailed ? '#332D39' : undefined} strokeWidth={size / 400} />
          {reveal && <RegionFill region={region} color={color} gradientId={gradientId} size={size} reveal={reveal} onEnd={onRevealEnd} />}
        </G>;
      })}
    </Svg>
    {outline && <View pointerEvents="none" style={{position:'absolute',left:0,top:0,width:'100%',height:'100%'}}>
      {outline}
    </View>}
    {!preview && !hideNumbers && <View pointerEvents="none" style={{position:'absolute',left:0,top:0,width:'100%',height:'100%'}}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`}>
        {art.regions.filter(r=>!painted.has(r.id) && (r.r ?? 0)>=8).map(region=>{
          const fs = Math.max(14, Math.min(34, (region.r ?? 10) * 1.15));
          return <SvgText key={region.id} x={region.x} y={region.y} dy={fs*0.35} textAnchor="middle"
            fontSize={fs} fontWeight="600" fill={region.color===selected ? '#3F37A0' : '#6F6C78'}>{region.color}</SvgText>;
        })}
      </Svg>
    </View>}
    {hintRegion && box>0 && <HintHand cx={hintRegion.x/size*box} cy={hintRegion.y/size*box} box={box}/>}
  </View>;
}
