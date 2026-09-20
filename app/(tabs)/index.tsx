/* eslint-disable */
import React, { useState, useRef, useEffect, memo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Animated, Modal, Pressable, StatusBar, Platform, Image, DeviceEventEmitter, FlatList, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSelector } from 'react-redux';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, Defs, Text as SvgText, TextPath } from 'react-native-svg';
import * as Location from 'expo-location';
import { RootState } from '../../src/store';
import { confirmAndLogout } from '../../src/utils/logout';
import { COLORS, TYPOGRAPHY, SHADOWS } from '../../src/theme/theme';
import { useNotificationPermission } from '../../src/hooks/useNotificationPermission';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../src/services/api';
import { PremiumTestCard } from '../../src/components/PremiumTestCard';
import { PremiumPackageCard } from '../../src/components/PremiumPackageCard';
import { PrescriptionUploadModal } from '../../src/components/PrescriptionUploadModal';
import { LocationPickerModal } from '../../src/components/LocationPickerModal';

const { width, height } = Dimensions.get('window');



export default function HomeScreen() {
  const router = useRouter();
  const user = useSelector((state: RootState) => state.auth.user);
  const cartItems = useSelector((state: RootState) => state.cart.items);
  const cartCount = cartItems.length;

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activePkgCategory, setActivePkgCategory] = useState<string>('all');
  const [isPrescriptionVisible, setPrescriptionVisible] = useState<boolean>(false);
  useNotificationPermission();

  useEffect(() => {
    if (user?.role === 'DOCTOR' || user?.role === 'PATHOLOGIST') {
      router.replace('/(doctor)/home' as any);
    } else if (user?.role === 'EXECUTIVE' || (user?.partner as any)?.role === 'PHLEBOTOMIST' || user?.adminRoleSlug === 'executive') {
      router.replace('/(phlebotomist)/home' as any);
    } else if (user?.role === 'PATHOLOGY_PARTNER') {
      router.replace('/(partner)/home' as any);
    }
  }, [user?.role]);

const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [isLocationPickerOpen, setLocationPickerOpen] = useState<boolean>(false);

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const cached = await AsyncStorage.getItem('lastKnownLocation');
        if (cached) {
          setSelectedLocation(cached);
        }
      } catch {}

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setSelectedLocation(prev => prev ?? 'Location unavailable');
          return;
        }
        let location = await Location.getLastKnownPositionAsync({});
        if (!location) {
          location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        }
        const geocodes = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        if (geocodes && geocodes.length > 0) {
          const geo = geocodes[0];
          const city = geo.city || geo.district || geo.subregion || geo.region || null;
          if (city) {
            setSelectedLocation(city);
            AsyncStorage.setItem('lastKnownLocation', city).catch(() => {});
          } else {
            setSelectedLocation(prev => prev ?? 'Location unavailable');
          }
        }
      } catch {
        setSelectedLocation(prev => prev ?? 'Location unavailable');
      }
    };
    fetchLocation();
  }, []);

  // React Query Data Fetching
const { data: tests = [] } = useQuery({
    queryKey: ['tests'],
    queryFn: apiService.getAllTests,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: apiService.getAllCategories,
  });
  
const { data: packages = [] } = useQuery({
    queryKey: ['packages'],
    queryFn: apiService.getAllPackages,
  });

  const { data: rawCmsBanners } = useQuery({
    queryKey: ['cmsBanners'],
    queryFn: () => apiService.getCmsBanners(),
  });
  const cmsBanners = Array.isArray(rawCmsBanners)
    ? rawCmsBanners
    : (Array.isArray((rawCmsBanners as any)?.banners) ? (rawCmsBanners as any).banners : []);

  const heroBanners = cmsBanners.filter((b: any) => b.isActive !== false && b.bannerType !== 'PROMO');
  const dynamicPromoBanners = cmsBanners.filter((b: any) => b.isActive !== false && b.bannerType === 'PROMO');

  // Health Checkup Journey Dynamic S-Curve SVG Path Generator
  const [journeyWidth, setJourneyWidth] = useState(width - 32 - 40); 
  
  const getJourneyPath = () => {
    const xLeft = 32; // Center X for Left Icons
    const xRight = journeyWidth - 32; // Center X for Right Icons
    const rowH = 90; 
    
    const Y1 = 45; // Row 1 Center (90/2)
    const Y2 = 45 + rowH; // Row 2 Center
    const Y3 = 45 + 2 * rowH; // Row 3 Center
    const Y4 = 45 + 3 * rowH; // Row 4 Center

    const YMid1 = (Y1 + Y2) / 2; // Inter-row center boundary 1
    const YMid2 = (Y2 + Y3) / 2; // Inter-row center boundary 2
    const YMid3 = (Y3 + Y4) / 2; // Inter-row center boundary 3

    return `
      M ${xLeft} ${Y1}
      C ${xLeft} ${YMid1}, ${xLeft + 30} ${YMid1}, ${xLeft + 60} ${YMid1}
      L ${xRight - 60} ${YMid1}
      C ${xRight - 30} ${YMid1}, ${xRight} ${YMid1}, ${xRight} ${Y2}
      
      C ${xRight} ${YMid2}, ${xRight - 30} ${YMid2}, ${xRight - 60} ${YMid2}
      L ${xLeft + 60} ${YMid2}
      C ${xLeft + 30} ${YMid2}, ${xLeft} ${YMid2}, ${xLeft} ${Y3}
      
      C ${xLeft} ${YMid3}, ${xLeft + 30} ${YMid3}, ${xLeft + 60} ${YMid3}
      L ${xRight - 60} ${YMid3}
      C ${xRight - 30} ${YMid3}, ${xRight} ${YMid3}, ${xRight} ${Y4}
    `;
  };
  
  // Hero Auto-Scrolling Carousel Hooks
