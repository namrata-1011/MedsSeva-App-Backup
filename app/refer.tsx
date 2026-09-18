import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Share, SafeAreaView, Platform, StatusBar, Linking, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { COLORS, SHADOWS } from '../src/theme/theme';
import { RootState } from '../src/store';
import { apiService } from '../src/services/api';

const { width } = Dimensions.get('window');

export default function ReferAndEarnScreen() {
  const router = useRouter();
  const authUser = useSelector((state: RootState) => state.auth?.user);
  const [referralCode, setReferralCode] = useState<string>((authUser as any)?.referralCode || 'MEDS9999');
  const [totalReferrals, setTotalReferrals] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  useEffect(() => {
    const fetchReferralData = async () => {
      try {
        const data = await apiService.getMyReferralInfo();
        if (data?.referralCode) {
          setReferralCode(data.referralCode);
        }
        if (data?.totalReferrals !== undefined) {
          setTotalReferrals(data.totalReferrals);
        }
      } catch (err) {
        console.error('Error fetching referral data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReferralData();
  }, []);

  const appPlayStoreUrl = 'https://play.google.com/store/apps/details?id=com.medssevaglobal.app';
  const referralLink = `https://medsseva.com/refer?code=${referralCode}`;

  const shareMessage = `Join Medsseva using my referral code ${referralCode} & get your First Lab Test 50% discount\nDownload app: ${appPlayStoreUrl}`;

  const handleCopy = async () => {
    await Clipboard.setStringAsync(referralCode);
    showToast('Referral code copied to clipboard!');
  };

  const handleViewRewards = () => {
    if (totalReferrals > 0) {
      showToast(`You have successfully referred ${totalReferrals} friends!`);
    } else {
      showToast('Share your code to start earning rewards when friends sign up!');
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: shareMessage,
        title: 'Join Medsseva & get 50% discount',
      });
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  const handleWhatsappInvite = async () => {
    try {
      const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(shareMessage)}`;
      const canOpen = await Linking.canOpenURL(whatsappUrl).catch(() => false);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        await Share.share({ message: shareMessage });
      }
    } catch (error) {
      console.log('WhatsApp share error:', error);
      await Share.share({ message: shareMessage });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="chevron-left" size={28} color="#006D6F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Refer and Earn</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Banner Poster Card */}
        <View style={styles.bannerCard}>
          <Image
            source={require('../assets/images/refer_50_poster.png')}
            style={styles.bannerImage}
            resizeMode="cover"
          />
        </View>

        {/* Hero Section */}
        <LinearGradient colors={['#E6FAFA', '#F0FDFA']} style={styles.heroSection}>
          <Text style={styles.heroTitle}>Invite Friends & Get 50% OFF!</Text>
          <Text style={styles.heroSubtitle}>
            Share your referral code with friends. When they enter your code during signup, they get 50% OFF on their First Lab Test!
          </Text>

          <LinearGradient colors={['#FEF3C7', '#DCFCE7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.codeContainer}>
            {isLoading ? (
              <ActivityIndicator color="#006D6F" style={{ marginVertical: 8 }} />
            ) : (
              <Text style={styles.codeText}>Your Code: {referralCode}</Text>
            )}
            <View style={styles.codeBtnsRow}>
              <TouchableOpacity style={styles.codeBtn} onPress={handleCopy}>
                <MaterialCommunityIcons name="content-copy" size={16} color="#006D6F" style={{ marginRight: 4 }} />
                <Text style={styles.codeBtnText}>Copy Code</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.codeBtn} onPress={handleShare}>
                <MaterialCommunityIcons name="share-variant" size={16} color="#006D6F" style={{ marginRight: 4 }} />
                <Text style={styles.codeBtnText}>Share Code</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </LinearGradient>

        {/* Start Winning Banner */}
        <LinearGradient colors={['#EDE9FE', '#F3E8FF']} style={styles.winBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.winTitle}>Your Referrals</Text>
            <Text style={styles.winSubtitle}>
              {totalReferrals > 0 ? `${totalReferrals} people joined using your code` : 'No referrals yet. Start sharing!'}
            </Text>
            <TouchableOpacity style={styles.winBtn} onPress={handleViewRewards}>
              <Text style={styles.winBtnText}>View My Rewards</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.winIconContainer}>
            <MaterialCommunityIcons name="gift" size={60} color="#8B5CF6" />
          </View>
        </LinearGradient>

        {/* 3 Simple Steps */}
        <View style={styles.stepsContainer}>
          <Text style={styles.sectionHeading}>3 Simple Steps to Refer</Text>
          <View style={styles.stepsRow}>
            <View style={styles.stepItem}>
              <MaterialCommunityIcons name="share-variant" size={40} color="#006D6F" />
              <Text style={styles.stepNum}>1</Text>
              <Text style={styles.stepTitleTxt}>Share your code</Text>
              <Text style={styles.stepDescTxt}>via WhatsApp or Social</Text>
            </View>
            <View style={styles.stepItem}>
              <MaterialCommunityIcons name="account-plus" size={40} color="#006D6F" />
              <Text style={styles.stepNum}>2</Text>
              <Text style={styles.stepTitleTxt}>Friend Signs Up</Text>
              <Text style={styles.stepDescTxt}>Types your code on registration</Text>
            </View>
            <View style={styles.stepItem}>
              <MaterialCommunityIcons name="test-tube" size={40} color="#006D6F" />
              <Text style={styles.stepNum}>3</Text>
              <Text style={styles.stepTitleTxt}>50% OFF</Text>
              <Text style={styles.stepDescTxt}>They get 50% discount on 1st lab test</Text>
            </View>
          </View>
        </View>

        {/* Sticky Footer Actions */}
        <View style={styles.stickyFooter}>
          <TouchableOpacity style={styles.referNowBtn} onPress={handleShare}>
            <MaterialCommunityIcons name="share-variant" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.referNowBtnText}>Refer Friends Now</Text>
          </TouchableOpacity>
          <View style={styles.inviteBox}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inviteTitle}>Invite via WhatsApp</Text>
              <Text style={styles.inviteDesc}>Send app link & code to WhatsApp contacts.</Text>
            </View>
            <TouchableOpacity style={styles.inviteBtn} onPress={handleWhatsappInvite}>
              <MaterialCommunityIcons name="whatsapp" size={18} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.inviteBtnText}>WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {toastMsg && (
        <View style={styles.toastContainer}>
          <MaterialCommunityIcons name="check-circle" size={20} color="#FFFFFF" />
          <Text style={styles.toastText}>{toastMsg}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  scrollContent: { padding: 16 },

  bannerCard: { width: '100%', borderRadius: 16, overflow: 'hidden', marginBottom: 16, backgroundColor: '#F8FAFC', ...SHADOWS.soft },
  bannerImage: { width: '100%', height: 380, borderRadius: 16 },

  heroSection: { borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 20 },
  heroTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', textAlign: 'center', marginBottom: 8 },
  heroSubtitle: { fontSize: 12, color: '#475569', textAlign: 'center', marginBottom: 16, paddingHorizontal: 8, lineHeight: 18 },
  heroIllustration: { width: 140, height: 100, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  codeContainer: { width: '100%', borderRadius: 12, padding: 16, alignItems: 'center' },
  codeText: { fontSize: 17, fontWeight: '800', color: '#0F766E', marginBottom: 14, letterSpacing: 1 },
  codeBtnsRow: { flexDirection: 'row', gap: 12, width: '100%' },
  codeBtn: { flex: 1, flexDirection: 'row', backgroundColor: '#FFFFFF', paddingVertical: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center', ...SHADOWS.soft },
  codeBtnText: { fontSize: 13, fontWeight: '700', color: '#0F766E' },

  winBanner: { flexDirection: 'row', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 20 },
  winTitle: { fontSize: 15, fontWeight: '800', color: '#312E81', marginBottom: 4 },
  winSubtitle: { fontSize: 11, color: '#4338CA', marginBottom: 10 },
  winBtn: { backgroundColor: '#0D9488', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start' },
  winBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  winIconContainer: { width: 70, alignItems: 'center' },

  sectionHeading: { fontSize: 15, fontWeight: '800', color: '#006D6F', textAlign: 'center', marginBottom: 16 },

  stepsContainer: { backgroundColor: '#E6FAFA', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 20 },
  stepsRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 8 },
  stepItem: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  stepNum: { fontSize: 16, fontWeight: '900', color: '#006D6F', marginVertical: 4 },
  stepTitleTxt: { fontSize: 11, fontWeight: '700', color: '#006D6F', textAlign: 'center', marginBottom: 4 },
  stepDescTxt: { fontSize: 9, color: '#64748B', textAlign: 'center', lineHeight: 13 },

  stickyFooter: { backgroundColor: '#FFFFFF', paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0', borderRadius: 16, paddingBottom: 30 },
  referNowBtn: { flexDirection: 'row', backgroundColor: '#006D6F', width: '100%', paddingVertical: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  referNowBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  inviteBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inviteTitle: { fontSize: 13, fontWeight: '700', color: '#1E293B', marginBottom: 2 },
  inviteDesc: { fontSize: 11, color: '#64748B' },
  inviteBtn: { flexDirection: 'row', backgroundColor: '#25D366', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, marginLeft: 12, alignItems: 'center' },
  inviteBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },

  toastContainer: { position: 'absolute', bottom: 60, alignSelf: 'center', backgroundColor: '#006D6F', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24, flexDirection: 'row', alignItems: 'center', ...SHADOWS.soft },
  toastText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600', marginLeft: 8 },
});
