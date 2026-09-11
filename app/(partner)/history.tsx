import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, StatusBar, TextInput, ActivityIndicator
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { apiService } from '../../src/services/api';
import { COLORS, SHADOWS } from '../../src/theme/theme';

type TabType = 'Completed' | 'Rejected';

interface HistoryBooking {
  id: string;
  bookingCode: string;
  patientName: string;
  patientAge?: number | null;
  patientGender?: string | null;
  patientMobile?: string | null;
  scheduledDate: string;
  scheduledSlot: string;
  totalPaid: number;
  paymentStatus?: string;
  paymentMode?: string | null;
  collectionMode?: string;
  status: string;
  completedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  isRejected?: boolean;
  tests?: { name: string }[];
  packages?: { name: string }[];
}
export default function PartnerHistoryScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('Completed');
  const [search, setSearch] = useState('');
  const [bookings, setBookings] = useState<HistoryBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

const TABS: TabType[] = ['Completed', 'Rejected'];

const statusMap: Record<TabType, string[]> = {
    'Completed': ['DELIVERED_TO_LAB', 'PROCESSING', 'REPORT_READY', 'COMPLETED'],
    'Rejected': ['REJECTED_BY_PARTNER'],
  };
  const loadHistory = useCallback(async () => {
    try {
      const data = await apiService.getPartnerHistory();
      setBookings(data);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const onRefresh = () => { setRefreshing(true); loadHistory(); };

  const filtered = bookings.filter(b => {
    const matchesTab = statusMap[activeTab].includes(b.status);
    const matchesSearch = b.patientName.toLowerCase().includes(search.toLowerCase()) ||
      b.bookingCode.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const renderItem = ({ item }: { item: HistoryBooking }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitial}>{item.patientName[0]}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.patientName}>{item.patientName}</Text>
          <Text style={styles.bookingIdText}>ID: {item.bookingCode}</Text>
        </View>
      <View style={[
          styles.completedBadge,
          item.status === 'CANCELLED' && { backgroundColor: '#FEE2E2' },
          item.status === 'REJECTED_BY_PARTNER' && { backgroundColor: '#FEF3C7' },
        ]}>
          <MaterialCommunityIcons
            name={
              item.status === 'CANCELLED' ? 'close-circle' :
              item.status === 'REJECTED_BY_PARTNER' ? 'hand-back-left' :
              'check-circle'
            }
            size={14}
            color={
              item.status === 'CANCELLED' ? '#EF4444' :
              item.status === 'REJECTED_BY_PARTNER' ? '#D97706' :
              '#10B981'
            }
          />
          <Text style={[
            styles.completedBadgeText,
            item.status === 'CANCELLED' && { color: '#EF4444' },
            item.status === 'REJECTED_BY_PARTNER' && { color: '#D97706' },
          ]}>
            {item.status === 'CANCELLED' ? 'CANCELLED' :
             item.status === 'REJECTED_BY_PARTNER' ? 'REJECTED' :
             'COMPLETED'}
          </Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <View>
          <Text style={styles.metaLabel}>DATE & TIME</Text>
          <Text style={styles.metaValue}>
            {new Date(item.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })} • {item.scheduledSlot}
          </Text>
        </View>
        <View style={styles.amountBlock}>
          <Text style={styles.metaLabel}>AMOUNT</Text>
          <Text style={styles.amountValue}>₹{item.totalPaid.toFixed(2)}</Text>
        </View>
      </View>

   {item.completedAt && (
        <View style={styles.completedAtRow}>
          <MaterialCommunityIcons name="clock-check-outline" size={13} color="#64748B" />
          <Text style={styles.completedAtText}>
            Completed at {new Date(item.completedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      )}
      {item.rejectedAt && (
        <View style={styles.completedAtRow}>
          <MaterialCommunityIcons name="clock-remove-outline" size={13} color="#D97706" />
          <Text style={[styles.completedAtText, { color: '#D97706' }]}>
            Rejected at {new Date(item.rejectedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            {item.rejectionReason ? ` • ${item.rejectionReason}` : ''}
          </Text>
        </View>
      )}
<TouchableOpacity style={styles.detailsBtn} onPress={() => router.navigate({ pathname: '/(partner)/booking-detail', params: { bookingData: JSON.stringify(item) } } as any)}>
        <Text style={styles.detailsBtnText}>Details</Text>
        <MaterialCommunityIcons name="chevron-right" size={16} color={COLORS.primary} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      <View style={styles.searchWrap}>
        <MaterialCommunityIcons name="magnify" size={18} color="#94A3B8" />
        <TextInput
          style={styles.searchInput} placeholder="Search Patient or Booking ID"
          placeholderTextColor="#94A3B8" value={search} onChangeText={setSearch}
        />
        <MaterialCommunityIcons name="filter-variant" size={18} color="#94A3B8" />
      </View>

      <View style={styles.tabRow}>
        {TABS.map(tab => (
          <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="history" size={44} color="#CBD5E1" />
              <Text style={styles.emptyText}>No records found</Text>
              <Text style={styles.emptySubText}>Showing records for last 30 days</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

searchWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    marginHorizontal: 16, marginTop: 52, borderRadius: 12,
    borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 14, height: 46, gap: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0F172A' },
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 14, marginBottom: 8, gap: 8 },
  tab: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#fff',
  },
  tabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  tabTextActive: { color: '#fff' },
  listContent: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 14, ...SHADOWS.soft,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  avatarCircle: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#E2E8F0',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  avatarInitial: { fontSize: 18, fontWeight: '800', color: '#475569' },
  cardInfo: { flex: 1 },
  patientName: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  bookingIdText: { fontSize: 12, color: '#64748B', marginTop: 2 },
  completedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  completedBadgeText: { fontSize: 10, fontWeight: '700', color: '#059669' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  metaLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '600', marginBottom: 4 },
  metaValue: { fontSize: 13, fontWeight: '600', color: '#334155' },
  amountBlock: { alignItems: 'flex-end' },
  amountValue: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  completedAtRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  completedAtText: { fontSize: 12, color: '#64748B' },
  detailsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  detailsBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.primary, marginRight: 2 },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#94A3B8', marginTop: 14 },
  emptySubText: { fontSize: 13, color: '#CBD5E1', marginTop: 4 },
});