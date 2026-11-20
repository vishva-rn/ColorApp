import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Artwork from './Artwork';
import { ART_CATEGORIES, matchesCategory } from '@/lib/art-categories';
import { ARCHIVED_ART, NUMBER_ART } from '@/lib/number-art';
import { PAGE_ART } from '@/lib/page-art';
import { loadProgress, type ArtProgress } from '@/lib/number-progress';
import CategorySelectedBackground from '@/assets/images/svgicons/category-selected-bg.svg';

const homeCategories = [...new Set([
  ...PAGE_ART.map((art) => art.category),
  ...ART_CATEGORIES.map((category) => category.label),
])];

export default function Gallery({myArt=false}: {myArt?:boolean}) {
  const router=useRouter();
  const {width}=useWindowDimensions();
  const [category,setCategory]=useState('All');
  const [progress,setProgress]=useState<ArtProgress>({});
  useFocusEffect(useCallback(()=>{setProgress(loadProgress());},[]));
  const artwork=(myArt ? [...NUMBER_ART, ...ARCHIVED_ART] : NUMBER_ART).filter(art=>{
    const count=art.regions.filter(r=>progress[art.id]?.includes(r.id)).length;
    return myArt ? count>0 && (category==='All' || (category==='Completed' ? count===art.regions.length : count<art.regions.length)) : category==='All' || matchesCategory(art, category);
  });
  const columns=width>=700?3:2;
  const cardWidth=(Math.min(width,1000)-48-(columns-1)*14)/columns;
  return <SafeAreaView style={s.screen} edges={['top','left','right']}>
    <ScrollView contentContainerStyle={s.content}>
      <View style={s.header}><View><Text style={s.eyebrow}>A LITTLE COLOR. A LITTLE CALM.</Text><Text style={s.title}>{myArt?'My Art':'Color your quiet'}</Text></View><Text style={s.flower}>✿</Text></View>
      <Text style={s.subtitle}>{myArt?'Your moments of color, saved here.':'Pick a picture. Follow the numbers. Unwind.'}</Text>
      {!myArt && <Pressable accessibilityRole="button" onPress={()=>router.push({pathname:'/drawing',params:{artId:NUMBER_ART[0].id}})} style={s.hero}>
        <View style={{flex:1,padding:20}}><Text style={s.eyebrow}>YOUR DAILY PAUSE</Text><Text style={s.heroTitle}>A breath of{ '\n' }fresh color</Text><Text style={s.heroSub}>{NUMBER_ART[0].title}</Text><Text style={s.heroLink}>Start coloring  →</Text></View>
        <View style={{width:'45%',aspectRatio:1}}><Artwork art={NUMBER_ART[0]} outlineOnly/></View>
      </Pressable>}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>
        {(myArt?['All','In progress','Completed']:['All',...homeCategories]).map(item=><Pressable accessibilityRole="button" accessibilityState={{selected:item===category}} key={item} onPress={()=>setCategory(item)} style={[s.chip,item===category&&{backgroundColor:'transparent'}]}>{item===category&&<View pointerEvents="none" style={StyleSheet.absoluteFill}><CategorySelectedBackground width="100%" height="100%" preserveAspectRatio="none"/></View>}<Text style={[s.chipText,item===category&&{color:'#3A3A3A'}]}>{item}</Text></Pressable>)}
      </ScrollView>
      <View style={s.section}><Text style={s.sectionTitle}>{myArt?'Your collection':'Find your next happy moment'}</Text><Text style={s.count}>{artwork.length} pictures</Text></View>
      <View style={s.grid}>{artwork.map(art=>{
        const filled=progress[art.id]??[];
        const count=art.regions.filter(r=>filled.includes(r.id)).length;
        const percent=Math.round(count/art.regions.length*100);
        return <Pressable key={art.id} accessibilityRole="button" accessibilityLabel={`${art.title}, ${percent}% complete`} onPress={()=>router.push({pathname:'/drawing',params:{artId:art.id}})} style={[s.card,{width:cardWidth}]}>
          <View pointerEvents="none" style={s.art}>
            <Artwork art={art} outlineOnly={!myArt} filled={myArt ? filled : []} />
          </View>
          <View style={s.cardBody}><Text style={s.cardTitle}>{art.title}</Text><View style={s.section}><Text style={s.cardMeta}>{art.category}</Text><Text style={s.cardMeta}>{percent===100?'✓ Done':count?`${percent}%`:`${art.palette.length} colors`}</Text></View>{count>0&&<View style={s.track}><View style={[s.fill,{width:`${percent}%`}]}/></View>}</View>
        </Pressable>;
      })}</View>
      {artwork.length===0&&<View style={s.empty}><Text style={s.heroTitle}>A blank page, a fresh start</Text><Text style={s.subtitle}>Choose a picture from Home. Your progress will appear here automatically.</Text><Pressable onPress={()=>router.navigate('/(tabs)')} style={s.activeChip}><Text style={{color:'white',padding:14}}>Explore pictures →</Text></Pressable></View>}
      <Text style={s.footer}>Made for a slower, more colorful moment.</Text>
    </ScrollView>
  </SafeAreaView>;
}
const s=StyleSheet.create({screen:{flex:1,backgroundColor:'#FAF8F5'},content:{padding:24,paddingBottom:115,maxWidth:1000,width:'100%',alignSelf:'center'},header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},eyebrow:{fontSize:9,letterSpacing:1.5,color:'#8D8C90',fontFamily:'Poppins-Medium'},title:{fontSize:32,color:'#343347',fontFamily:'Fraunces-Regular',marginTop:8},flower:{fontSize:45,color:'#8D8BB0'},subtitle:{fontSize:12,color:'#898591',lineHeight:21,marginTop:8,fontFamily:'Poppins-Regular'},hero:{marginTop:25,backgroundColor:'#EDEDF3',borderRadius:22,overflow:'hidden',flexDirection:'row',alignItems:'center'},heroTitle:{fontFamily:'Fraunces-Regular',fontSize:25,color:'#45435A',marginVertical:9},heroSub:{fontSize:10,color:'#848091'},heroLink:{marginTop:20,color:'#69618F',fontFamily:'Poppins-SemiBold',fontSize:11},filters:{gap:4,paddingVertical:24},chip:{paddingHorizontal:12,paddingVertical:10,borderRadius:24},activeChip:{backgroundColor:'#77718F',borderRadius:24},chipText:{fontSize:14,color:'#838383',fontFamily:'Poppins-Medium'},section:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},sectionTitle:{fontFamily:'Poppins-SemiBold',fontSize:13,color:'#494554'},count:{fontSize:10,color:'#99909A'},grid:{flexDirection:'row',flexWrap:'wrap',gap:14,marginTop:18},card:{backgroundColor:'white',borderRadius:17,overflow:'hidden',borderWidth:1,borderColor:'#F0ECE7'},art:{aspectRatio:1,backgroundColor:'white'},cardBody:{padding:12},cardTitle:{fontFamily:'Poppins-Medium',fontSize:11,color:'#494452',marginBottom:7},cardMeta:{fontSize:9,color:'#9A929D'},track:{height:3,backgroundColor:'#EFEBF3',marginTop:10,borderRadius:3},fill:{height:3,backgroundColor:'#8D88A6',borderRadius:3},empty:{paddingVertical:45,alignItems:'center',gap:15},footer:{textAlign:'center',color:'#ADA5AF',fontSize:10,marginTop:35}});
