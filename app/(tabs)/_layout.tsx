import { Tabs } from 'expo-router';
import CanvasActiveIcon from '@/assets/images/tabs/Canvas-active.svg';
import CanvasInactiveIcon from '@/assets/images/tabs/Canvas-inactive.svg';
import { HapticTab } from '@/components/haptic-tab';
import SettingsActiveIcon from '@/assets/images/tabs/Settings-active.svg';
import SettingsInactiveIcon from '@/assets/images/tabs/Settings-inactive.svg';
import HistoryActiveIcon from '@/assets/images/tabs/History-active.svg';
import HistoryInactiveIcon from '@/assets/images/tabs/History-inactive.svg';
export default function TabLayout() {
  return <Tabs screenOptions={{headerShown:false,tabBarButton:HapticTab,tabBarActiveTintColor:'#3A3A3A',tabBarInactiveTintColor:'#838383',tabBarStyle:{height:84,paddingTop:10,paddingBottom:20,backgroundColor:'#FFFFFF',borderTopColor:'#F0ECE7'},tabBarLabelStyle:{fontFamily:'Poppins-Medium',fontSize:14},sceneStyle:{backgroundColor:'#FAF8F5'}}}>
    <Tabs.Screen name="index" options={{title:'Canvas',tabBarIcon:({focused})=>focused ? <CanvasActiveIcon width={24} height={24}/> : <CanvasInactiveIcon width={24} height={24}/>}}/>
    <Tabs.Screen name="history" options={{title:'History',tabBarIcon:({focused})=>focused ? <HistoryActiveIcon width={24} height={24}/> : <HistoryInactiveIcon width={24} height={24}/>}}/>
    <Tabs.Screen name="profile" options={{title:'Settings',tabBarIcon:({focused})=>focused ? <SettingsActiveIcon width={24} height={24}/> : <SettingsInactiveIcon width={24} height={24}/>}}/>
    <Tabs.Screen name="create" options={{href:null}}/>
    <Tabs.Screen name="explore" options={{href:null}}/>
  </Tabs>;
}
