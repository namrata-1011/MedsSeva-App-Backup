import React from 'react';
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View, TouchableOpacity, StyleSheet, Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { COLORS } from '../../src/theme/theme';

function CustomTabButton() {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={styles.customBtnRoot}
      activeOpacity={0.85}
     onPress={() => {
        router.push('/search');
      }}  
    >
      <View style={styles.dropWrapper}>
        <Svg width={64} height={64} viewBox="0 0 64 64">
          <Defs>
            {/* Vibrant Rose to Deep Burgundy Dark Gradient for Solid Inner Pin */}
            <SvgGradient id="innerGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#E11D48" />
              <Stop offset="100%" stopColor="#4C0519" />
            </SvgGradient>
            {/* Translucent Halo Glow Gradient imitating the outer shell of screenshot */}
            <SvgGradient id="outerGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="rgba(225, 29, 72, 0.25)" />
              <Stop offset="100%" stopColor="rgba(76, 5, 25, 0.4)" />
            </SvgGradient>
          </Defs>
          
          {/* Outer Shell - Layered Translucent Glassmorphic Pin Frame */}
          <Path
            d="M32 4 C20.5 4 11 13.5 11 25 C11 39.5 32 57 32 57 C32 57 53 39.5 53 25 C53 13.5 43.5 4 32 4 Z"
            fill="url(#outerGrad)"
            stroke="rgba(225, 29, 72, 0.2)"
            strokeWidth={1}
          />
          
          {/* Inner Core - Solid Radiant Crimson Pin */}
          <Path
            d="M32 9.5 C24 9.5 17.5 16 17.5 25 C17.5 35.5 32 49 32 49 C32 49 46.5 35.5 46.5 25 C46.5 16 40 9.5 32 9.5 Z"
            fill="url(#innerGrad)"
          />
        </Svg>
        <MaterialCommunityIcons 
          name="test-tube" 
          size={20} 
          color="#FFFFFF" 
          style={{ position: 'absolute', top: 15, left: 22 }}
        />
      </View>
      <Text style={styles.btnLabel}>Book Test</Text>
    </TouchableOpacity>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = 60 + insets.bottom;


  return (
    <Tabs 
      backBehavior="history"
      screenOptions={{
      headerShown: false,
      tabBarStyle: {
        backgroundColor: COLORS.surface,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
       height: tabBarHeight,
        paddingBottom: insets.bottom || 8,
        paddingTop: 8,
      },
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.textSecondary,
      tabBarLabelStyle: {
        fontSize: 11,
        fontWeight: '600',
      },
    }}>
      <Tabs.Screen 
        name="index" 
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home-variant" size={size} color={color} />
          ),
        }} 
      />
      <Tabs.Screen 
        name="bookings" 
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar-check" size={size} color={color} />
          ),
        }} 
      />
      <Tabs.Screen 
        name="book-action" 
        options={{
          title: '',
          tabBarButton: () => <CustomTabButton />
        }} 
      />
      <Tabs.Screen 
        name="reports" 
        options={{
          title: 'Reports',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="file-document-outline" size={size} color={color} />
          ),
        }} 
      />
      <Tabs.Screen 
        name="profile" 
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-outline" size={size} color={color} />
          ),
        }} 
      />
      <Tabs.Screen 
        name="track" 
        options={{
          href: null,
        }} 
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  customBtnRoot: {
    flex: 1,
    top: -28, // Optimal float height for 64x64 SVG
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropWrapper: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: -6, // Clean overlap mapping to the bottom tip of SVG
    textAlign: 'center',
  },
});
