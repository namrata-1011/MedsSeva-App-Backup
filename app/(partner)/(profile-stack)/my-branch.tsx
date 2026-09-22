import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, StatusBar, Linking,
} from 'react-native';
import ScreenWrapper from '@/src/components/ScreenWrapper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { apiService } from '@/src/services/api';
import { COLORS, SHADOWS } from '@/src/theme/theme';

interface PartnerProfile {
  id: string;
  labName?: string;
  ownerName?: string;
  partnerCode?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  user?: {
    mobile?: string;
    email?: string;
  };
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <MaterialCommunityIcons name={icon as any} size={18} color={COLORS.primary} />
      </View>
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function MyBranchScreen() {
  const router = useRouter();
  const [partner, setPartner] = useState<PartnerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    (apiService as any).getPartnerProfile()
      .then((data: PartnerProfile | null) => setPartner(data))
      .catch(() => setHasError(true))
      .finally(() => setIsLoading(false));
  }, []);

  const fullAddress = [partner?.address, partner?.city, partner?.state, partner?.pincode].filter(Boolean).join(', ');
  const contactNumber = partner?.user?.mobile;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
  
      <ScreenWrapper contentContainerStyle={styles.content}>
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : hasError ? (
          <View style={styles.center}>
            <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#EF4444" />
            <Text style={styles.emptyTitle}>Failed to load branch details</Text>
          </View>
        ) : !partner?.labName ? (
          <View style={styles.center}>
            <MaterialCommunityIcons name="hospital-building" size={64} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Branch Found</Text>
            <Text style={styles.emptySubtitle}>Your branch details are not available. Please update your profile.</Text>
          </View>
        ) : (
          <>
            <View style={styles.branchCard}>
              <View style={styles.branchIconWrap}>
                <MaterialCommunityIcons name="hospital-building" size={32} color={COLORS.primary} />
              </View>
              <Text style={styles.branchName}>{partner.labName}</Text>
              {partner.partnerCode && (
                <View style={styles.codeBadge}>
                  <Text style={styles.codeText}>Branch Code: {partner.partnerCode}</Text>
                </View>
              )}
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>Branch Information</Text>
              <InfoRow
                icon="account-tie-outline"
                label="Owner / Director"
                value={partner.ownerName || 'Not specified'}
              />
              <View style={styles.divider} />
              <InfoRow
                icon="map-marker-outline"
                label="Address"
                value={fullAddress || 'Not specified'}
              />
              <View style={styles.divider} />
              <InfoRow
                icon="phone-outline"
                label="Contact Number"
                value={contactNumber || 'Not specified'}
              />
            </View>

            {contactNumber && (
              <TouchableOpacity
                style={styles.callBtn}
                onPress={() => Linking.openURL(`tel:${contactNumber}`)}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name="phone" size={20} color="#fff" />
                <Text style={styles.callBtnText}>Call Branch</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScreenWrapper>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  emptySubtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22 },
  branchCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center',
    borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16, ...SHADOWS.soft,
  },
  branchIconWrap: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#F0FDFA',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#CCFBF1', marginBottom: 14,
  },
  branchName: { fontSize: 20, fontWeight: '900', color: '#0F172A', marginBottom: 8, textAlign: 'center' },
  codeBadge: { backgroundColor: '#F0FDFA', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  codeText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  infoCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 20,
    borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16, ...SHADOWS.soft,
  },
  infoCardTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  infoIcon: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#F0FDFA',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  infoText: { flex: 1 },
  infoLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#0F172A', lineHeight: 20 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 14 },
  callBtn: {
    backgroundColor: COLORS.primary, borderRadius: 16, height: 52,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  callBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});