import React, { useState, useEffect } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';

import ChatListScreen from './src/screens/ChatListScreen';
import ChatScreen from './src/screens/ChatScreen';
import StatusScreen from './src/screens/StatusScreen';
import DemoControlScreen from './src/screens/DemoControlScreen';
import { Ionicons } from '@expo/vector-icons';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0f111a',
          borderTopWidth: 1,
          borderTopColor: '#2a2d40',
        },
        tabBarActiveTintColor: '#9b30ff',
        tabBarInactiveTintColor: '#b0b3c6',
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Chats') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Contacts') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Chats" component={ChatListScreen} />
      <Tab.Screen name="Contacts" component={DemoControlScreen} />
      <Tab.Screen name="Settings" component={StatusScreen} />
    </Tab.Navigator>
  );
}

import OfflineLayer from 'offline-layer-sdk';
import { NetworkUtils } from './src/utils/NetworkUtils';
import { API_URL } from './src/config';

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    NetworkUtils.init();
    
    OfflineLayer.init({
      backendURL: API_URL,
      syncEndpoint: '/sync/',
      deltaEndpoint: '/delta/',
      storageCap: 50
    }).then(() => {
      setIsReady(true);
    }).catch((err) => {
      console.error("OfflineLayer init failed:", err);
      setIsReady(true);
    });
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0f111a', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#9b30ff" />
      </View>
    );
  }

  const customDarkTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: '#0f111a',
      card: '#1a1c29',
      text: '#ffffff',
      border: '#2a2d40',
      primary: '#9b30ff',
    },
  };

  return (
    <NavigationContainer theme={customDarkTheme}>
      <StatusBar style="light" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="ChatScreen" component={ChatScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
