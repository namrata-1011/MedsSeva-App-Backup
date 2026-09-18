import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, DeviceEventEmitter, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useQueryClient, QueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { getMessaging, onMessage } from '@react-native-firebase/messaging';

import { COLORS, TYPOGRAPHY, SHADOWS } from '../../src/theme/theme';
import { apiService } from '../../src/services/api';
import { RootState } from '../../src/store';
import { useDispatch } from 'react-redux';
import { clearCart, addToCart } from '../../src/store/slices/cartSlice';


export default function BookingsScreen() {
const router = useRouter();
  const dispatch = useDispatch();
const [activeFilter, setActiveFilter] = useState<'all' | 'completed' | 'cancelled'>('all');

  const user = useSelector((state: RootState) => state.auth.user);
  
  const { data: rawBookings = [], isLoading, refetch } = useQuery({
    queryKey: ['bookings', user?.mobile],
    queryFn: () => apiService.getBookings(user?.mobile || ''),
    enabled: !!user?.mobile,
  });

const queryClient = useQueryClient();

  const prefetchBookingDetail = (bookingId: string) => {
    const raw = rawBookings.find((b: any) => b.id === bookingId);
    if (raw) {
      queryClient.setQueryData(['bookingDetail', bookingId], raw);
    }
  };

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('bookingCreated', () => {
      refetch();
    });
    return () => sub.remove();
  }, [refetch]);

useEffect(() => {
    const unsub = onMessage(getMessaging(), async (msg) => {
      const type = msg.data?.type;
      if (
        type === 'BOOKING_CREATED' ||
        type === 'BOOKING_ACCEPTED' ||
        type === 'BOOKING_REJECTED' ||
        type === 'BOOKING_CANCELLED' ||
        type === 'BOOKING_RESCHEDULED' ||
        type === 'PARTNER_ON_THE_WAY' ||
        type === 'PARTNER_ARRIVED' ||
        type === 'SAMPLE_COLLECTED' ||
        type === 'SAMPLE_RECEIVED_IN_LAB' ||
        type === 'PAYMENT_SUCCESS' ||
        type === 'PAYMENT_FAILED'
      ) {
        refetch();
      }
    });
    return unsub;
  }, [refetch]);

  const bookings = React.useMemo(() => {
    return rawBookings.map((b: any) => {
      const testNames = b.tests?.map((t: any) => t.test?.name).join(', ') || 'Diagnostic Test';
      
     const scheduledDate = b.scheduledDate ? new Date(b.scheduledDate) : null;
    const isPast = scheduledDate ? scheduledDate < new Date() : false;

 let mappedStatus = 'Upcoming';
    if (b.status === 'COMPLETED') mappedStatus = 'Completed';
    else if (b.status === 'CANCELLED') mappedStatus = 'Cancelled';
    else if (b.status === 'REJECTED') mappedStatus = 'Cancelled';
    else if (b.status === 'PENDING' && isPast) mappedStatus = 'Upcoming';
    else if (b.status === 'WAITING_FOR_PARTNER') mappedStatus = 'Upcoming';
      
      const slotDate = b.scheduledDate ? new Date(b.scheduledDate).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }) : 'TBD';

      return {
        id: b.id.substring(0, 8).toUpperCase(),
        realId: b.id,
        rawStatus: b.status,
        testName: testNames,
        date: slotDate,
        time: b.scheduledSlot || 'Morning Slot',
        status: mappedStatus,
        patient: b.patientName || user?.name || 'Self',
        homeCollection: b.collectionMode === 'HOME',
      };
    });
  }, [rawBookings, user]);

