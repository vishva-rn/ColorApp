import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { HapticTab } from '@/components/haptic-tab';
export default function TabLayout() {
  return <Tabs screenOptions={{headerShown:false,tabBarButton:HapticTab,tabBarActiveTintColor:'#77718F',tabBarInactiveTintColor:'#B0A9B5',tabBarStyle:{height:84,paddingTop:10,paddingBottom:20,backgroundColor:'#FFFFFF',borderTopColor:'#F0ECE7'},tabBarLabelStyle:{fontFamily:'Poppins-Medium',fontSize:10},sceneStyle:{backgroundColor:'#FAF8F5'}}}>
    <Tabs.Screen name="index" options={{title:'Home',tabBarIcon:({color})=><Ionicons name="grid-outline" size={22} color={color}/>}}/>
    <Tabs.Screen name="history" options={{title:'My Art',tabBarIcon:({color})=><Ionicons name="heart-outline" size={23} color={color}/>}}/>
    <Tabs.Screen name="profile" options={{title:'Settings',tabBarIcon:({color})=><Ionicons name="settings-outline" size={23} color={color}/>}}/>
    <Tabs.Screen name="create" options={{href:null}}/>
    <Tabs.Screen name="explore" options={{href:null}}/>
  </Tabs>;
}
