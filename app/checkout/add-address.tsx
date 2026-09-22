import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import ScreenWrapper from '../../src/components/ScreenWrapper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';

import { RootState } from '../../src/store';
import { addAddress } from '../../src/store/slices/addressSlice';
import { apiService } from '../../src/services/api';
import { COLORS, TYPOGRAPHY, SHADOWS } from '../../src/theme/theme';
import { showSuccess, showError, showInfo } from '../../src/store/toastStore';

export default function AddAddressScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);

  const [flatNo, setFlatNo] = useState('');
  const [area, setArea] = useState((params.area as string) || '');
  const [landmark, setLandmark] = useState('');
  const [pincode, setPincode] = useState((params.pincode as string) || '');
  const [city, setCity] = useState((params.city as string) || '');
  const [state, setState] = useState((params.state as string) || '');
  const [name, setName] = useState(user?.name || 'John Doe');
  const [phone, setPhone] = useState(user?.mobile || '+91 9876543210');
  const [addressType, setAddressType] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [isLocating, setIsLocating] = useState(false);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  const handleDetectLocation = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showError('Location permission denied. Please enable it in settings.');
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setCoords({ latitude: location.coords.latitude, longitude: location.coords.longitude });
      const geocodes = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      if (geocodes && geocodes.length > 0) {
        const geo = geocodes[0];
        setArea(geo.district || geo.street || geo.subregion || '');
        setCity(geo.city || geo.subregion || '');
        setState(geo.region || '');
        setPincode(geo.postalCode || '');
        showSuccess('Location detected successfully!');
      }
    } catch (e) {
      showError('Failed to detect location. Please try manually.');
    } finally {
      setIsLocating(false);
    }
  };

  const handleSaveAddress = async () => {
    if (!flatNo || !area || !city || !pincode) {
showInfo("Please fill in all mandatory address fields.");
      return;
    }

    if (!coords) {
      showInfo('Please detect your current location before saving the address.');
      return;
    }

    try {
      const serviceCheck = await apiService.checkServiceArea(pincode.trim());
      if (!serviceCheck?.serviceable) {
        showError('Services are not available in your area.');
        return;
      }
    } catch {
      showError('Could not verify service area. Please try again.');
      return;
    }

    const fullAddressString = `${flatNo}, ${landmark ? landmark + ', ' : ''}${area}, ${city}, ${state} - ${pincode}`;

    const newAddr = {
      id: Date.now().toString(),
      type: addressType,
      name: name.trim(),
      phone: phone.trim(),
      address: fullAddressString,
      flatNo: flatNo.trim(),
      landmark: landmark.trim(),
      area: area.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
     latitude: coords.latitude,
      longitude: coords.longitude,
    };

try {
      const saved = await apiService.addAddress({
        mobile: user?.mobile || '9999999999',
        type: addressType,
        line1: `${flatNo}, ${area}`,
        line2: landmark.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        latitude: coords.latitude,
        longitude: coords.longitude,
        isDefault: true
      });
      console.log('[ADD-ADDRESS DEBUG] Backend saved ID:', saved.id);
      dispatch(addAddress({ ...newAddr, id: saved.id }));
    showSuccess("Address added to your account successfully!");
      router.back();
    } catch (error) {
      console.error('Failed to add address to backend:', error);
  showError("Failed to save address. Please try again.");
    }
  };

const saveButton = (
    <TouchableOpacity style={styles.saveBtn} onPress={handleSaveAddress}>
      <Text style={styles.saveBtnText}>Save & Add Address</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textLight} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Address</Text>
        <View style={{ width: 24 }} />
      </View>

