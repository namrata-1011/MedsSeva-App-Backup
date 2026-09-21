import React, { useState, useCallback,useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { apiService } from '../services/api';
import { COLORS, SHADOWS } from '../theme/theme';
import { showError } from '../store/toastStore';
import { getDeepLinkRoute } from '../services/notificationService';

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  deepLink: string | null;
  data: Record<string, string>;
  createdAt: string;
}

const TYPE_ICON: Record<string, { icon: string; color: string; bg: string }> = {
  BOOKING_CREATED: { icon: 'calendar-plus', color: '#059669', bg: '#DCFCE7' },
  BOOKING_ACCEPTED: { icon: 'calendar-check', color: '#0369A1', bg: '#E0F2FE' },
  BOOKING_REJECTED: { icon: 'calendar-remove', color: '#DC2626', bg: '#FEE2E2' },
  BOOKING_CANCELLED: { icon: 'calendar-cancel', color: '#DC2626', bg: '#FEE2E2' },
  BOOKING_CANCELLED_BY_USER: { icon: 'calendar-cancel', color: '#DC2626', bg: '#FEE2E2' },
  PARTNER_ON_THE_WAY: { icon: 'map-marker-path', color: '#7C3AED', bg: '#EDE9FE' },
  PARTNER_ARRIVED: { icon: 'map-marker-check', color: '#7C3AED', bg: '#EDE9FE' },
  SAMPLE_COLLECTED: { icon: 'test-tube', color: '#D97706', bg: '#FEF3C7' },
  SAMPLE_RECEIVED_IN_LAB: { icon: 'flask', color: '#0369A1', bg: '#E0F2FE' },
  REPORT_READY: { icon: 'file-document-check', color: '#059669', bg: '#DCFCE7' },
  REPORT_SENT: { icon: 'file-send', color: '#059669', bg: '#DCFCE7' },
  REPORT_APPROVED: { icon: 'file-certificate', color: '#059669', bg: '#DCFCE7' },
  PAYMENT_SUCCESS: { icon: 'check-circle', color: '#059669', bg: '#DCFCE7' },
  PAYMENT_FAILED: { icon: 'close-circle', color: '#DC2626', bg: '#FEE2E2' },
  NEW_CHAT_MESSAGE: { icon: 'message', color: '#7C3AED', bg: '#EDE9FE' },
  SUPPORT_REPLY: { icon: 'headset', color: '#7C3AED', bg: '#EDE9FE' },
  NEW_OFFER: { icon: 'tag', color: '#D97706', bg: '#FEF3C7' },
  NEW_PACKAGE: { icon: 'package-variant', color: COLORS.primary, bg: '#F0FDFA' },
  APPOINTMENT_REMINDER: { icon: 'bell-ring', color: '#D97706', bg: '#FEF3C7' },
  BROADCAST: { icon: 'bullhorn', color: COLORS.primary, bg: '#F0FDFA' },
};

const getTimeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
};

export const NotificationCenter: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchNotifications = useCallback(async (pageNum = 1, reset = false) => {
    try {
      const res = await apiService.getMyNotifications(pageNum);
      if (reset || pageNum === 1) {
        setNotifications(res.notifications);
      } else {
        setNotifications(prev => [...prev, ...res.notifications]);
      }
      setUnreadCount(res.unreadCount);
      setHasMore(res.pagination.hasMore);
      setPage(pageNum);
    } catch {
      showError('Failed to load notifications');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

useEffect(() => {
    setIsLoading(true);
    fetchNotifications(1, true);
  }, [fetchNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications(1, true);
  };

  const loadMore = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    fetchNotifications(page + 1);
  };

  const handleMarkRead = async (id: string) => {
    try {
      await apiService.markNotificationRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await apiService.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      showError('Failed to mark all as read');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiService.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch {
      showError('Failed to delete notification');
    }
  };

  const handlePress = async (item: NotificationItem) => {
    if (!item.isRead) await handleMarkRead(item.id);
    const route = getDeepLinkRoute({ type: item.type, ...item.data });
    if (route) {
      onClose?.();
      router.push(route as any);
    }
  };

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const meta = TYPE_ICON[item.type] || { icon: 'bell', color: COLORS.primary, bg: '#F0FDFA' };
    return (
      <TouchableOpacity
        style={[styles.item, !item.isRead && styles.itemUnread]}
        onPress={() => handlePress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconBox, { backgroundColor: meta.bg }]}>
          <MaterialCommunityIcons name={meta.icon as any} size={22} color={meta.color} />
        </View>
        <View style={styles.itemContent}>
          <View style={styles.itemTopRow}>
            <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
            {!item.isRead && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.itemBody} numberOfLines={2}>{item.body}</Text>
          <Text style={styles.itemTime}>{getTimeAgo(item.createdAt)}</Text>
        </View>
        <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
          <MaterialCommunityIcons name="close" size={16} color="#94A3B8" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={{ marginRight: 12 }}>
              <MaterialCommunityIcons name="arrow-left" size={24} color="#0F172A" />
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>
        <View style={styles.headerRight}>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllBtn}>
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {unreadCount > 0 && (
        <View style={styles.unreadBanner}>
          <MaterialCommunityIcons name="bell-badge" size={16} color={COLORS.primary} />
          <Text style={styles.unreadBannerText}>{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</Text>
        </View>
      )}

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="bell-sleep-outline" size={56} color="#CBD5E1" />
          <Text style={styles.emptyText}>No notifications yet</Text>
          <Text style={styles.emptySubText}>You're all caught up!</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item: NotificationItem) => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          contentContainerStyle={{ paddingBottom: 32 }}
          ListFooterComponent={
            loadingMore ? <ActivityIndicator color={COLORS.primary} style={{ margin: 16 }} /> : null
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#0F172A' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  markAllBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: '#F0FDFA', borderRadius: 8,
    borderWidth: 1, borderColor: '#CCFBF1',
  },
  markAllText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  unreadBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F0FDFA', paddingHorizontal: 20, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#CCFBF1',
  },
  unreadBannerText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  item: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  itemUnread: { backgroundColor: '#FAFEFF' },
  iconBox: {
    width: 44, height: 44, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12, flexShrink: 0,
  },
  itemContent: { flex: 1 },
  itemTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  itemTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', flex: 1 },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: COLORS.primary, marginLeft: 6,
  },
  itemBody: { fontSize: 13, color: '#475569', lineHeight: 18, marginBottom: 4 },
  itemTime: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  deleteBtn: { padding: 4, marginLeft: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#94A3B8', marginTop: 16 },
  emptySubText: { fontSize: 13, color: '#CBD5E1', marginTop: 4 },
});