const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const heroFlatListRef = useRef<any>(null);
  const heroTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startHeroTimer = () => {
    stopHeroTimer();
    heroTimerRef.current = setInterval(() => {
      if (!isMountedRef.current) return;
      setActiveHeroIndex((prevIndex) => {
        // We can't rely on cmsBanners.length from the closure here perfectly, but 
        // using optional chaining on the ref prevents crashes.
        const nextIndex = prevIndex >= 1 ? 0 : prevIndex + 1; 
        try {
          heroFlatListRef.current?.scrollToIndex({
            index: nextIndex,
            animated: true,
          });
        } catch (e) {
          // ignore layout errors
        }
        return nextIndex;
      });
    }, 4000);
  };

  const stopHeroTimer = () => {
    if (heroTimerRef.current) {
      clearInterval(heroTimerRef.current);
    }
  };

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    startHeroTimer();
    return () => {
      isMountedRef.current = false;
      stopHeroTimer();
    };
  }, []);

  // Promo Banners (Dynamic CMS)
  const activePromoList = dynamicPromoBanners;

  const [activeStaticHeroIndex, setActiveStaticHeroIndex] = useState(0);
  const staticHeroFlatListRef = useRef<any>(null);
  const staticHeroTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startStaticHeroTimer = () => {
    stopStaticHeroTimer();
    staticHeroTimerRef.current = setInterval(() => {
      if (!isMountedRef.current) return;
      setActiveStaticHeroIndex((prevIndex) => {
        const count = activePromoList.length;
        if (count <= 1) return 0;
        const nextIndex = prevIndex >= count - 1 ? 0 : prevIndex + 1;
        try {
          staticHeroFlatListRef.current?.scrollToIndex({
            index: nextIndex,
            animated: true,
          });
        } catch (e) {
          // ignore layout errors before mount
        }
        return nextIndex;
      });
    }, 6000);
  };

  const stopStaticHeroTimer = () => {
    if (staticHeroTimerRef.current) {
      clearInterval(staticHeroTimerRef.current);
    }
  };

  useEffect(() => {
    startStaticHeroTimer();
    return () => stopStaticHeroTimer();
  }, [activePromoList.length]);

  const onStaticHeroViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      setActiveStaticHeroIndex(viewableItems[0].index || 0);
    }
  }).current;


  const onHeroViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      setActiveHeroIndex(viewableItems[0].index || 0);
    }
  }).current;

  const heroViewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50
  }).current;

  // Banner Press scale animation hooks
  const bannerScale = useRef(new Animated.Value(1)).current;
  const handleBannerPressIn = () => {
    Animated.spring(bannerScale, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };
  const handleBannerPressOut = () => {
    Animated.spring(bannerScale, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };
  
  // Drawer Animated States
  const [isDrawerVisible, setDrawerVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-width * 0.75)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const openDrawer = () => {
    setDrawerVisible(true);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeDrawer = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -width * 0.75,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setDrawerVisible(false);
      if (callback) callback();
    });
  };

  const handleDrawerNavigation = (path: string) => {
    closeDrawer(() => {
      router.push(path as any);
    });
  };

  const getCategoryIcon = (iconName: string, catId: string) => {
    const name = (iconName || '').toLowerCase();
    const id = (catId || '').toLowerCase();
    if (name === 'activity') return 'pulse';
    if (name === 'water' || id.includes('blood')) return 'water';
    if (name === 'butterfly' || id.includes('thyroid')) return 'butterfly';
    if (name === 'body' || id.includes('fullbody') || id.includes('full body')) return 'human-male-female';
    if (id.includes('diabetes')) return 'needle';
    if (id.includes('cardiac') || id.includes('heart')) return 'heart-pulse';
    if (id.includes('liver')) return 'stomach';
    if (id.includes('vitamin')) return 'pill';
    if (id.includes('fever')) return 'thermometer';
    return (iconName || 'flask');
  };