<View style={styles.locationButtonsRow}>
        <TouchableOpacity
          style={styles.locationBtn}
          onPress={handleDetectLocation}
          disabled={isLocating}
        >
          {isLocating ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <MaterialCommunityIcons name="crosshairs-gps" size={20} color={COLORS.primary} />
          )}
          <Text style={styles.locationBtnText}>
            {isLocating ? 'Detecting...' : 'Detect Current Location'}
          </Text>
        </TouchableOpacity>

        <View style={styles.locationDivider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity style={[styles.locationBtn, styles.locationBtnSecondary]}>
          <MaterialCommunityIcons name="pencil-outline" size={20} color="#64748B" />
          <Text style={[styles.locationBtnText, styles.locationBtnTextSecondary]}>Enter Address Manually</Text>
        </TouchableOpacity>
      </View>

  <ScreenWrapper
        bottomButton={saveButton}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="map-marker-radius" size={20} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Address Details</Text>
        </View>

        <Text style={styles.label}>HOUSE NO. / BUILDING / APARTMENT *</Text>
        <TextInput
          style={styles.input}
          value={flatNo}
          onChangeText={setFlatNo}
          placeholder="e.g. Flat 302, Tower A, Grand Arch"
          placeholderTextColor="#94A3B8"
        />

        <Text style={styles.label}>ROAD / AREA / COLONY *</Text>
        <TextInput
          style={styles.input}
          value={area}
          onChangeText={setArea}
          placeholder="e.g. Sector 56, Golf Course Extension"
          placeholderTextColor="#94A3B8"
        />

        <View style={styles.rowInput}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.label}>PINCODE *</Text>
            <TextInput
              style={styles.input}
              value={pincode}
              onChangeText={setPincode}
              placeholder="122001"
              keyboardType="number-pad"
              maxLength={6}
              placeholderTextColor="#94A3B8"
            />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.label}>CITY *</Text>
            <TextInput
              style={styles.input}
              value={city}
              onChangeText={setCity}
              placeholder="Gurgaon"
              placeholderTextColor="#94A3B8"
            />
          </View>
        </View>

        <Text style={styles.label}>LANDMARK (OPTIONAL)</Text>
        <TextInput
          style={styles.input}
          value={landmark}
          onChangeText={setLandmark}
          placeholder="e.g. Near Apex Hospital"
          placeholderTextColor="#94A3B8"
        />

        {/* Address Type Picker */}
        <Text style={styles.label}>SAVE ADDRESS AS</Text>
        <View style={styles.typeSelectorRow}>
          {(['Home', 'Work', 'Other'] as const).map((type) => {
            const isActive = addressType === type;
            const iconName = type === 'Home' ? 'home-outline' : type === 'Work' ? 'briefcase-outline' : 'map-marker-outline';
            return (
              <TouchableOpacity
                key={type}
                style={[styles.typeChip, isActive && styles.typeChipActive]}
                onPress={() => setAddressType(type)}
              >
                <MaterialCommunityIcons 
                  name={iconName} 
                  size={18} 
                  color={isActive ? COLORS.textLight : '#64748B'} 
                />
                <Text style={[styles.typeChipText, isActive && styles.typeChipTextActive]}>{type}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <MaterialCommunityIcons name="account-circle-outline" size={20} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Contact Details</Text>
        </View>

        <Text style={styles.label}>RECEIVER'S NAME *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Full Name"
          placeholderTextColor="#94A3B8"
        />

        <Text style={styles.label}>CONTACT NUMBER *</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="+91 9999999999"
          keyboardType="phone-pad"
          placeholderTextColor="#94A3B8"
        />

<View style={{ height: 20 }} />
      </ScreenWrapper>
    </View>
  );
}

const styles = StyleSheet.create({
container: {
    flex: 1,
    backgroundColor: COLORS.background,
    display: 'flex',
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'ios' ? 50 : 45,
    paddingBottom: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textLight,
  },
locationButtonsRow: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: '#EFF6FF',
    gap: 8,
  },
  locationBtnSecondary: {
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  locationBtnText: {
    ...TYPOGRAPHY.subtitle,
    color: COLORS.primary,
    fontWeight: '600',
  },
  locationBtnTextSecondary: {
    color: '#64748B',
  },
  locationDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    gap: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    ...TYPOGRAPHY.caption,
    color: '#94A3B8',
    fontWeight: 'bold',
  },
scrollContent: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    ...TYPOGRAPHY.subtitle,
    color: COLORS.textDark,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  label: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.textDark,
  },
  rowInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  typeSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  typeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    borderRadius: 20,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  typeChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  typeChipText: {
    ...TYPOGRAPHY.caption,
    fontWeight: 'bold',
    color: '#64748B',
    marginLeft: 6,
  },
  typeChipTextActive: {
    color: COLORS.textLight,
  },

  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    ...SHADOWS.soft,
  },
  saveBtnText: {
    ...TYPOGRAPHY.subtitle,
    color: COLORS.textLight,
    fontWeight: 'bold',
  }
});
