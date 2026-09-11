import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  FlatList, RefreshControl, ActivityIndicator, StatusBar
} from 'react-native';
import ScreenWrapper from '../../src/components/ScreenWrapper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiService } from '../../src/services/api';
import { COLORS, SHADOWS } from '../../src/theme/theme';

export default function DoctorPatientsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [referrals, setReferrals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'READY' | 'IN_PROGRESS'>('ALL');

  const loadPatients = useCallback(async () => {
    try {
      const res = await apiService.getDoctorPortalData('ALL');
      setReferrals(res?.referrals || []);
    } catch (e) {
      console.error('Failed to load doctor patients', e);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  const onRefresh = () => {
    setRefreshing(true);
    loadPatients();
  };

  const getStatusBadge = (status: string, hasReport: boolean) => {
    if (hasReport || status === 'COMPLETED') {
      return { bg: '#DCFCE7', text: '#15803D', label: 'Report Ready', icon: 'check-circle' as const };
    }
    if (status === 'DELIVERED_TO_LAB' || status === 'IN_LAB') {
      return { bg: '#DBEAFE', text: '#1D4ED8', label: 'In Lab (Testing)', icon: 'flask-round-bottom' as const };
    }
    if (status === 'SAMPLE_COLLECTED' || status === 'OUT_FOR_DELIVERY') {
      return { bg: '#F3E8FF', text: '#7E22CE', label: 'Sample Collected', icon: 'moped' as const };
    }
    return { bg: '#FEF3C7', text: '#B45309', label: 'Pickup Scheduled', icon: 'clock-outline' as const };
  };

  const filteredReferrals = referrals.filter(r => {
    const hasReport = !!r.report;
    if (filter === 'READY' && !hasReport) return false;
    if (filter === 'IN_PROGRESS' && hasReport) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        r.patientName?.toLowerCase().includes(q) ||
        r.bookingCode?.toLowerCase().includes(q) ||
        r.patientMobile?.includes(q)
      );
    }
    return true;
  });

  const renderHeader = () => (
    <View style={{ marginBottom: 10 }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Referred Patients & Reports</Text>
        <Text style={styles.subtitle}>Track lab test status and view verified PDF reports</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrap}>
        <MaterialCommunityIcons name="magnify" size={20} color="#94A3B8" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search patient name, mobile, booking code..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <MaterialCommunityIcons name="close-circle" size={18} color="#94A3B8" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter Pills */}
      <View style={styles.filterRow}>
        {[
          { id: 'ALL', label: `All (${referrals.length})` },
          { id: 'READY', label: `Report Ready (${referrals.filter(r => !!r.report).length})` },
          { id: 'IN_PROGRESS', label: `In Progress (${referrals.filter(r => !r.report).length})` },
        ].map(f => (
          <TouchableOpacity
            key={f.id}
            style={[styles.filterPill, filter === f.id && styles.filterPillActive]}
            onPress={() => setFilter(f.id as any)}
          >
            <Text style={[styles.filterPillText, filter === f.id && styles.filterPillTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScreenWrapper scrollable={false} backgroundColor="#F8FAFC" contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, flex: 1 }]}>
        {isLoading && !refreshing ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={filteredReferrals}
            keyExtractor={item => item.bookingId}
            ListHeaderComponent={renderHeader}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
            contentContainerStyle={{ paddingBottom: 80 + insets.bottom }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <MaterialCommunityIcons name="file-document-outline" size={48} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>No matching patient records found</Text>
                <Text style={styles.emptySub}>Ordered tests and lab reports will appear here.</Text>
              </View>
            }
            renderItem={({ item: r }) => {
              const badge = getStatusBadge(r.bookingStatus, !!r.report);
              return (
                <View style={styles.card}>
                  <View style={styles.cardTop}>
                    <View>
                      <Text style={styles.patientName}>{r.patientName}</Text>
                      <Text style={styles.patientMeta}>
                        {r.bookingCode} {r.patientGender ? `• ${r.patientGender}` : ''} {r.patientAge ? `(${r.patientAge}y)` : ''}
                      </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                      <MaterialCommunityIcons name={badge.icon} size={13} color={badge.text} />
                      <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
                    </View>
                  </View>

                  <View style={styles.testsBox}>
                    <Text style={styles.testLine} numberOfLines={2}>
                      🧪 {r.tests.map((t: any) => t.name).join(', ') || 'Diagnostic Investigation'}
                    </Text>
                  </View>

                  <View style={styles.cardBottom}>
                    <View>
                      <Text style={styles.commLabel}>Earned Commission</Text>
                      <Text style={styles.commValue}>+₹{Math.round(r.commissionAmount)}</Text>
                    </View>

                    {r.report ? (
                      <TouchableOpacity
                        style={styles.viewReportBtn}
                        onPress={() => {
                          if (r.report?.id) {
                            router.push(`/report/${r.report.id}` as any);
                          }
                        }}
                      >
                        <MaterialCommunityIcons name="file-download-outline" size={16} color="#FFFFFF" />
                        <Text style={styles.viewReportBtnText}>View Report</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.awaitingBadge}>
                        <Text style={styles.awaitingText}>Testing in Lab</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            }}
          />
        )}
      </ScreenWrapper>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 16 },
  header: { marginBottom: 14 },
  title: { fontSize: 20, fontWeight: '900', color: '#0F172A' },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0F172A' },

  filterRow: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
  },
  filterPillActive: { backgroundColor: '#006D6F' },
  filterPillText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  filterPillTextActive: { color: '#FFFFFF' },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    ...SHADOWS.soft,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  patientName: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  patientMeta: { fontSize: 12, color: '#64748B', marginTop: 2 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },

  testsBox: { backgroundColor: '#F8FAFC', padding: 8, borderRadius: 8, marginBottom: 12 },
  testLine: { fontSize: 12, color: '#334155', fontWeight: '600', lineHeight: 16 },

  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  commLabel: { fontSize: 10, color: '#64748B', fontWeight: '700' },
  commValue: { fontSize: 14, fontWeight: '900', color: '#10B981' },

  viewReportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#006D6F',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  viewReportBtnText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  awaitingBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  awaitingText: { fontSize: 11, color: '#64748B', fontWeight: '600' },

  emptyWrap: { alignItems: 'center', marginTop: 40, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: '#334155', marginTop: 12 },
  emptySub: { fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 4 },
});
