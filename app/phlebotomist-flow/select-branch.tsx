import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { COLORS, SHADOWS } from '../../src/theme/theme';
import { apiService } from '../../src/services/api';
import { showError, showSuccess } from '../../src/store/toastStore';
import ScreenWrapper from '../../src/components/ScreenWrapper';

interface Branch {
  id: string;
  name: string;
  city: string;
  line1: string;
  pincode: string;
  contactNumber?: string;
  workingHours?: string;
}

export default function SelectBranchScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [search, setSearch] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: branches = [], isLoading } = useQuery<Branch[]>({
    queryKey: ['delivery-branches'],
    queryFn: () => apiService.getDeliveryBranches(),
  });

  const filtered = branches.filter(
    b =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.city.toLowerCase().includes(search.toLowerCase()) ||
      b.line1.toLowerCase().includes(search.toLowerCase())
  );

  const handleContinue = useCallback(async () => {
    if (!selectedBranchId || !bookingId) return;
    setIsSubmitting(true);
    try {
      await apiService.selectDeliveryBranch(bookingId, selectedBranchId);
      showSuccess('Branch selected. Head to the lab now.');
    router.replace({
        pathname: '/phlebotomist-flow/deliver-sample',
        params: { bookingId },
      } as any);
    } catch (e: any) {
      showError(e?.response?.data?.error || 'Failed to select branch.');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedBranchId, bookingId]);

  const renderBranch = ({ item }: { item: Branch }) => {
    const isSelected = item.id === selectedBranchId;
    return (
      <TouchableOpacity
        style={[styles.branchCard, isSelected && styles.branchCardSelected]}
        onPress={() => setSelectedBranchId(item.id)}
        activeOpacity={0.8}
      >
        <View style={styles.branchLeft}>
          <View style={[styles.branchIcon, isSelected && styles.branchIconSelected]}>
            <MaterialCommunityIcons
              name="hospital-building"
              size={22}
              color={isSelected ? '#fff' : COLORS.primary}
            />
          </View>
          <View style={styles.branchInfo}>
            <Text style={[styles.branchName, isSelected && styles.branchNameSelected]}>
              {item.name}
            </Text>
            <Text style={styles.branchCity}>{item.city}</Text>
            <Text style={styles.branchAddress} numberOfLines={1}>
              {item.line1}, {item.pincode}
            </Text>
            {item.workingHours ? (
              <View style={styles.hoursRow}>
                <MaterialCommunityIcons name="clock-outline" size={11} color="#64748B" />
                <Text style={styles.hoursText}>{item.workingHours}</Text>
              </View>
            ) : null}
          </View>
        </View>
        {isSelected && (
          <MaterialCommunityIcons name="check-circle" size={22} color={COLORS.primary} />
        )}
      </TouchableOpacity>
    );
  };

return (
    <ScreenWrapper
      scrollable={false}
      bottomButton={
        <TouchableOpacity
          style={[
            styles.continueBtn,
            (!selectedBranchId || isSubmitting) && styles.continueBtnDisabled,
          ]}
          onPress={handleContinue}
          disabled={!selectedBranchId || isSubmitting}
          activeOpacity={0.85}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialCommunityIcons name="truck-delivery-outline" size={20} color="#fff" />
              <Text style={styles.continueBtnText}>Continue</Text>
            </>
          )}
        </TouchableOpacity>
      }
    >
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Delivery Branch</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.infoBar}>
        <MaterialCommunityIcons name="information-outline" size={16} color={COLORS.primary} />
        <Text style={styles.infoText}>
          Select the MedSeva branch where you will deliver the collected sample.
        </Text>
      </View>

      <View style={styles.searchWrap}>
        <MaterialCommunityIcons name="magnify" size={18} color="#94A3B8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or city..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <MaterialCommunityIcons name="close-circle" size={16} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading branches...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderBranch}
        contentContainerStyle={[styles.listContent, { paddingBottom: 16 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
           <MaterialCommunityIcons name="hospital-building" size={44} color="#CBD5E1" />
              <Text style={styles.emptyText}>No branches found</Text>
            </View>
          }
        />
      )}

 </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  infoBar: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#F0FDFA', borderBottomWidth: 1, borderBottomColor: '#CCFBF1',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  infoText: { flex: 1, fontSize: 13, color: '#0F172A', lineHeight: 18 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    marginHorizontal: 16, marginTop: 14, borderRadius: 12,
    borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 14, height: 46, gap: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0F172A' },
  listContent: { padding: 16, paddingBottom: 100 },
  branchCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1.5, borderColor: '#E2E8F0', marginBottom: 12, ...SHADOWS.soft,
  },
  branchCardSelected: {
    borderColor: COLORS.primary, backgroundColor: '#F0FDFA',
  },
  branchLeft: { flexDirection: 'row', alignItems: 'flex-start', flex: 1 },
  branchIcon: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: '#F0FDFA',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
    borderWidth: 1, borderColor: '#CCFBF1',
  },
  branchIconSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  branchInfo: { flex: 1 },
  branchName: { fontSize: 15, fontWeight: '800', color: '#0F172A', marginBottom: 2 },
  branchNameSelected: { color: COLORS.primary },
  branchCity: { fontSize: 12, fontWeight: '600', color: COLORS.primary, marginBottom: 2 },
  branchAddress: { fontSize: 12, color: '#64748B', marginBottom: 4 },
  hoursRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  hoursText: { fontSize: 11, color: '#64748B' },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: '#94A3B8' },
  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#94A3B8' },

  continueBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primary, height: 52, borderRadius: 14, gap: 10,
  },
  continueBtnDisabled: { backgroundColor: '#CBD5E1' },
  continueBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
