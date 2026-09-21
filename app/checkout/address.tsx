import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, TextInput, FlatList } from 'react-native';
import ScreenWrapper from '../../src/components/ScreenWrapper';
import { showError, showInfo } from '../../src/store/toastStore';
const notifyError = showError as any;
const notifyInfo = showInfo as any;
import { ConfirmSheet } from '../../src/components/ConfirmSheet';
import { PremiumBottomSheet } from '../../src/components/PremiumBottomSheet';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { RootState, AppDispatch } from '../../src/store';
import { setAddress, setAddressId, setBranch, setCollectionMode } from '../../src/store/slices/bookingSlice';
import { fetchAddressesThunk, removeAddressThunk } from '../../src/store/slices/addressSlice';
import { apiService } from '../../src/services/api';
import { useQuery } from '@tanstack/react-query';
import { COLORS, TYPOGRAPHY, SHADOWS } from '../../src/theme/theme';

export default function AddressScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  
  const addresses = useSelector((state: RootState) => state.address.addresses);
  const user = useSelector((state: RootState) => state.auth.user);
  const [addressesLoading, setAddressesLoading] = useState(true);
  
  const [selectedId, setSelectedId] = useState<string | null>(addresses.length > 0 ? addresses[0].id : null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const collectionMode = useSelector((state: RootState) => state.booking.collectionMode);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isBranchSheetOpen, setBranchSheetOpen] = useState(false);
  const [branchSearch, setBranchSearch] = useState('');

  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await apiService.getBranches({ isActive: true, labVisit: true });
      return res.data || [];
    },
    enabled: collectionMode === 'lab',
  });

  const activeBranch = branches.find((b: any) => b.id === selectedBranchId);

  useFocusEffect(
    React.useCallback(() => {
      loadAddresses();
    }, [])
  );

  const loadAddresses = async () => {
    try {
      setAddressesLoading(true);
      const result = await dispatch(fetchAddressesThunk()).unwrap();
      if (result && result.length > 0 && !selectedId) {
        setSelectedId(result[0].id);
      }
    } catch (err: any) {
      console.log('Error fetching addresses:', err);
    } finally {
      setAddressesLoading(false);
    }
  };

  const handleUseCurrentLocation = async () => {
    try {
      setLoadingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        notifyError('Permission Denied', 'Location permission is required to detect your address.');
        setLoadingLocation(false);
        return;
      }

      let location = await Location.getLastKnownPositionAsync({});
      if (!location) {
        location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
      }

      const [geocode] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (geocode) {
        const addressObj = {
          mobile: user?.mobile || '9999999999',
          type: 'Other',
          line1: `${geocode.name || ''} ${geocode.street || ''}`.trim() || 'Detected Location',
          line2: `${geocode.subregion || ''} ${geocode.district || ''}`.trim(),
          city: geocode.city || '',
          state: geocode.region || '',
          pincode: geocode.postalCode || '',
          isDefault: true
        };

        const res = await apiService.addAddress(addressObj);
        if (res.data?.success && res.data?.data) {
          const newAddr = res.data.data;
          dispatch(fetchAddressesThunk());
          dispatch(setAddress(newAddr));
          dispatch(setAddressId(newAddr.id));
          setSelectedId(newAddr.id);
          router.push('/checkout/patient');
        } else {
          router.push({
            pathname: '/checkout/add-address',
            params: {
              prefillLat: location.coords.latitude,
              prefillLng: location.coords.longitude,
              prefillLine1: addressObj.addressLine1,
              prefillCity: addressObj.city,
              prefillState: addressObj.state,
              prefillPincode: addressObj.pincode,
            }
          });
        }
      }
    } catch (error: any) {
      notifyError('Location Error', 'Unable to detect location. Please select address manually.');
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleProceed = () => {
    if (collectionMode === 'lab') {
      if (!selectedBranchId) {
        notifyError('Selection Missing', 'Please select a lab branch to continue');
        return;
      }
      dispatch(setBranch(activeBranch));
      dispatch(setAddress('' as any));
      dispatch(setAddressId(''));
    } else {
      if (!selectedId) {
        notifyError('Selection Missing', 'Please select an address to continue');
        return;
      }
      const active = addresses.find((a: any) => a.id === selectedId);
      if (active) {
        dispatch(setAddress(active.id || ''));
        dispatch(setAddressId(active.id));
        dispatch(setBranch(null));
      }
    }
    router.push('/checkout/slot');
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await dispatch(removeAddressThunk(deleteTarget)).unwrap();
      notifyInfo('Removed', 'Address removed');
      if (selectedId === deleteTarget) {
        const remaining = addresses.filter((a: any) => a.id !== deleteTarget);
        setSelectedId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (err: any) {
      showError('Error', err?.message || 'Failed to remove address');
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
  <View style={styles.container}>
      <ConfirmSheet
        visible={deleteTarget !== null}
        title="Delete Address"
        message="Are you sure you want to permanently delete this saved location?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmDestructive
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textLight} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Location</Text>
        <View style={{ width: 40 }} />
      </View>

    <ScreenWrapper
        bottomButton={
          <TouchableOpacity
            style={[styles.continueBtn, (collectionMode === 'lab' ? !selectedBranchId : !selectedId) && styles.continueBtnDisabled]}
            disabled={collectionMode === 'lab' ? !selectedBranchId : !selectedId}
            onPress={handleProceed}
          >
            <Text style={styles.continueBtnText}>Continue to Slot Selection</Text>
          </TouchableOpacity>
        }
        contentContainerStyle={styles.scrollContent}
      >
        
        <TouchableOpacity 
          style={styles.addAddressCard} 
          onPress={() => router.push('/checkout/add-address')}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="plus-circle-outline" size={24} color={COLORS.primary} />
          <Text style={styles.addAddressText}>Add New Address</Text>
          <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.textSecondary} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.currentLocationCard, loadingLocation && { opacity: 0.6 }]} 
          onPress={handleUseCurrentLocation}
          disabled={loadingLocation}
          activeOpacity={0.7}
        >
          {loadingLocation ? (
            <ActivityIndicator color={COLORS.accent} size={22} style={{ marginRight: 4 }} />
          ) : (
            <MaterialCommunityIcons name="crosshairs-gps" size={24} color={COLORS.accent} />
          )}
          <View style={styles.currentLocationTextCol}>
            <Text style={styles.currentLocationTitle}>
              {loadingLocation ? "Accessing GPS..." : "Use Current Location"}
            </Text>
            <Text style={styles.currentLocationSub}>
              {loadingLocation ? "Detecting your device coordinates..." : "Enable GPS to fetch address"}
            </Text>
          </View>
        </TouchableOpacity>

       {/* Collection Mode Toggle */}
        <View style={{ flexDirection: 'row', marginBottom: 20, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border }}>
          <TouchableOpacity
            style={{ flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: collectionMode === 'home' ? COLORS.primary : COLORS.surface }}
            onPress={() => dispatch(setCollectionMode('home'))}
          >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
  <MaterialCommunityIcons
    name="home-outline"
    size={16}
    color={collectionMode === 'home' ? COLORS.textLight : COLORS.textSecondary}
  />
  <Text
    style={{
      color: collectionMode === 'home' ? COLORS.textLight : COLORS.textSecondary,
      fontWeight: 'bold',
      fontSize: 13,
    }}
  >
    Home Collection
  </Text>
