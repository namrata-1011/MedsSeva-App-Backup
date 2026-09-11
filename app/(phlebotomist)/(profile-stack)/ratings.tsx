import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, StatusBar,
} from 'react-native';
import ScreenWrapper from '@/src/components/ScreenWrapper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { apiService } from '@/src/services/api';
import { COLORS, SHADOWS } from '@/src/theme/theme';

interface RatingsData {
  overallRating: number;
  totalReviews: number;
  totalCollections: number;
  collectionSuccessRate: number;
  averageArrivalTime: string;
  breakdown: Record<number, number>;
  reviews: { id: string; customerName: string; rating: number; comment?: string; bookingCode?: string; createdAt: string }[];
}
function StarRow({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <MaterialCommunityIcons
          key={i}
          name={i <= Math.round(rating) ? 'star' : 'star-outline'}
          size={14}
          color="#F59E0B"
        />
      ))}
    </View>
  );
}

export default function RatingsScreen() {
  const router = useRouter();
  const [data, setData] = useState<RatingsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

 useEffect(() => {
    apiService.getPartnerRatings()
      .then(setData)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const maxBreakdown = data ? Math.max(...Object.values(data.breakdown), 1) : 1;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
 

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : !data ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="star-off" size={48} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>No ratings yet</Text>
        </View>
   ) : (
        <ScreenWrapper contentContainerStyle={styles.content}>
          <View style={styles.overallCard}>
            <View style={styles.overallLeft}>
              <Text style={styles.overallScore}>{data.overallRating.toFixed(1)}</Text>
              <StarRow rating={data.overallRating} />
              <Text style={styles.overallReviews}>{data.totalReviews} reviews</Text>
            </View>
            <View style={styles.overallRight}>
              {[5, 4, 3, 2, 1].map(star => {
                const count = data.breakdown[star] || 0;
                const pct = (count / maxBreakdown) * 100;
                return (
                  <View key={star} style={styles.breakdownRow}>
                    <Text style={styles.breakdownStar}>{star}</Text>
                    <MaterialCommunityIcons name="star" size={10} color="#F59E0B" />
                    <View style={styles.breakdownBarBg}>
                      <View style={[styles.breakdownBarFill, { width: `${pct}%` }]} />
                    </View>
                    <Text style={styles.breakdownCount}>{count}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <MaterialCommunityIcons name="clipboard-check-outline" size={24} color={COLORS.primary} />
              <Text style={styles.statValue}>{data.totalCollections.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Total Collections</Text>
            </View>
            <View style={styles.statCard}>
              <MaterialCommunityIcons name="percent" size={24} color="#10B981" />
              <Text style={[styles.statValue, { color: '#10B981' }]}>{data.collectionSuccessRate}%</Text>
              <Text style={styles.statLabel}>Success Rate</Text>
            </View>
            <View style={styles.statCard}>
              <MaterialCommunityIcons name="clock-fast" size={24} color="#3B82F6" />
              <Text style={[styles.statValue, { color: '#3B82F6', fontSize: 16 }]}>{data.averageArrivalTime}</Text>
              <Text style={styles.statLabel}>Avg Arrival</Text>
            </View>
          </View>

          {data.reviews.length === 0 ? (
            <View style={styles.noReviewsCard}>
              <MaterialCommunityIcons name="comment-outline" size={40} color="#CBD5E1" />
              <Text style={styles.noReviewsText}>No customer reviews yet</Text>
              <Text style={styles.noReviewsSub}>Reviews from completed bookings will appear here</Text>
            </View>
          ) : (
            <View style={styles.reviewsCard}>
              <Text style={styles.reviewsTitle}>Customer Reviews</Text>
              {data.reviews.map((review, idx) => (
                <View key={review.id}>
                  {idx > 0 && <View style={styles.divider} />}
                  <View style={styles.reviewItem}>
                    <View style={styles.reviewHeader}>
                      <View style={styles.reviewAvatar}>
                        <Text style={styles.reviewAvatarText}>{review.customerName?.[0] || '?'}</Text>
                      </View>
                      <View style={styles.reviewMeta}>
                        <Text style={styles.reviewName}>{review.customerName}</Text>
                        <StarRow rating={review.rating} />
                      </View>
                      <Text style={styles.reviewDate}>
                        {new Date(review.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </Text>
                    </View>
             {review.bookingCode && (
                      <Text style={[styles.reviewDate, { marginTop: 2 }]}>#{review.bookingCode}</Text>
                    )}
                    {review.comment && <Text style={styles.reviewComment}>{review.comment}</Text>}
                  </View>
                </View>
              ))}
            </View>
      )}
        </ScreenWrapper>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  content: { padding: 16, paddingBottom: 40 },
  overallCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20, flexDirection: 'row',
    borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 12, ...SHADOWS.soft,
  },
  overallLeft: { alignItems: 'center', justifyContent: 'center', marginRight: 20, minWidth: 80 },
  overallScore: { fontSize: 48, fontWeight: '900', color: '#0F172A', lineHeight: 54 },
  overallReviews: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
  overallRight: { flex: 1, justifyContent: 'center', gap: 6 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  breakdownStar: { fontSize: 12, fontWeight: '700', color: '#64748B', width: 10 },
  breakdownBarBg: { flex: 1, height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' },
  breakdownBarFill: { height: '100%', backgroundColor: '#F59E0B', borderRadius: 3 },
  breakdownCount: { fontSize: 11, color: '#94A3B8', width: 16, textAlign: 'right' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, alignItems: 'center',
    borderWidth: 1, borderColor: '#E2E8F0', gap: 4, ...SHADOWS.soft,
  },
  statValue: { fontSize: 20, fontWeight: '900', color: '#0F172A' },
  statLabel: { fontSize: 10, color: '#94A3B8', textAlign: 'center', fontWeight: '600' },
  noReviewsCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 32, alignItems: 'center',
    borderWidth: 1, borderColor: '#E2E8F0', gap: 8, ...SHADOWS.soft,
  },
  noReviewsText: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  noReviewsSub: { fontSize: 13, color: '#94A3B8', textAlign: 'center' },
  reviewsCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 20,
    borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.soft,
  },
  reviewsTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 16 },
  reviewItem: { paddingVertical: 4 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  reviewAvatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#F0FDFA',
    justifyContent: 'center', alignItems: 'center',
  },
  reviewAvatarText: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  reviewMeta: { flex: 1 },
  reviewName: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  reviewDate: { fontSize: 11, color: '#94A3B8' },
  reviewComment: { fontSize: 13, color: '#64748B', lineHeight: 20 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },
});
