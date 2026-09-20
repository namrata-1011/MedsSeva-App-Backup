import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Pressable, TextInput, ScrollView, ActivityIndicator, Keyboard, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SHADOWS, TYPOGRAPHY } from '../theme/theme';
import * as Location from 'expo-location';
import { apiService } from '../services/api';
import { useQuery } from '@tanstack/react-query';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (location: string) => void;
  currentLocation?: string;
}

// Dynamic city list will be fetched from the backend


export function LocationPickerModal({ visible, onClose, onSelect, currentLocation }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  React.useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleUseLiveLocation = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission not granted');
      }
      let location = await Location.getLastKnownPositionAsync({});
      if (!location) {
        location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      }
      const reverse = await Location.reverseGeocodeAsync(location.coords);
      const city = reverse[0]?.city || `${location.coords.latitude.toFixed(2)}, ${location.coords.longitude.toFixed(2)}`;
      onSelect(city);
      onClose();
    } catch (e) {
      console.warn('Failed to get location:', e);
    } finally {
      setIsLocating(false);
    }
  };

  const handleSelectCity = (city: string) => {
    onSelect(city);
    onClose();
  };

  const { data: cities, isLoading: citiesLoading } = useQuery({ queryKey: ['cities'], queryFn: () => apiService.getCities() });
    const cityList = cities || [];
    const filteredCities = cityList.filter((c: any) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.backdrop, { paddingBottom: keyboardHeight }]}>
        <Pressable style={styles.dismissArea} onPress={onClose} />
        <View style={styles.sheetContent}>
          {/* Decorative Handle Bar */}
          <View style={styles.handleContainer}>
            <View style={styles.handleBar} />
          </View>

          {/* Bottom Sheet Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Select Location</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <MaterialCommunityIcons name="close" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* City Search Container */}
          <View style={styles.searchBox}>
            <MaterialCommunityIcons name="magnify" size={22} color="#94A3B8" style={{ marginRight: 8 }} />
            <TextInput
              placeholder="Search for your city..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
              placeholderTextColor="#94A3B8"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialCommunityIcons name="close-circle" size={18} color="#CBD5E1" />
              </TouchableOpacity>
            )}
          </View>

          {/* Live GPS Row */}
          <TouchableOpacity 
            activeOpacity={0.85} 
            onPress={handleUseLiveLocation}
            disabled={isLocating}
            style={styles.liveBtnContainer}
          >
            <LinearGradient
              colors={['rgba(0, 109, 111, 0.06)', 'rgba(20, 184, 166, 0.06)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.liveBtn}
            >
              <View style={styles.gpsCircle}>
                {isLocating ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <MaterialCommunityIcons name="crosshairs-gps" size={20} color={COLORS.primary} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.liveTitle}>
                  {isLocating ? 'Acquiring location...' : 'Use Current Location'}
                </Text>
                <Text style={styles.liveSub}>Enable GPS for precise diagnostic routing</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.primary} />
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.sectionHeader}>Popular Cities</Text>

          {/* Render Cities in Padded Scroll Tray */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.cityList}>
            <View style={styles.grid}>
              {filteredCities.map((city: any) => {
                const isSelected = currentLocation === city.name;
                return (
                  <TouchableOpacity
                    key={city.id}
                    style={[styles.cityCard, isSelected && styles.cityCardSelected]}
                    onPress={() => handleSelectCity(city.name)}
                  >
                    <View style={[styles.cityIconBg, isSelected && styles.cityIconBgSelected]}>
                      <MaterialCommunityIcons 
                        name={city.icon as any} 
                        size={24} 
                        color={isSelected ? '#FFF' : COLORS.primary} 
                      />
                    </View>
                    <Text style={[styles.cityName, isSelected && styles.cityNameSelected]} numberOfLines={1}>
                      {city.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              {filteredCities.length === 0 && (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>No cities match "{searchQuery}"</Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  sheetContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 30,
    maxHeight: '80%',
    ...SHADOWS.soft,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handleBar: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    marginHorizontal: 24,
    paddingHorizontal: 16,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textDark,
    fontWeight: '500',
  },
  liveBtnContainer: {
    marginHorizontal: 24,
    marginBottom: 24,
  },
  liveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,109,111,0.12)',
  },
  gpsCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    ...SHADOWS.soft,
  },
  liveTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },
  liveSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 24,
    marginBottom: 14,
  },
  cityList: {
    paddingHorizontal: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cityCard: {
    width: '25%',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  cityCardSelected: {
    backgroundColor: 'rgba(0,109,111,0.04)',
  },
  cityIconBg: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cityIconBgSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  cityName: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  cityNameSelected: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  emptyBox: {
    width: '100%',
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
});