const filteredTests = activeCategory === 'all' 
    ? tests 
    : tests.filter((t: any) => t.categoryId === activeCategory);

  const filteredPackages = activePkgCategory === 'all'
    ? packages
    : packages.filter((pkg: any) => pkg.categoryId === activePkgCategory);

  

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      {/* Premium Sticky TopAppBar (fixed above ScrollView) */}
      <View style={styles.stickyHeader}>
        <TouchableOpacity style={styles.hamburgerBtn} onPress={openDrawer}>
          <MaterialCommunityIcons name="menu" size={24} color={COLORS.textLight} />
        </TouchableOpacity>
        
        <Image 
          source={require('../../assets/images/logo.png')} 
          style={styles.brandLogo} 
        />

        <View style={styles.headerRight}>
        <TouchableOpacity style={[styles.iconBtn, { marginRight: 10 }]} onPress={() => router.push('/support/chat')}>
            <MaterialCommunityIcons name="headset" size={22} color={COLORS.textLight} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/checkout/cart')}>
            <MaterialCommunityIcons name="cart-outline" size={22} color={COLORS.textLight} />
            {cartCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.mainScrollView}
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        {/* Header Banner Section (scrolls away) */}
        <View style={styles.headerBanner}>
          <View style={styles.bannerRow}>
            <View style={styles.greetingBox}>
              <Text style={styles.greetingText}>Hi, {user?.name || 'Guest'}</Text>
          <TouchableOpacity
                style={styles.locationRow}
                activeOpacity={0.8}
                onPress={() => selectedLocation && setLocationPickerOpen(true)}
              >
                <MaterialCommunityIcons name="map-marker-outline" size={14} color={COLORS.textLight} />
                {selectedLocation === null ? (
                  <View style={styles.locationShimmer} />
                ) : (
                  <>
                    <Text style={styles.locationText} numberOfLines={1}>{selectedLocation}</Text>
                    <MaterialCommunityIcons name="chevron-down" size={16} color={COLORS.textLight} />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Bar */}
          <TouchableOpacity style={styles.searchBar} onPress={() => router.push('/search')}>
            <MaterialCommunityIcons name="magnify" size={22} color={COLORS.textLight} style={{ opacity: 0.7 }} />
            <Text style={styles.searchText}>Search "Lipid Profile"...</Text>
          </TouchableOpacity>
        </View>
        
        {/* Floating Quick Action Pills (Naturally nested in ScrollView flow) */}
        <View style={styles.floatingActionsRow}>
          <TouchableOpacity 
            style={styles.floatingActionCard} 
            onPress={() => setPrescriptionVisible(true)}
            activeOpacity={0.8}
          >
            <View style={[styles.floatingIconBox, { backgroundColor: '#F0FDFA' }]}>
              <MaterialCommunityIcons name="file-document-edit-outline" size={24} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.floatingActionTitle}>Upload Prescription</Text>
              <Text style={styles.floatingActionSub}>Quick Diagnostics</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.floatingActionCard} 
            onPress={() => router.push('/(tabs)/reports')}
            activeOpacity={0.8}
          >
            <View style={[styles.floatingIconBox, { backgroundColor: '#FFF7ED' }]}>
              <MaterialCommunityIcons name="cloud-download-outline" size={24} color="#EA580C" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.floatingActionTitle}>Download Reports</Text>
              <Text style={styles.floatingActionSub}>View Results</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Premium Auto-Scrolling Hero Carousel */}
        <View style={styles.heroCarouselSection}>
          {(!Array.isArray(heroBanners) || heroBanners.length === 0) ? null : (
            <>
              <FlatList
                ref={heroFlatListRef as any}
                data={heroBanners}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item: any) => item.id}
                onViewableItemsChanged={onHeroViewableItemsChanged as any}
                viewabilityConfig={heroViewabilityConfig}
                onScrollBeginDrag={stopHeroTimer}
                onScrollEndDrag={startHeroTimer}
                renderItem={({ item }: { item: any }) => (
                  <View style={[styles.heroSlideWrapper, { paddingHorizontal: 24 }]}>
                    <TouchableOpacity
                      activeOpacity={1}
                      onPress={() => {}}
                      style={styles.heroSlide}
                    >
                      {item.imageUrl ? (
                        <Image
                          source={{ uri: item.imageUrl }}
                          style={[styles.heroBannerImage, { height: 125 }]}
                          resizeMode="cover"
                        />
                      ) : (
                        <LinearGradient
                          colors={['#006D6F', '#00B4B6']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.heroGradient}
                        >
                          <View style={styles.heroLeft}>
                            <Text style={styles.heroTitle} numberOfLines={1}>{item.title}</Text>
                            {item.subtitle && (
                              <Text style={styles.heroSubtitle} numberOfLines={1}>{item.subtitle}</Text>
                            )}
                            <View style={styles.heroClaimBtn}>
                              <Text style={styles.heroClaimBtnText}>Book Now</Text>
                              <MaterialCommunityIcons name="chevron-right" size={14} color={COLORS.primary} />
                            </View>
                          </View>
                        </LinearGradient>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              />
              <View style={styles.heroDotsRow}>
                {heroBanners.map((_: any, idx: number) => (
                  <View
                    key={idx}
                    style={[styles.heroDot, activeHeroIndex === idx && styles.heroDotActive]}
                  />
                ))}
              </View>
            </>
          )}
        </View>

        {/* Dynamic & Fallback Promo Banners Carousel */}
        <View style={[styles.heroCarouselSection, { marginTop: -32 }]}>
          <FlatList
            ref={staticHeroFlatListRef as any}
            data={activePromoList}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item: any, index: number) => item?.id || index.toString()}
            onViewableItemsChanged={onStaticHeroViewableItemsChanged as any}
            viewabilityConfig={heroViewabilityConfig}
            onScrollBeginDrag={stopStaticHeroTimer}
            onScrollEndDrag={startStaticHeroTimer}
            renderItem={({ item }: { item: any }) => (
              <View style={[styles.heroSlideWrapper, { paddingHorizontal: 20 }]}>
                <TouchableOpacity
                  activeOpacity={1}
                  style={styles.heroSlide}
                  onPress={() => {}}
                >
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={[styles.heroBannerImage, { height: 140 }]}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              </View>
            )}
          />
          <View style={styles.heroDotsRow}>
            {activePromoList.map((_: any, idx: number) => (
              <View
                key={idx}
                style={[styles.heroDot, activeStaticHeroIndex === idx && styles.heroDotActive]}
              />
            ))}
          </View>
        </View>

        {/* Browse Tests Section */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Browse Tests</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>500+</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => router.push('/search')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        {/* Circular Categories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
          <TouchableOpacity 
            style={styles.categoryCircleContainer} 
            onPress={() => setActiveCategory('all')}
          >
            <View style={[styles.categoryCircle, activeCategory === 'all' && styles.categoryCircleActive]}>
              <MaterialCommunityIcons 
                name="format-list-bulleted" 
                size={28} 
                color={activeCategory === 'all' ? COLORS.textLight : COLORS.primary} 
              />
            </View>
            <Text style={[styles.categoryLabel, activeCategory === 'all' && styles.categoryLabelActive]}>
              All Tests
            </Text>
          </TouchableOpacity>

          {categories.map((cat: any) => (
            <TouchableOpacity 
              key={cat.id} 
              style={styles.categoryCircleContainer} 
              onPress={() => setActiveCategory(cat.id)}
            >
              <View style={[styles.categoryCircle, activeCategory === cat.id && styles.categoryCircleActive]}>
                <MaterialCommunityIcons 
                  name={getCategoryIcon(cat.icon || cat.iconName, cat.id) as any} 
                  size={28} 
                  color={activeCategory === cat.id ? COLORS.textLight : COLORS.primary} 
                />
              </View>
              <Text style={[styles.categoryLabel, activeCategory === cat.id && styles.categoryLabelActive]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 16, paddingRight: 16 }} snapToInterval={width * 0.85 + 16} decelerationRate="fast" style={{ marginBottom: 24 }}>
          {filteredTests.map((test:any) => (
            <PremiumTestCard 
              key={test.id} 
              test={test} 
              horizontal={true}
              onPress={() => router.push(`/test/${test.id}`)} 
            />
          ))}
        </ScrollView>

        {/* SevaCheck Packages System */}
        <View style={[styles.sectionHeader, { marginTop: 28 }]}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>SevaCheck Packages</Text>
            <View style={[styles.badge, { backgroundColor: 'rgba(0, 109, 111, 0.1)' }]}>
              <Text style={[styles.badgeText, { color: COLORS.primary }]}>{packages.length}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => router.push('/package' as any)}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.swipeHint}>Swipe left/right to explore curated health bundles</Text>

        {/* Pill Style Modern Package Categories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pkgCategoriesScroll}>
     {[{ id: 'all', name: 'All' }, ...packages.map((pkg: any) => ({ id: pkg.categoryId, name: pkg.category })).filter((cat: any, idx: number, arr: any[]) => arr.findIndex((c: any) => c.id === cat.id) === idx)].map((pkgCat) => {
            const isSelected = activePkgCategory === pkgCat.id;
            return (
              <TouchableOpacity 
                key={pkgCat.id} 
                style={[styles.pkgPill, isSelected && styles.pkgPillActive]} 
                onPress={() => setActivePkgCategory(pkgCat.id)}
              >
                <Text style={[styles.pkgPillText, isSelected && styles.pkgPillTextActive]}>
                  {pkgCat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Horizontal Premium Package Snap Carousels */}
 <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={{ paddingLeft: 16, paddingRight: 16 }}
          snapToInterval={width * 0.86 + 16} 
          decelerationRate="fast"
          style={{ marginBottom: 24 }}
        >
        {filteredPackages.map((pkgData: any) => (
            <PremiumPackageCard 
              key={pkgData.id} 
              packageData={pkgData} 
              horizontal={true}
              onPress={() => router.push(`/package/${pkgData.id}`)}
            />
          ))}
        </ScrollView>
        
        {/* Custom Animated "Make Your Own Package" Banner */}
        <Animated.View style={[styles.customPkgContainer, { transform: [{ scale: bannerScale }] }]}>
          <Pressable 
            onPressIn={handleBannerPressIn}
            onPressOut={handleBannerPressOut}
            onPress={() => router.push('/package/custom')}
            style={styles.customPkgPressable}
          >
            <LinearGradient 
              colors={['#05495E', '#006D6F']} 
              start={{ x: 0, y: 0 }} 
              end={{ x: 1, y: 0.5 }} 
              style={styles.customPkgGradient}
            >
              <View style={styles.customPkgLeft}>
                <Text style={styles.customPkgTitle}>Make Your Own Package</Text>
                <Text style={styles.customPkgSubtitle}>Choose only the tests you need.</Text>
                <View style={styles.customPkgInlineRow}>
                  <View style={styles.customPkgBadge}>
                    <Text style={styles.customPkgBadgeText}>Save Up To 65%</Text>
                    <MaterialCommunityIcons name="hand-coin" size={14} color="#F59E0B" style={{ marginLeft: 4 }} />
                  </View>
                  <View style={styles.customPkgBtn}>
                    <Text style={styles.customPkgBtnText}>Start Now {'>'}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.customPkgRight}>
                <Image 
                  source={require('../../assets/images/make_pkg_banner.jpg')} 
                  style={styles.customPkgIllust} 
                />
              </View>
            </LinearGradient>
          </Pressable>
        </Animated.View>
        
        {/* Why Millions Trust Medsseva */}
        <LinearGradient 
          colors={['#E0F2F1', '#F1F8E9']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.trustSection}
        >
          <Text style={styles.trustTitle}>
            <Text style={{ color: '#1E293B' }}>Why millions of Indians{'\n'}</Text>
            <Text style={{ color: '#1E293B', fontWeight: '800' }}>Trust </Text>
            <Text style={{ color: '#006D6F', fontWeight: '800' }}>Medsseva Labs</Text>
          </Text>
          
          <View style={styles.trustGrid}>
            <View style={styles.trustCard}>
              <MaterialCommunityIcons name="medal-outline" size={24} color="#64748B" />
              <Text style={styles.trustCardText}>CAP{'\n'}Accredited Labs</Text>
            </View>
            <View style={styles.trustCard}>
              <MaterialCommunityIcons name="timer-outline" size={24} color="#64748B" />
              <Text style={styles.trustCardText}>On Time Sample{'\n'}Collection</Text>
            </View>
            <View style={styles.trustCard}>
              <MaterialCommunityIcons name="file-document-outline" size={24} color="#64748B" />
              <Text style={styles.trustCardText}>Smart Reports in{'\n'}6 Hours</Text>
            </View>
            <View style={styles.trustCard}>
              <MaterialCommunityIcons name="phone-in-talk-outline" size={24} color="#64748B" />
              <Text style={styles.trustCardText}>Free Report{'\n'}Consultation</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Talk to Health Advisors Banner */}
        <View style={styles.advisorBanner}>
          <View style={styles.advisorLeft}>
            <Text style={styles.advisorTitle}>
              Talk to our <Text style={{ fontWeight: '800' }}>health advisors</Text> now for attractive discounts on your Bookings
            </Text>
            <View style={styles.advisorButtons}>
              <TouchableOpacity 
                style={[styles.advisorBtn, { backgroundColor: '#65A30D' }]}
                onPress={() => Linking.openURL('tel:+918448030936')}
              >
                <MaterialCommunityIcons name="phone-outline" size={16} color="#FFFFFF" />
                <Text style={styles.advisorBtnText}>Call Now</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.advisorBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#FFFFFF' }]}
                onPress={() => Linking.openURL('whatsapp://send?phone=918448030936')}
              >
                <MaterialCommunityIcons name="whatsapp" size={16} color="#FFFFFF" />
                <Text style={styles.advisorBtnText}>Chat With Us</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Image source={require('../../assets/images/advisor.png')} style={styles.advisorImage} resizeMode="contain" />
        </View>

        {/* Refer & Earn Banner */}
        <TouchableOpacity 
          style={styles.referBanner}
          activeOpacity={0.9}
          onPress={() => router.push('/refer')}
        >
          <View style={styles.referLeft}>
            <Text style={styles.referTitle}>Refer &{'\n'}Earn Rewards</Text>
            <Text style={styles.referSubtitle}>Win iPhone, Earbuds & Smart{'\n'}Watches Every Month</Text>
            <MaterialCommunityIcons name="arrow-right" size={20} color="#FFFFFF" style={{ marginTop: 8 }} />
          </View>
          <View style={styles.referRight}>
            <View style={styles.referGiftsContainer}>
              <MaterialCommunityIcons name="gift" size={48} color="#FBBF24" style={styles.giftMain} />
              <MaterialCommunityIcons name="gift-outline" size={32} color="#FFFFFF" style={styles.giftLeft} />
              <MaterialCommunityIcons name="cellphone" size={38} color="#94A3B8" style={styles.giftRight} />
            </View>
          </View>
        </TouchableOpacity>

        {/* Premium Health Checkup Journey Roadmap Section */}
     <TouchableOpacity 
          style={styles.journeyCard}
          activeOpacity={0.9}
          onPress={() => router.push('/search')}
        >
          <Text style={styles.journeyTitle}>Health Checkup Journey</Text>
          
          <View 
            style={styles.timelineWrapper}
            onLayout={(event: any) => {
              const { width } = event.nativeEvent.layout;
              if (width > 0) setJourneyWidth(width);
            }}
          >
            {/* Flawless S-Curve Dotted Vectors dynamically routed via SVG */}
           <Svg style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="none">
              <Path 
                d={getJourneyPath()} 
                fill="none" 
                stroke="#0D9488" 
                strokeWidth={2} 
                strokeDasharray="5, 5" 
                opacity={0.7}
              />
              
              {/* Vector Precision Journey Tracking Nodes */}
              <Circle cx={32} cy={45} r={5} fill="#0D9488" />
              <Circle cx={journeyWidth - 32} cy={135} r={5} fill="#0D9488" />
              <Circle cx={32} cy={225} r={5} fill="#0D9488" />
              <Circle cx={journeyWidth - 32} cy={315} r={5} fill="#0D9488" />
            </Svg>

            {/* Step 1: Book with Ease */}
            <View style={styles.stepRow}>
              <View style={[styles.iconBoxWrapper, { backgroundColor: '#FFF5EB' }]}>
                <MaterialCommunityIcons name="calendar-clock-outline" size={24} color="#3B82F6" />
              </View>
              <View style={styles.stepTextColLeft}>
                <Text style={styles.stepTitle}>Book with Ease</Text>
                <Text style={styles.stepDesc}>Choose your test, time slot, and book instantly.</Text>
              </View>
            </View>

            {/* Step 2: Hassle-Free Collection */}
            <View style={[styles.stepRow, { justifyContent: 'flex-end' }]}>
              <View style={styles.stepTextColRight}>
                <Text style={[styles.stepTitle, { textAlign: 'right' }]}>Hassle-Free Home Collection</Text>
                <Text style={[styles.stepDesc, { textAlign: 'right' }]}>Safe & timely sample collection by trained phlebotomist.</Text>
              </View>
              <View style={[styles.iconBoxWrapper, { backgroundColor: '#FFF5EB' }]}>
                <MaterialCommunityIcons name="home-heart" size={24} color="#F59E0B" />
              </View>
            </View>

            {/* Step 3: Secure Sample Transfer */}
            <View style={styles.stepRow}>
              <View style={[styles.iconBoxWrapper, { backgroundColor: '#FFF5EB' }]}>
                <MaterialCommunityIcons name="truck-check-outline" size={24} color="#10B981" />
              </View>
              <View style={styles.stepTextColLeft}>
                <Text style={styles.stepTitle}>Secure Sample Transfer to Labs</Text>
                <Text style={styles.stepDesc}>Temperature controlled & safe sample transportation to lab.</Text>
              </View>
            </View>

            {/* Step 4: Easy Report Access */}
            <View style={[styles.stepRow, { justifyContent: 'flex-end' }]}>
              <View style={styles.stepTextColRight}>
                <Text style={[styles.stepTitle, { textAlign: 'right' }]}>Quick & Easy Report Access</Text>
                <Text style={[styles.stepDesc, { textAlign: 'right' }]}>Get your reports within 6 hours via WhatsApp, SMS, and Email.</Text>
              </View>
              <View style={[styles.iconBoxWrapper, { backgroundColor: '#FFF5EB' }]}>
                <MaterialCommunityIcons name="clipboard-pulse-outline" size={24} color="#EF4444" />
              </View>
            </View>
          </View>
        </TouchableOpacity>
        
        {/* Footer Message Section */}
        <View style={{ paddingTop: 40, paddingBottom: 16, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 24, fontWeight: '800', color: '#64748B', marginBottom: 6, letterSpacing: -0.5 }}>
            Stay Healthy
          </Text>
          <Text style={{ fontSize: 13, color: '#94A3B8', fontWeight: '500' }}>
            Made with ❤️ by MedsSeva
          </Text>
        </View>
        
        {/* Streamlined bottom spacing for perfect footer alignment */}
        <View style={{ height: 4 }} />
      </ScrollView>

      {/* Premium Left Side Drawer Modal */}
      <Modal
        transparent
        visible={isDrawerVisible}
        animationType="none"
        onRequestClose={() => closeDrawer()}
      >
        <View style={styles.drawerOverlay}>
          <Pressable style={styles.drawerBackdrop} onPress={() => closeDrawer()}>
            <Animated.View style={[styles.drawerBackdropFill, { opacity: opacityAnim }]} />
          </Pressable>

          <Animated.View 
            style={[
              styles.drawerContent, 
              { transform: [{ translateX: slideAnim }] }
            ]}
          >
            {/* Drawer Header with Gradient */}
            <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.drawerHeader}>
              <View style={styles.drawerUserBox}>
                <View style={styles.drawerAvatar}>
                  {user?.avatarUrl ? (
                    <Image source={{ uri: user.avatarUrl }} style={{ width: 44, height: 44, borderRadius: 22 }} />
                  ) : (
                    <Text style={styles.drawerAvatarText}>
                      {(user?.name || 'G')[0].toUpperCase()}
                    </Text>
                  )}
                </View>
                <View style={styles.drawerUserInfo}>
                  <Text style={styles.drawerUserName}>{user?.name || 'Guest'}</Text>
                  <Text style={styles.drawerUserSub}>Verified Member</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.drawerCloseBtn} onPress={() => closeDrawer()}>
                <MaterialCommunityIcons name="close" size={20} color={COLORS.textLight} />
              </TouchableOpacity>
            </LinearGradient>

            {/* Drawer Body */}
            <ScrollView style={styles.drawerItemsContainer} showsVerticalScrollIndicator={false}>
              {[
                { label: 'Home Dashboard', icon: 'home-variant', route: '/(tabs)' },
                { label: 'My Bookings', icon: 'calendar-check', route: '/(tabs)/bookings' },
                { label: 'My Reports', icon: 'file-document-outline', route: '/(tabs)/reports' },
                { label: 'Cart', icon: 'cart-outline', route: '/checkout/cart', badge: cartCount },
                { label: 'My Profile', icon: 'account-outline', route: '/(tabs)/profile' },
           { 
                  label: 'Book A Test', 
                  icon: 'flask-outline', 
                  route: '/search'
                },
                { label: 'Health Packages', icon: 'package-variant-closed', route: '/package' },
              ].map((item, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.drawerItem} 
                  onPress={() => {
                    if ('action' in item && typeof item.action === 'function') {
                      closeDrawer();
                      item.action();
                    } else if ('route' in item && item.route) {
                      handleDrawerNavigation(item.route);
                    }
                  }}
                >
                  <View style={styles.drawerItemIconBox}>
                    <MaterialCommunityIcons name={item.icon as any} size={22} color={COLORS.primary} />
                  </View>
                  <Text style={styles.drawerItemLabel}>{item.label}</Text>
                  
                  {item.badge !== undefined && item.badge > 0 ? (
                    <View style={styles.drawerItemBadge}>
                      <Text style={styles.drawerItemBadgeText}>{item.badge}</Text>
                    </View>
                  ) : (
                    <MaterialCommunityIcons name="chevron-right" size={18} color={COLORS.border} />
                  )}
                </TouchableOpacity>
              ))}

              <View style={styles.drawerDivider} />

              <TouchableOpacity 
                style={styles.drawerItem} 
                onPress={() => {
                 closeDrawer(() => router.push('/support' as any));
                }}
              >
                <View style={[styles.drawerItemIconBox, { backgroundColor: COLORS.warningLight }]}>
                  <MaterialCommunityIcons name="headphones" size={20} color={COLORS.warning} />
                </View>
                <Text style={styles.drawerItemLabel}>Help & Support</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Drawer Footer */}
            <View style={styles.drawerFooter}>