</View>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: collectionMode === 'lab' ? COLORS.primary : COLORS.surface }}
            onPress={() => dispatch(setCollectionMode('lab'))}
          >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
  <MaterialCommunityIcons
    name="office-building"
    size={16}
    color={collectionMode === 'lab' ? COLORS.textLight : COLORS.textSecondary}
  />
  <Text
    style={{
      color: collectionMode === 'lab' ? COLORS.textLight : COLORS.textSecondary,
      fontWeight: 'bold',
      fontSize: 13,
    }}
  >
    Visit Lab
  </Text>
</View>
          </TouchableOpacity>
        </View>

        {collectionMode === 'lab' ? (
          <>
            <Text style={styles.sectionTitle}>Select Lab Branch</Text>
            {branchesLoading ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 20 }} />
            ) : branches.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="hospital-building" size={48} color={COLORS.border} />
                <Text style={styles.emptyText}>No branches available.</Text>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.dropdownBtn}
                onPress={() => setBranchSheetOpen(true)}
                activeOpacity={0.8}
              >
                <View style={styles.dropdownContent}>
                  <MaterialCommunityIcons name="hospital-building" size={24} color={activeBranch ? COLORS.primary : '#94A3B8'} style={{ marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dropdownLabel}>Select your branch</Text>
                    {activeBranch && (
                      <Text style={styles.dropdownValue}>{activeBranch.name}</Text>
                    )}
                  </View>
                  <MaterialCommunityIcons name="chevron-down" size={24} color="#64748B" />
                </View>
              </TouchableOpacity>
            )}
          </>
        ) : (
        <>
    <Text style={styles.sectionTitle}>Saved Addresses</Text>

        {addressesLoading ? (
          <>
            {[1, 2].map((i) => (
              <View key={i} style={[styles.addressCard, styles.skeletonCard]}>
                <View style={styles.skeletonRow}>
                  <View style={[styles.skeletonBox, { width: 120, height: 14, borderRadius: 7 }]} />
                  <View style={[styles.skeletonBox, { width: 40, height: 14, borderRadius: 7 }]} />
                </View>
                <View style={[styles.skeletonBox, { width: '100%', height: 12, borderRadius: 6, marginTop: 10 }]} />
                <View style={[styles.skeletonBox, { width: '70%', height: 12, borderRadius: 6, marginTop: 8 }]} />
                <View style={[styles.skeletonBox, { width: 100, height: 12, borderRadius: 6, marginTop: 12 }]} />
              </View>
            ))}
          </>
        ) : addresses.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="map-marker-off-outline" size={48} color={COLORS.border} />
            <Text style={styles.emptyText}>No saved addresses yet.</Text>
            <Text style={styles.emptySub}>Add one using the buttons above to continue.</Text>
          </View>
        ) : (
          addresses.map((addr) => (
            <TouchableOpacity 
              key={addr.id} 
              style={[
                styles.addressCard,
                selectedId === addr.id && styles.addressCardSelected
              ]}
              onPress={() => setSelectedId(addr.id)}
              activeOpacity={0.8}
            >
              <View style={styles.addressHeaderRow}>
                <View style={styles.leftHeaderCol}>
                  <Text style={styles.nameText}>{addr.name}</Text>
                  <View style={[styles.typeBadge, selectedId === addr.id && styles.typeBadgeActive]}>
                    <MaterialCommunityIcons 
                      name={
                        addr.type === 'Home' ? 'home-outline' : 
                        addr.type === 'Work' ? 'briefcase-outline' : 
                        'map-marker-outline'
                      } 
                      size={11} 
                      color={selectedId === addr.id ? COLORS.primary : '#64748B'} 
                    />
                    <Text style={[styles.typeText, selectedId === addr.id && styles.typeTextActive]}>{addr.type.toUpperCase()}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TouchableOpacity 
                    onPress={() => setDeleteTarget(addr.id)} 
                    style={{ padding: 4, marginRight: 8 }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <MaterialCommunityIcons name="trash-can-outline" size={20} color="#EF4444" />
                  </TouchableOpacity>
                  <View style={styles.radioContainer}>
                    {selectedId === addr.id ? (
                      <MaterialCommunityIcons name="radiobox-marked" size={22} color={COLORS.primary} />
                    ) : (
                      <MaterialCommunityIcons name="radiobox-blank" size={22} color="#CBD5E1" />
                    )}
                  </View>
                </View>
              </View>
              
              <Text style={styles.addressText}>{addr.address}</Text>
              <View style={styles.phoneRow}>
                <MaterialCommunityIcons name="phone-outline" size={14} color="#64748B" style={{ marginRight: 6 }} />
                <Text style={styles.phoneText}>{addr.phone}</Text>
              </View>
            </TouchableOpacity>
          ))
   )}
        </>
        )}

  </ScreenWrapper>

      {/* Branch Selection Bottom Sheet */}
      <PremiumBottomSheet visible={isBranchSheetOpen} onClose={() => setBranchSheetOpen(false)}>
        <View style={{ flex: 1, paddingHorizontal: 24, paddingBottom: 20 }}>
          <Text style={styles.sheetTitle}>Select Branch</Text>
          <View style={styles.searchBar}>
            <MaterialCommunityIcons name="magnify" size={20} color="#64748B" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search branches..."
              placeholderTextColor="#94A3B8"
              value={branchSearch}
              onChangeText={setBranchSearch}
            />
            {branchSearch.length > 0 && (
              <TouchableOpacity onPress={() => setBranchSearch('')}>
                <MaterialCommunityIcons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
          
          <FlatList
            data={branches.filter((b: any) => 
              b.name.toLowerCase().includes(branchSearch.toLowerCase()) || 
              b.city.toLowerCase().includes(branchSearch.toLowerCase())
            )}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.branchItem, selectedBranchId === item.id && styles.branchItemSelected]}
                onPress={() => {
                  setSelectedBranchId(item.id);
                  setBranchSheetOpen(false);
                  setBranchSearch('');
                }}
              >
                <MaterialCommunityIcons 
                  name="hospital-building" 
                  size={20} 
                  color={selectedBranchId === item.id ? COLORS.primary : "#64748B"} 
                  style={{ marginRight: 12 }} 
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.branchName, selectedBranchId === item.id && styles.branchNameSelected]}>
                    {item.name}
                  </Text>
                  <Text style={styles.branchAddress} numberOfLines={1}>
                    {item.line1}, {item.city}
                  </Text>
                </View>
                {selectedBranchId === item.id && (
                  <MaterialCommunityIcons name="check-circle" size={22} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            )}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No branches found</Text>
              </View>
            }
          />
        </View>
      </PremiumBottomSheet>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'ios' ? 50 : 45,
    paddingBottom: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textLight,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  addAddressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.soft,
    elevation: 2,
  },
  addAddressText: {
    ...TYPOGRAPHY.subtitle,
    color: COLORS.primary,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  currentLocationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.soft,
    elevation: 2,
  },
  currentLocationTextCol: {
    marginLeft: 12,
    flex: 1,
  },
  currentLocationTitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textDark,
    fontWeight: 'bold',
  },
  currentLocationSub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textDark,
    marginBottom: 16,
    fontWeight: 'bold',
  },
  addressCard: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  addressCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(0, 128, 128, 0.02)',
    borderWidth: 1.5,
  },
  addressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  leftHeaderCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 12,
  },
  typeBadgeActive: {
    backgroundColor: 'rgba(0, 128, 128, 0.08)',
  },
  typeText: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '800',
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  typeTextActive: {
    color: COLORS.primary,
  },
  radioContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  nameText: {
    fontSize: 15,
    color: COLORS.textDark,
    fontWeight: 'bold',
  },
  addressText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phoneText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
  },
  emptyText: {
    ...TYPOGRAPHY.subtitle,
    color: COLORS.textDark,
    marginTop: 12,
    fontWeight: 'bold',
  },
emptySub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  skeletonCard: {
    opacity: 1,
  },
  skeletonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  skeletonBox: {
    backgroundColor: '#E2E8F0',
  },

  continueBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  continueBtnDisabled: {
    backgroundColor: COLORS.border,
  },
  continueBtnText: {
    ...TYPOGRAPHY.subtitle,
    color: COLORS.textLight,
    fontWeight: 'bold',
  },
  dropdownBtn: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    ...SHADOWS.soft,
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  dropdownValue: {
    fontSize: 15,
    color: COLORS.textDark,
    fontWeight: 'bold',
  },
  sheetTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textDark,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 46,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: COLORS.textDark,
  },
  branchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  branchItemSelected: {
    backgroundColor: 'rgba(0, 128, 128, 0.03)',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 0,
    marginBottom: 4,
  },
  branchName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  branchNameSelected: {
    color: COLORS.primary,
  },
  branchAddress: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  }
});
