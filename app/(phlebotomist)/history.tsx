import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, StatusBar
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenWrapper from '../../src/components/ScreenWrapper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { apiService } from '../../src/services/api';
import { COLORS, SHADOWS } from '../../src/theme/theme';
import { showError } from '../../src/store/toastStore';

interface HistoryItem {
  id: string;
  bookingCode: string;
  patientName: string;
  scheduledDate: string;
  deliveredToLabAt?: string;
  totalPaid: number;
  status: string;
  tests: { name: string }[];
}

export default function PhlebotomistHistoryScreen() {
  const insets = useSafeAreaInsets();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      const [historyRes, bookingsRes] = await Promise.all([
        apiService.getPartnerHistory().catch(() => []),
        apiService.getPartnerBookings().catch(() => []),
      ]);

      const historyList = Array.isArray(historyRes) ? historyRes : [];
      const bookingsList = Array.isArray(bookingsRes) ? bookingsRes : [];

      const seen = new Set<string>();
      const deliveredItems: HistoryItem[] = [];

      historyList.forEach((b: any) => {
        if (!b.isRejected && ['DELIVERED_TO_LAB', 'PROCESSING', 'REPORT_READY', 'COMPLETED'].includes(b.status)) {
          if (!seen.has(b.id)) {
            seen.add(b.id);
            deliveredItems.push(b);
          }
        }
      });

      bookingsList.forEach((b: any) => {
        if (['DELIVERED_TO_LAB', 'PROCESSING', 'REPORT_READY', 'COMPLETED'].includes(b.status)) {
          if (!seen.has(b.id)) {
            seen.add(b.id);
            deliveredItems.push(b);
          }
        }
      });

      setHistory(deliveredItems);
    } catch {
      setHistory([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadHistory();
  };

  const totalDelivered = history.length;
  const totalBilled = history.reduce((sum, h) => sum + (h.totalPaid || 0), 0);
  const totalEarnedCommission = Math.round(totalBilled * 0.30);

  return (
    <ScreenWrapper scrollable={false} backgroundColor="#F8FAFC">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      {/* Header with Safe Area Inset */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 6 }]}>
        <Text style={styles.headerTitle}>Earnings & Collection History</Text>
        <Text style={styles.headerSub}>Real-time 30% commission payouts from delivered samples</Text>
      </View>

      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.earningHeroCard}>
            <View style={styles.heroTop}>
              <View>
                <Text style={styles.heroLabel}>Total Commission Earned</Text>
                <Text style={styles.heroAmount}>₹{totalEarnedCommission}</Text>
              </View>
              <View style={styles.rateBadge}>
                <Text style={styles.rateBadgeText}>30% Rate</Text>
              </View>
            </View>

            <View style={styles.heroDivider} />

            <View style={styles.heroStatsRow}>
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatVal}>{totalDelivered}</Text>
                <Text style={styles.heroStatLbl}>Delivered Samples</Text>
              </View>
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatVal}>₹{totalBilled}</Text>
                <Text style={styles.heroStatLbl}>Total Test Volume</Text>
              </View>
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatVal}>Weekly</Text>
                <Text style={styles.heroStatLbl}>Payout Cycle</Text>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="history" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No completed collections yet</Text>
              <Text style={styles.emptySub}>Samples delivered to the lab will show up here along with your 30% payout.</Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const earned = Math.round((item.totalPaid || 800) * 0.30);
          return (
            <View style={styles.historyCard}>
              <View style={styles.historyCardTop}>
                <View>
                  <Text style={styles.bookingCode}>{item.bookingCode}</Text>
                  <Text style={styles.patientName}>{item.patientName}</Text>
                </View>
                <View style={styles.earnedTag}>
                  <Text style={styles.earnedTagLabel}>+ ₹{earned}</Text>
                </View>
              </View>

              <View style={styles.historyCardBottom}>
                <View style={styles.historyRow}>
                  <MaterialCommunityIcons name="flask-outline" size={14} color="#64748B" />
                  <Text style={styles.historyText} numberOfLines={1}>
                    {item.tests?.map((t: any) => t.name).join(', ') || 'Routine Investigation'}
                  </Text>
                </View>
                <View style={styles.historyRow}>
                  <MaterialCommunityIcons name="calendar-check" size={14} color="#059669" />
                  <Text style={[styles.historyText, { color: '#059669', fontWeight: '700' }]}>
                    Delivered • {new Date(item.deliveredToLabAt || item.scheduledDate || Date.now()).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            </View>
          );
        }}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  earningHeroCard: {
    backgroundColor: '#006D6F',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    ...SHADOWS.md,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  heroAmount: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 4,
  },
  rateBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rateBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginVertical: 14,
  },
  heroStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  heroStatVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroStatLbl: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    ...SHADOWS.sm,
  },
  historyCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bookingCode: {
    fontSize: 11,
    fontWeight: '800',
    color: '#006D6F',
  },
  patientName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 1,
  },
  earnedTag: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  earnedTagLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: '#065F46',
  },
  historyCardBottom: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    gap: 4,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
  },
});