<TouchableOpacity style={styles.logoutBtn} onPress={() => { closeDrawer(() => confirmAndLogout()); }}>
                <MaterialCommunityIcons name="logout" size={20} color={COLORS.danger} />
                <Text style={styles.logoutBtnText}>Log Out</Text>
              </TouchableOpacity>
              <Text style={styles.appVersion}>App Version v1.0.1</Text>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Global Sheet for Quick Prescriptions */}
      <PrescriptionUploadModal
        visible={isPrescriptionVisible}
        onClose={() => setPrescriptionVisible(false)}
      />

      {/* Dynamic Highly Aesthetic Location Picker */}
  <LocationPickerModal
        visible={isLocationPickerOpen}
        onClose={() => setLocationPickerOpen(false)}
        onSelect={(loc) => {
          setSelectedLocation(loc);
          AsyncStorage.setItem('lastKnownLocation', loc).catch(() => {});
        }}
        currentLocation={selectedLocation ?? ''}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  stickyHeader: {
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'ios' ? 50 : 45,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
    ...Platform.select({
      android: { elevation: 4 },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      }
    }),
  },
  brandTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textLight,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    fontSize: 20,
  },
  brandLogo: {
    width: 110,
    height: 32,
    resizeMode: 'contain',
  },
  headerBanner: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingBottom: 44,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  bannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hamburgerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  greetingBox: {},
  greetingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textLight,
    fontWeight: 'bold',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
