import React, { useEffect } from 'react';
import { View, StyleSheet, Image, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tokenStorage } from '../src/utils/tokenStorage';
import { loginSuccess } from '../src/store/slices/authSlice';

const { width } = Dimensions.get('window');

export default function SplashScreen() {
  const dispatch = useDispatch();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const userStr = await AsyncStorage.getItem('user');
        const token = await tokenStorage.getItem('token');

        if (userStr && token) {
          const user = JSON.parse(userStr);
          dispatch(loginSuccess(user));
          
          setTimeout(() => {
            const isPhlebo =
              user.role === 'EXECUTIVE' ||
              user.partner?.role === 'PHLEBOTOMIST' ||
              user.adminRoleSlug === 'executive';

            if (isPhlebo) {
              router.replace('/(phlebotomist)/home' as any);
            } else if (user.role === 'PATHOLOGY_PARTNER') {
              router.replace('/(partner)/home' as any);
            } else if (user.role === 'DOCTOR' || user.role === 'PATHOLOGIST') {
              router.replace('/(doctor)/home' as any);
            } else {
              router.replace('/(tabs)' as any);
            }
          }, 1500);
        } else {
          // No session, redirect to onboarding
          setTimeout(() => {
            router.replace('/onboarding' as any);
          }, 2000);
        }
      } catch (error) {
        console.error('Session check failed:', error);
        setTimeout(() => {
          router.replace('/onboarding' as any);
        }, 2000);
      }
    };

    checkSession();
  }, []);

  return (
    <View style={styles.container}>
      <Image 
        source={require('../assets/images/spl.png')} 
        style={styles.fullImage} 
        resizeMode="contain" 
      />
      <View style={styles.logoContainer}>
        <Image 
          source={require('../assets/images/logo.png')} 
          style={styles.logo} 
          resizeMode="contain" 
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#008488', 
    justifyContent: 'flex-end',
  },
  fullImage: {
    width: width,
    height: width * (1600 / 900),
  },
  logoContainer: {
    position: 'absolute',
    top: '15%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  logo: {
    width: width * 0.7,
    height: 120,
  },
});

