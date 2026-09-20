import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  Dimensions, 
  TouchableOpacity, 
  StatusBar, 
  Platform 
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, TYPOGRAPHY } from '../src/theme/theme';

const { width, height } = Dimensions.get('window');

const ONBOARDING_DATA = [
  {
    id: 1,
    title: 'Your Health in Your Hands',
    description: 'Book lab tests from the comfort of your home and get accurate results within hours.',
    image: require('../assets/images/ob1.jpg'),
  },
  {
    id: 2,
    title: 'Certified Pathology Labs',
    description: 'We partner with top NABL & CAP certified labs to ensure the highest quality standards.',
    image: require('../assets/images/ob2.jpg'),
  },
  {
    id: 3,
    title: 'Smart Health Tracking',
    description: 'Monitor your health timeline, analyze trends, and receive AI-powered insights.',
    image: require('../assets/images/ob3.jpg'),
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const insets = useSafeAreaInsets();

  const handleNext = () => {
    if (currentIndex < ONBOARDING_DATA.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      router.replace('/(auth)/account-type');
    }
  };

  const currentSlide = ONBOARDING_DATA[currentIndex];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* LAYER 1: Dynamic Background Clone (Sharp but faded, matching mockup!) */}
      <View style={styles.backdropContainer}>
        <Image 
          source={currentSlide.image} 
          style={styles.backdropImage} 
          resizeMode="cover"
        />
        {/* LAYER 2: Linear Gradient Veil (Fading backdrop into pure white bottom) */}
        <LinearGradient 
          colors={[
            'rgba(255, 255, 255, 0.1)', 
            'rgba(255, 255, 255, 0.4)', 
            '#FFFFFF'
          ]}
          locations={[0, 0.55, 1]}
          style={styles.fadeGradient}
        />
      </View>

      {/* Skip Button Floating Top Right */}
      <SafeAreaView style={styles.safeHeader}>
        {currentIndex < ONBOARDING_DATA.length - 1 && (
        <TouchableOpacity style={styles.skipBtn} onPress={() => router.replace('/(auth)/account-type')}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>

      {/* LAYER 3: Elevated Sharp Capsule Image Pane & Concentric Echo Rings */}
      <View style={styles.imageSection}>
        {/* Outer Ring */}
        <View style={[styles.concentricRing, styles.ringOuter]} />
        {/* Inner Ring */}
        <View style={[styles.concentricRing, styles.ringInner]} />

        {/* Main Centered Window */}
        <View style={styles.capsuleFrame}>
          <Image 
            source={currentSlide.image} 
            style={styles.mainIllustration} 
            resizeMode="cover" 
          />
        </View>
      </View>

      {/* Details Section */}
      <View style={styles.textSection}>
        <Text style={styles.title}>{currentSlide.title}</Text>
        <Text style={styles.description}>{currentSlide.description}</Text>
      </View>

      {/* Bottom Controls (Custom Curved Button + Dash indicators retained!) */}
      <View style={[styles.footer, { bottom: Math.max(insets.bottom, 10) }]} pointerEvents="box-none">
        <View style={styles.paginationContainer}>
          {ONBOARDING_DATA.map((_, index) => {
            const isActive = currentIndex === index;
            return (
              <View
                key={index}
                style={[
                  styles.dash,
                  isActive ? styles.activeDash : styles.inactiveDash,
                ]}
              />
            );
          })}
        </View>

        <TouchableOpacity 
          style={styles.nextButtonShape} 
          onPress={handleNext}
          activeOpacity={0.9}
        >
          <Text style={styles.nextButtonText}>
            {currentIndex === ONBOARDING_DATA.length - 1 ? 'Finish' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', 
    position: 'relative',
  },
  backdropContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.58,
    overflow: 'hidden',
    zIndex: -1,
  },
  backdropImage: {
    width: '100%',
    height: '100%',
    opacity: 0.45, // Crystal clear, but soft opacity like the mockup
  },
  fadeGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '90%', // Gradual smooth fade towards the bottom
  },
  safeHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 10 : 20,
    right: 20,
    zIndex: 20,
  },
  skipBtn: {
    padding: 10,
    marginTop: Platform.OS === 'android' ? 30 : 0,
    backgroundColor: 'rgba(255, 255, 255, 0.6)', // Make semi-opaque over background images
    borderRadius: 20,
    paddingHorizontal: 14,
  },
  skipText: {
    ...TYPOGRAPHY.body,
    color: '#64748B', 
    fontWeight: 'bold',
    fontSize: 13,
  },
  imageSection: {
    flex: 0.56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 50 : 60,
    position: 'relative',
  },
  concentricRing: {
    position: 'absolute',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'transparent',
  },
  ringInner: {
    width: width * 0.74,
    height: height * 0.46,
    borderRadius: (width * 0.74) / 2,
  },
  ringOuter: {
    width: width * 0.86,
    height: height * 0.52,
    borderRadius: (width * 0.86) / 2,
    borderColor: 'rgba(255, 255, 255, 0.15)', // Outer ring slightly softer
  },
  capsuleFrame: {
    width: width * 0.62,
    height: height * 0.4,
    borderRadius: (width * 0.62) / 2, // Perfect geometric capsule shape rounding
    backgroundColor: '#FFFFFF',
    borderWidth: 7,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.18,
        shadowRadius: 24,
      },
      android: {
        elevation: 16,
      }
    }),
  },
  mainIllustration: {
    width: '100%',
    height: '100%',
  },
  textSection: {
    flex: 0.26,
    alignItems: 'center',
    paddingHorizontal: 36,
    justifyContent: 'flex-start',
    marginTop: 16,
  },
  title: {
    ...TYPOGRAPHY.h1,
    color: '#0F172A', 
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 14,
    fontSize: 25,
  },
  description: {
    ...TYPOGRAPHY.body,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 23,
    fontSize: 14,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  paginationContainer: {
    flexDirection: 'row',
    marginLeft: 36,
    marginBottom: Platform.OS === 'ios' ? 45 : 35,
    alignItems: 'center',
  },
  dash: {
    height: 5,
    borderRadius: 3,
    marginHorizontal: 3,
  },
  activeDash: {
    width: 28,
    backgroundColor: COLORS.primary, 
  },
  inactiveDash: {
    width: 12,
    backgroundColor: '#CBD5E1', 
  },
  nextButtonShape: {
    width: 170,
    height: 80,
    backgroundColor: COLORS.primary, 
    borderTopLeftRadius: 80, 
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    paddingLeft: 16,
    paddingTop: 12,
  },
  nextButtonText: {
    ...TYPOGRAPHY.subtitle,
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 18,
    letterSpacing: 0.5,
  },
});