locationText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textLight,
    marginHorizontal: 4,
  },
  locationShimmer: {
    width: 80,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginHorizontal: 4,
  },
  headerRight: {
    flexDirection: 'row',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    right: -4,
    top: -4,
    backgroundColor: COLORS.danger,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  cartBadgeText: {
    color: COLORS.textLight,
    fontSize: 9,
    fontWeight: 'bold',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  searchText: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: COLORS.textLight,
    opacity: 0.7,
    marginLeft: 8,
  },
  mainScrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  floatingActionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: -26,
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  floatingActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 12,
    width: '48%',
    ...SHADOWS.soft,
    elevation: 5,
  },
  floatingIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  floatingActionTitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textDark,
    fontWeight: 'bold',
    fontSize: 12,
  },
  floatingActionSub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textDark,
    marginRight: 8,
  },
  badge: {
    backgroundColor: COLORS.discountGreen,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  seeAllText: {
    ...TYPOGRAPHY.subtitle,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
categoriesScroll: {
    paddingLeft: 16,
    marginBottom: 24,
    minHeight: 100,
  },
  categoryCircleContainer: {
    alignItems: 'center',
    marginRight: 20,
  },
  categoryCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
    ...SHADOWS.soft,
  },
  categoryCircleActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  categoryLabelActive: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
horizontalScroll: {
    paddingLeft: 16,
    marginBottom: 24,
    minHeight: 200,
  },
  customPkgContainer: {
    marginHorizontal: 16,
    borderRadius: 20,
    overflow: 'hidden',
    ...SHADOWS.soft,
    elevation: 4,
    marginBottom: 8,
  },
  customPkgPressable: {
    width: '100%',
  },
  customPkgGradient: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 18,
    alignItems: 'center',
    minHeight: 135,
  },
  customPkgLeft: {
    width: '62%',
    justifyContent: 'center',
    zIndex: 2,
  },
  customPkgTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  customPkgSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    marginBottom: 12,
  },
  customPkgInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  customPkgBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    marginRight: 12,
  },
  customPkgBadgeText: {
    color: '#FFC107',
    fontSize: 13,
    fontWeight: 'bold',
  },
  customPkgBtn: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    ...SHADOWS.soft,
    elevation: 3,
  },
  customPkgBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  customPkgRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '38%',
    backgroundColor: '#006D6F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customPkgIllust: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  // Side Drawer Styles
  drawerOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
 drawerBackdrop: {
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
          },
  drawerBackdropFill: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawerContent: {
    width: width * 0.75,
    height: '100%',
    backgroundColor: COLORS.surface,
    ...SHADOWS.glow,
    elevation: 20,
  },
  drawerHeader: {
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 24,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  drawerUserBox: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  drawerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  drawerAvatarText: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textLight,
    fontWeight: 'bold',
  },
  drawerUserInfo: {
    marginLeft: 12,
    flex: 1,
  },
  drawerUserName: {
    ...TYPOGRAPHY.subtitle,
    color: COLORS.textLight,
    fontWeight: 'bold',
  },
  drawerUserSub: {
    ...TYPOGRAPHY.caption,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  drawerCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  drawerItemsContainer: {
    flex: 1,
    padding: 16,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 3,
  },
  drawerItemIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  drawerItemLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.textDark,
    fontWeight: '600',
    flex: 1,
  },
  drawerItemBadge: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  drawerItemBadgeText: {
    color: COLORS.textLight,
    fontSize: 10,
    fontWeight: 'bold',
  },
  drawerDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 16,
    marginHorizontal: 12,
  },
  drawerFooter: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: COLORS.dangerLight,
    borderRadius: 10,
    marginBottom: 12,
  },
  logoutBtnText: {
    ...TYPOGRAPHY.body,
    color: COLORS.danger,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  appVersion: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontSize: 10,
  },
  swipeHint: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
    marginHorizontal: 16,
    marginBottom: 12,
    marginTop: -4,
  },
