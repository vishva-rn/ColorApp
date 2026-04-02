import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import ArtsActiveTab from '../../assets/images/tabs/Arts-active.svg';
import ArtsInactiveTab from '../../assets/images/tabs/Arts-inactive.svg';
import CanvasActiveTab from '../../assets/images/tabs/Canvas-active.svg';
import CanvasInactiveTab from '../../assets/images/tabs/Canvas-inactive.svg';
import CreateActiveTab from '../../assets/images/tabs/Create-active.svg';
import CreateInactiveTab from '../../assets/images/tabs/Create-inactive.svg';
import HistoryActiveTab from '../../assets/images/tabs/History-active.svg';
import HistoryInactiveTab from '../../assets/images/tabs/History-inactive.svg';
import ProfileActiveTab from '../../assets/images/tabs/profile-active.svg';
import ProfileInactiveTab from '../../assets/images/tabs/profile-inactive.svg';

type TabIconProps = {
  active: React.FC<any>;
  inactive: React.FC<any>;
  focused: boolean;
};

function TabIcon({ active: ActiveIcon, inactive: InactiveIcon, focused }: TabIconProps) {
  const Icon = focused ? ActiveIcon : InactiveIcon;
  return <Icon width={22} height={22} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#3A3A3A',
        tabBarInactiveTintColor: '#A6A19A',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 84,
          paddingTop: 10,
          paddingBottom: 14,
          borderTopWidth: 0,
          backgroundColor: '#FFFFFF',
          shadowColor: '#1F130B',
          shadowOpacity: 0.06,
          shadowOffset: { width: 0, height: -2 },
          shadowRadius: 8,
          elevation: 6,
        },
        tabBarItemStyle: {
          paddingTop: 2,
        },
        tabBarIconStyle: {
          marginBottom: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        tabBarBackground: () => null,
        sceneStyle: { backgroundColor: '#F7F2EF' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Canvas',
          tabBarIcon: ({ focused }) => (
            <TabIcon active={CanvasActiveTab} inactive={CanvasInactiveTab} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Arts',
          tabBarIcon: ({ focused }) => (
            <TabIcon active={ArtsActiveTab} inactive={ArtsInactiveTab} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Create',
          tabBarIcon: ({ focused }) => (
            <TabIcon active={CreateActiveTab} inactive={CreateInactiveTab} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ focused }) => (
            <TabIcon active={HistoryActiveTab} inactive={HistoryInactiveTab} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => (
            <TabIcon active={ProfileActiveTab} inactive={ProfileInactiveTab} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
