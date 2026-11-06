import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Artwork from '@/components/color-by-number/Artwork';
import { getNumberArt, type NumberArt } from '@/lib/number-art';
import { loadProgress, saveProgress } from '@/lib/number-progress';
export default function Drawing() {
  const {artId}=useLocalSearchParams<{artId?:string}>();
  const art=getNumberArt(artId);
  const router=useRouter();
  if(!art) return <SafeAreaView style={s.screen}><View style={s.message}><Text style={s.title}>Choose your next picture</Text><Pressable onPress={()=>router.replace('/(tabs)')} style={s.button}><Text style={s.white}>Back to gallery</Text></Pressable></View></SafeAreaView>;
  return <Coloring key={art.id} art={art}/>;
}
function Coloring({art}: {art:NumberArt}) {
  const router=useRouter();
  const [filled,setFilled]=useState(()=>{
    const ids=loadProgress()[art.id]??[];
    return art.regions.filter(r=>ids.includes(r.id)).map(r=>r.id);
  });
  const [selected,setSelected]=useState(()=>art.regions.find(r=>!filled.includes(r.id))?.color??1);
  const [hint,setHint]=useState<string>();
  const [zoom,setZoom]=useState(1);
  const [notice,setNotice]=useState('');
  const [saveError,setSaveError]=useState(false);
  const complete=filled.length===art.regions.length;
  useEffect(()=>{ if(!notice) return; const timer=setTimeout(()=>setNotice(''),2200); return ()=>clearTimeout(timer); },[notice]);
  const persist=(next:string[])=>{
    try { saveProgress(art.id,next); setSaveError(false); }
    catch { setSaveError(true); }
  };
  const paint=(id:string)=>{
    const region=art.regions.find(r=>r.id===id);
    if(!region || filled.includes(id)) return;
    if(region.color!==selected) {setNotice(`Choose color ${region.color} for this area`); return;}
    const next=[...filled,id];
    setFilled(next); persist(next); setHint(undefined);
    void Haptics.selectionAsync().catch(()=>{});
    if(!art.regions.some(r=>r.color===selected&&!next.includes(r.id))) {
      const nextColor=art.regions.find(r=>!next.includes(r.id))?.color;
      if(nextColor) setSelected(nextColor);
    }
  };
  const reset=()=>Alert.alert('Start this picture again?','Your saved colors for this picture will be cleared.',[{text:'Keep coloring',style:'cancel'},{text:'Start again',style:'destructive',onPress:()=>{setFilled([]);setSelected(1);setHint(undefined);persist([]);}}]);
  return <SafeAreaView style={s.screen}>
    <View style={s.header}><Pressable accessibilityLabel="Back to gallery" onPress={()=>router.back()} style={s.icon}><Ionicons name="chevron-back" size={23} color="#625C72"/></Pressable><View style={{alignItems:'center'}}><Text style={s.title}>{art.title}</Text><Text style={s.meta}>{complete?'A little masterpiece, made by you':`${filled.length} of ${art.regions.length} areas colored`}</Text></View><Pressable accessibilityLabel="Restart picture" onPress={reset} style={s.icon}><Ionicons name="refresh-outline" size={20} color="#625C72"/></Pressable></View>
    <View style={s.track}><View style={[s.fill,{width:`${filled.length/art.regions.length*100}%`}]}/></View>
    <View style={s.canvasArea}>
      <ScrollView style={{flex:1}} contentContainerStyle={{flexGrow:1,justifyContent:'center'}} maximumZoomScale={3} minimumZoomScale={1} bouncesZoom centerContent>
        <ScrollView horizontal contentContainerStyle={{flexGrow:1,justifyContent:'center'}}><View style={{width:320*zoom,height:320*zoom,margin:12,backgroundColor:'white',borderRadius:10,overflow:'hidden'}}><Artwork art={art} filled={filled} selected={complete?undefined:selected} hint={hint} onRegion={paint}/></View></ScrollView>
      </ScrollView>
      <View style={s.tools}><Pressable accessibilityLabel="Zoom out" onPress={()=>setZoom(v=>Math.max(0.8,v-0.4))} style={s.icon}><Ionicons name="remove" size={21} color="#625C72"/></Pressable><Text style={s.meta}>{Math.round(zoom*100)}%</Text><Pressable accessibilityLabel="Zoom in" onPress={()=>setZoom(v=>Math.min(3,v+0.4))} style={s.icon}><Ionicons name="add" size={21} color="#625C72"/></Pressable><Pressable accessibilityLabel="Find a matching region" disabled={complete} onPress={()=>{const region=art.regions.find(r=>r.color===selected&&!filled.includes(r.id));if(region){setHint(region.id);setNotice('Tap where the hand is pointing');}}} style={s.hint}><Ionicons name="bulb-outline" size={18} color="#8C7447"/><Text style={{color:'#8C7447',fontSize:11}}>Hint</Text></Pressable></View>
    </View>
    <View style={s.bottom}>
      {saveError?<Pressable onPress={()=>persist(filled)}><Text style={s.error}>Progress could not be saved. Tap to retry.</Text></Pressable>:null}
      {complete?<View style={s.message}><Text style={s.complete}>Beautifully done ✿</Text><Text style={s.meta}>Your finished picture is saved in My Art.</Text><Pressable style={s.button} onPress={()=>router.replace('/(tabs)/history')}><Text style={s.white}>See My Art →</Text></Pressable></View>:<><Text accessibilityLiveRegion="polite" style={s.instruction}>{notice||`Select a color, then tap areas numbered ${selected}`}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.palette}>{art.palette.map((color,i)=>{
        const n=i+1;const remaining=art.regions.filter(r=>r.color===n&&!filled.includes(r.id)).length;
        return <Pressable key={n} disabled={!remaining} accessibilityRole="button" accessibilityLabel={`Color ${n}, ${remaining} areas remaining`} accessibilityState={{selected:selected===n,disabled:!remaining}} onPress={()=>{setSelected(n);setHint(undefined);setNotice('');}} style={[s.swatchRing,selected===n&&{borderColor:'#77718F'},!remaining&&{opacity:0.4}]}><View style={[s.swatch,{backgroundColor:color}]}><Text style={s.number}>{remaining?n:'✓'}</Text></View><Text style={s.remaining}>{remaining?`${remaining} left`:'Done'}</Text></Pressable>;
      })}</ScrollView><Text style={s.saved}>{saveError?'Keep this screen open until progress is saved.':'Progress saved automatically · Take your time'}</Text></>}
    </View>
  </SafeAreaView>;
}
const s=StyleSheet.create({screen:{flex:1,backgroundColor:'#FAF8F5'},header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:12},icon:{width:42,height:42,alignItems:'center',justifyContent:'center',borderRadius:22,backgroundColor:'white'},title:{fontFamily:'Fraunces-Regular',fontSize:21,color:'#494452'},meta:{fontFamily:'Poppins-Regular',fontSize:10,color:'#9A929F',marginTop:4},track:{height:3,backgroundColor:'#EBE7EE',marginHorizontal:25},fill:{height:3,backgroundColor:'#9E97B6'},canvasArea:{flex:1,paddingTop:12},tools:{flexDirection:'row',gap:12,alignItems:'center',justifyContent:'center',paddingVertical:12},hint:{flexDirection:'row',gap:5,alignItems:'center',backgroundColor:'#F4EAD7',padding:12,borderRadius:24,marginLeft:12},bottom:{backgroundColor:'white',borderTopLeftRadius:28,borderTopRightRadius:28,paddingVertical:20},instruction:{textAlign:'center',fontFamily:'Poppins-Medium',fontSize:11,color:'#787085',marginBottom:18},palette:{paddingHorizontal:22,gap:10},swatchRing:{borderWidth:2,borderColor:'transparent',borderRadius:29,padding:4,alignItems:'center'},swatch:{width:44,height:44,borderRadius:22,alignItems:'center',justifyContent:'center'},number:{color:'#36333F',fontSize:17,fontWeight:'600',backgroundColor:'#FFFFFF80',borderRadius:12,minWidth:24,textAlign:'center'},remaining:{fontSize:8,color:'#928996',marginTop:6,marginBottom:3},saved:{textAlign:'center',fontSize:9,color:'#A59DAA',marginTop:18},message:{alignItems:'center',justifyContent:'center',padding:24,gap:12},complete:{fontFamily:'Fraunces-Regular',fontSize:27,color:'#77718F'},button:{paddingVertical:14,paddingHorizontal:25,backgroundColor:'#77718F',borderRadius:25,marginTop:8},white:{color:'white',fontFamily:'Poppins-Medium',fontSize:12},error:{textAlign:'center',color:'#B35353',fontSize:11,marginBottom:12}});