pkgCategoriesScroll: {
    marginBottom: 16,
    paddingLeft: 16,
    minHeight: 44,
  },
  pkgPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pkgPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  pkgPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  pkgPillTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  heroCarouselSection: {
    marginBottom: 24,
  },
  heroSlideWrapper: {
    width: width,
    paddingHorizontal: 16,
  },
  heroSlide: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    ...SHADOWS.soft,
    elevation: 4,
  },
heroBannerImage: {
    width: '100%',
    height: 145,
    borderRadius: 16,
  },
  heroGradient: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: 145,
  },
  heroLeft: {
    flex: 2.2,
    justifyContent: 'center',
  },
  heroCodeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  heroCodeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  heroSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    marginBottom: 12,
  },
  heroActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 10,
  },
  heroDiscount: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  heroClaimBtn: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    ...SHADOWS.soft,
    elevation: 2,
  },
  heroClaimBtnText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: 'bold',
    marginRight: 2,
  },
  heroRight: {
    flex: 0.8,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  heroDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  heroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 4,
  },
  heroDotActive: {
    width: 16,
    backgroundColor: COLORS.primary,
  },
  journeyCard: {
    backgroundColor: '#F3FBFC',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingVertical: 28,
    borderWidth: 1,
    borderColor: '#E5F3F5',
  },

  journeyTitle: {
    textAlign: 'center',
    fontSize: 21,
    fontWeight: '800',
    color: '#0D9488',
    marginBottom: 36,
  },
  timelineWrapper: {
    position: 'relative',
    paddingBottom: 12,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 90,
  },
  iconBoxWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.soft,
    elevation: 3,
    zIndex: 4,
  },
  stepTextColLeft: {
    marginLeft: 14,
    flex: 1,
    justifyContent: 'center',
  },
  stepTextColRight: {
    marginRight: 14,
    flex: 1,
    justifyContent: 'center',
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 2,
    lineHeight: 18,
  },
  stepDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    fontWeight: '600',
  },
  trustSection: {
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  trustTitle: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    lineHeight: 26,
  },
  trustGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  trustCard: {
    width: '48%',
    height: 86,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.soft,
  },
  trustCardText: {
    fontSize: 11,
    color: '#334155',
    marginLeft: 8,
    fontWeight: '500',
    flex: 1,
  },
  advisorBanner: {
    marginHorizontal: 16,
    backgroundColor: '#0D7C80',
    borderRadius: 16,
    flexDirection: 'row',
    padding: 20,
    marginBottom: 20,
    overflow: 'hidden',
    height: 145,
  },
  advisorLeft: {
    flex: 1,
    paddingRight: 10,
    zIndex: 2,
  },
  advisorTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  advisorButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  advisorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: 'center',
  },
  advisorBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  advisorImage: {
    position: 'absolute',
    right: -20,
    bottom: -20,
    width: 130,
    height: 150,
  },
  referBanner: {
    marginHorizontal: 16,
    backgroundColor: '#005D5E',
    borderRadius: 16,
    flexDirection: 'row',
    padding: 20,
    paddingVertical: 16,
    marginBottom: 20,
    overflow: 'hidden',
    height: 145,
  },
  referLeft: {
    flex: 1,
    paddingRight: 10,
    zIndex: 2,
    justifyContent: 'center',
  },
  referTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  referSubtitle: {
    color: '#E2E8F0',
    fontSize: 11,
    lineHeight: 16,
  },
  referRight: {
    width: 130,
    position: 'absolute',
    right: -10,
    bottom: -10,
    height: 150,
  },
  referGiftsContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  giftMain: {
    position: 'absolute',
    bottom: 20,
    right: 30,
    transform: [{ rotate: '10deg' }],
  },
  giftLeft: {
    position: 'absolute',
    bottom: 10,
    right: 70,
    transform: [{ rotate: '-15deg' }],
    opacity: 0.8,
  },
  giftRight: {
    position: 'absolute',
    bottom: 40,
    right: 15,
    transform: [{ rotate: '25deg' }],
  },
  awardsFooter: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 16,
    marginTop: 8,
    backgroundColor: 'transparent',
  },
  awardBadgeWrapper: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  awardBadgeText: {
    position: 'absolute',
    fontSize: 22,
    fontWeight: '900',
    color: '#94A3B8',
  },
  awardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  awardSubtitle: {
    fontSize: 10,
    color: '#CBD5E1',
    fontWeight: '700',
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  awardLocation: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: 24,
  },
  stayHealthyText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#E2E8F0',
    marginBottom: 8,
  },
  madeWithLove: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  madeWithText: {
    fontSize: 11,
    color: '#CBD5E1',
    fontWeight: '600',
  },
});
