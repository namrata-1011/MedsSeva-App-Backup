import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform, StatusBar, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SHADOWS } from '../src/theme/theme';
import { apiService } from '../src/services/api';

const { width } = Dimensions.get('window');

interface Transaction {
  id: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  description: string;
  createdAt: string;
}

export default function WalletScreen() {
  const router = useRouter();
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    try {
      const data = await apiService.getWallet();
      if (data) {
        setBalance(data.balance || 0);
        setTransactions(data.transactions || []);
      }
    } catch (err) {
      console.error('Failed to fetch wallet data', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="chevron-left" size={28} color="#006D6F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Wallet</Text>
        <View style={{ width: 28 }} />
      </View>

      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#006D6F" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Balance Card */}
          <LinearGradient colors={['#006D6F', '#00979A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Total Available Balance</Text>
            <View style={styles.balanceRow}>
              <MaterialCommunityIcons name="currency-inr" size={36} color="#FFFFFF" />
              <Text style={styles.balanceAmount}>{balance.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.cardGlow} />
          </LinearGradient>

          {/* Transactions */}
          <Text style={styles.sectionTitle}>Transaction History</Text>
          
          {transactions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="history" size={50} color="#CBD5E1" />
              <Text style={styles.emptyText}>No transactions yet.</Text>
              <Text style={styles.emptySubText}>Refer friends to start earning rewards!</Text>
            </View>
          ) : (
            transactions.map((txn) => (
              <View key={txn.id} style={styles.txnCard}>
                <View style={[styles.txnIconBox, { backgroundColor: txn.type === 'CREDIT' ? '#DCFCE7' : '#FEE2E2' }]}>
                  <MaterialCommunityIcons 
                    name={txn.type === 'CREDIT' ? 'arrow-down-bold' : 'arrow-up-bold'} 
                    size={20} 
                    color={txn.type === 'CREDIT' ? '#16A34A' : '#EF4444'} 
                  />
                </View>
                <View style={styles.txnDetails}>
                  <Text style={styles.txnDesc} numberOfLines={1}>{txn.description}</Text>
                  <Text style={styles.txnDate}>{formatDate(txn.createdAt)}</Text>
                </View>
                <View style={styles.txnAmountBox}>
                  <Text style={[styles.txnAmount, { color: txn.type === 'CREDIT' ? '#16A34A' : '#EF4444' }]}>
                    {txn.type === 'CREDIT' ? '+' : '-'}₹{txn.amount}
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 16 },

  balanceCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    overflow: 'hidden',
    position: 'relative',
    ...SHADOWS.medium,
  },
  balanceLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  balanceRow: { flexDirection: 'row', alignItems: 'center' },
  balanceAmount: { color: '#FFFFFF', fontSize: 36, fontWeight: '900', letterSpacing: 1 },
  cardGlow: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },

  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#334155', marginBottom: 12 },
  
  txnCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    ...SHADOWS.soft,
  },
  txnIconBox: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  txnDetails: { flex: 1 },
  txnDesc: { fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
  txnDate: { fontSize: 12, color: '#64748B' },
  txnAmountBox: { alignItems: 'flex-end', justifyContent: 'center' },
  txnAmount: { fontSize: 15, fontWeight: '800' },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#64748B', marginTop: 12 },
  emptySubText: { fontSize: 13, color: '#94A3B8', marginTop: 4 },
});