const FILTER_CHIPS: { key: 'all' | 'completed' | 'cancelled'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const EMPTY_STATE: Record<string, { icon: string; title: string; subtitle: string; showBook: boolean }> = {
  all: { icon: 'calendar-blank-outline', title: 'No Bookings Yet', subtitle: 'You have not made any bookings yet.', showBook: true },
  completed: { icon: 'calendar-check-outline', title: 'No completed bookings yet.', subtitle: 'Once your tests are done, your completed bookings will show up here.', showBook: true },
  cancelled: { icon: 'calendar-remove-outline', title: 'No cancelled bookings yet.', subtitle: 'Cancelled appointments will appear here if any booking is cancelled.', showBook: false },
};

const filteredBookings = React.useMemo(() => {
  if (activeFilter === 'all') return bookings;
  if (activeFilter === 'completed') return bookings.filter((b: any) => b.status === 'Completed');
  if (activeFilter === 'cancelled') return bookings.filter((b: any) => b.status === 'Cancelled');
  return [] as typeof bookings;
}, [bookings, activeFilter]);

const emptyState = EMPTY_STATE[activeFilter] ?? EMPTY_STATE['all'];
const renderBookingCard = ({ item }: { item: any }) => (
    <View style={styles.bookingCard}>
      <View style={styles.cardHeader}>
        <View style={styles.badgeRow}>
  <View style={[
            styles.statusBadge,
            item.status === 'Upcoming' ? styles.statusUpcoming :
            item.status === 'Completed' ? styles.statusCompleted :
            item.status === 'Rejected' ? styles.statusRejected : styles.statusCancelled
          ]}>
            <Text style={[
              styles.statusText,
              item.status === 'Upcoming' ? styles.statusTextUpcoming :
              item.status === 'Completed' ? styles.statusTextCompleted :
              item.status === 'Rejected' ? styles.statusTextRejected : styles.statusTextCancelled
            ]}>
            {item.status === 'Upcoming' ? 'PENDING' : item.status}
            </Text>
          </View>
          <Text style={styles.bookingId}>#{item.id}</Text>
        </View>
      </View>

      <Text style={styles.testName}>{item.testName}</Text>
      
      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <MaterialCommunityIcons name="calendar-month-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.detailText}>{item.date}</Text>
        </View>
        <View style={styles.detailItem}>
          <MaterialCommunityIcons name="clock-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.detailText}>{item.time}</Text>
        </View>
      </View>

      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <MaterialCommunityIcons name="account-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.detailText}>{item.patient}</Text>
        </View>
        {item.homeCollection && (
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="home-plus-outline" size={16} color={COLORS.success} />
            <Text style={[styles.detailText, { color: COLORS.success }]}>Home Sample</Text>
          </View>
        )}
      </View>

<View style={styles.actionRow}>
<TouchableOpacity
          style={styles.actionButtonDetails}
          onPress={() => {
            prefetchBookingDetail(item.realId);
            router.push(`/booking/${item.realId}` as any);
          }}
        >
          <MaterialCommunityIcons name="clipboard-text-outline" size={14} color={COLORS.primary} />
          <Text style={styles.actionButtonTextDetails}>Details</Text>
        </TouchableOpacity>
       {item.status === 'Upcoming' ? (
          <>
            <TouchableOpacity
              style={styles.actionButtonSecondary}
              onPress={() => {
                const raw = rawBookings.find((b: any) => b.id === item.realId);
                if (!raw) {
                  router.push('/search');
                  return;
                }

                const hasTests = (raw.tests || []).some((t: any) => !!t.test);
                const hasPackages = (raw.packages || []).some((p: any) => !!p.package);

                if (!hasTests && !hasPackages) {
                  router.push('/search');
                  return;
                }

                dispatch(clearCart());

                (raw.tests || []).forEach((t: any) => {
                  if (t.test) {
                    dispatch(addToCart({
                      id: t.test.id,
                      itemType: 'test',
                      name: t.test.name,
                      price: t.test.price,
                      discountedPrice: t.test.discountedPrice,
                      homeCollection: t.test.homeCollection ?? true,
                      quantity: 1,
                    }));
                  }
                });

                (raw.packages || []).forEach((p: any) => {
                  if (p.package) {
                    dispatch(addToCart({
                      id: p.package.id,
                      itemType: 'package',
                      name: p.package.name,
                      price: p.package.oldPrice ?? p.package.price,
                      discountedPrice: p.package.price,
                      homeCollection: p.package.homeCollection ?? true,
                      quantity: 1,
                    }));
                  }
                });

                router.push('/checkout/cart');
              }}
            >
              <Text style={styles.actionButtonTextSecondary}>Reschedule</Text>
            </TouchableOpacity>
    {item.homeCollection ? (
              <TouchableOpacity
                style={styles.actionButtonPrimary}
                onPress={() => router.push(`/tracking/${(item as any).realId}` as any)}
              >
                <Text style={styles.actionButtonTextPrimary}>
                  {(item as any).rawStatus === 'WAITING_FOR_PARTNER' ? 'Live Track' : 'Track Tech'}
                </Text>
              </TouchableOpacity>
      ) : (
              <TouchableOpacity
                style={[styles.actionButtonPrimary, { backgroundColor: COLORS.success }]}
                onPress={() => router.push(`/tracking/lab/${(item as any).realId}` as any)}
              >
                <Text style={styles.actionButtonTextPrimary}>Lab Info</Text>
              </TouchableOpacity>
            )}
          </>
) : item.status === 'Completed' ? (
          <>
            {(item as any).homeCollection && (item as any).rawStatus !== 'CANCELLED' && (() => {
              const raw = rawBookings.find((b: any) => b.id === (item as any).realId);
              const rateableStatuses = ['DELIVERED_TO_LAB', 'PROCESSING', 'REPORT_READY', 'COMPLETED'];
              const canRate = raw && rateableStatuses.includes(raw.status) && raw.collectionMode === 'HOME' && raw.assignedPartnerId;
              if (!canRate) return null;
              return (
                <TouchableOpacity
                  style={styles.rateButton}
                  onPress={() => router.push({
                    pathname: `/rating/${(item as any).realId}`,
                    params: {
                      bookingCode: raw.bookingCode,
                      partnerName: raw.assignedPartner?.user?.name || '',
                    },
                  } as any)}
                >
                  <MaterialCommunityIcons name="star-outline" size={14} color="#F59E0B" />
                  <Text style={styles.rateButtonText}>Rate</Text>
                </TouchableOpacity>
              );
            })()}
            <TouchableOpacity
              style={styles.actionButtonPrimary}
              onPress={() => router.push('/(tabs)/reports')}
            >
              <Text style={styles.actionButtonTextPrimary}>View Report</Text>
            </TouchableOpacity>
          </>
        ) : null}
      </View>
</View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <TouchableOpacity style={styles.helpButton} onPress={() => router.push('/support' as any)}>
          <MaterialCommunityIcons name="headset" size={24} color={COLORS.textLight} />
        </TouchableOpacity>
      </View>

<View style={styles.filtersWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
        >
         {FILTER_CHIPS.map(chip => (
            <TouchableOpacity
              key={chip.key}
              style={[styles.chip, activeFilter === chip.key && styles.chipActive]}
              onPress={() => setActiveFilter(chip.key as 'all' | 'completed' | 'cancelled')}
              activeOpacity={0.75}
            >
              <Text style={[styles.chipText, activeFilter === chip.key && styles.chipTextActive]}>
                {chip.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Bookings List */}
      {isLoading && bookings.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={{ marginTop: 10, color: COLORS.textSecondary, fontSize: 13 }}>Loading Bookings...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredBookings}
          keyExtractor={(item: any) => item.id}
          renderItem={renderBookingCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={isLoading}
          onRefresh={refetch}
 ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons
                name={emptyState.icon as any}
                size={72}
                color={COLORS.border}
              />
              <Text style={styles.emptyTitle}>{emptyState.title}</Text>
              <Text style={styles.emptySubtitle}>{emptyState.subtitle}</Text>
              {emptyState.showBook && (
                <TouchableOpacity style={styles.browseButton} onPress={() => router.push('/search')}>
                  <Text style={styles.browseButtonText}>Book a Test</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  headerTitle: {
    ...TYPOGRAPHY.h1,
    color: COLORS.textLight,
  },
  helpButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
filtersWrapper: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 14,
  },
  filtersContent: {
    paddingHorizontal: 16,
    gap: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 50,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  bookingCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.soft,
  },
  cardHeader: {
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookingId: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusUpcoming: {
    backgroundColor: '#E0F2FE',
  },
  statusCompleted: {
    backgroundColor: COLORS.successLight,
  },
statusCancelled: {
    backgroundColor: COLORS.dangerLight,
  },
  statusRejected: {
    backgroundColor: '#FEF2F2',
  },
  statusText: {
    ...TYPOGRAPHY.caption,
    fontWeight: 'bold',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  statusTextUpcoming: {
    color: '#0284C7',
  },
  statusTextCompleted: {
    color: COLORS.success,
  },
statusTextCancelled: {
    color: COLORS.danger,
  },
  statusTextRejected: {
    color: '#DC2626',
  },
  testName: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textDark,
    marginBottom: 16,
  },
  detailsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginLeft: 6,
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 16,
    marginTop: 8,
  },
actionButtonDetails: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginRight: 8,
  },
  actionButtonTextDetails: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 11,
  },
  actionButtonSecondary: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 30,
    backgroundColor: '#F1F5F9',
    marginRight: 10,
  },
  actionButtonPrimary: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 30,
    backgroundColor: COLORS.accent, // Pink primary
  },
  actionButtonTextSecondary: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textDark,
    fontWeight: 'bold',
  },
  actionButtonTextPrimary: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textLight,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textDark,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
  },
browseButtonText: {
    ...TYPOGRAPHY.subtitle,
    color: COLORS.textLight,
    fontWeight: 'bold',
  },
  rateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 12,
    borderRadius: 30,
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    marginRight: 10,
  },
  rateButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F59E0B',
  },
});