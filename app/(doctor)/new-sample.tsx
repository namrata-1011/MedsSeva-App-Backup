import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, StatusBar, Alert
} from 'react-native';
import ScreenWrapper from '../../src/components/ScreenWrapper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiService } from '../../src/services/api';
import { COLORS, SHADOWS } from '../../src/theme/theme';
import { showSuccess, showError } from '../../src/store/toastStore';
import * as Location from 'expo-location';

export default function DoctorNewSampleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const initialMode = params.mode === 'HANDOVER' ? 'HANDOVER' : 'PICKUP';

  const [mode, setMode] = useState<'PICKUP' | 'HANDOVER'>(initialMode);
  const [patientName, setPatientName] = useState('');
  const [patientMobile, setPatientMobile] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  // Branches for Direct Handover
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);

  // Tests Catalog & Selection
  const [availableTests, setAvailableTests] = useState<any[]>([]);
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
  const [testSearch, setTestSearch] = useState('');

  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadCatalogs = async () => {
      try {
        let lat, lng;
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            // Use last known position for instant loading, fallback to current position with low accuracy if null
            let loc = await Location.getLastKnownPositionAsync();
            if (!loc) {
              loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
            }
            if (loc) {
              lat = loc.coords.latitude;
              lng = loc.coords.longitude;
            }
          }
        } catch (e) {
          console.warn('Location permission error', e);
        }

        const [testsRes, branchesRes] = await Promise.all([
          apiService.getAllTests(),
          apiService.getBranches ? apiService.getBranches({ lat, lng }) : Promise.resolve([]),
        ]);
        setAvailableTests(Array.isArray(testsRes) ? testsRes : testsRes?.tests || []);
        const branchesData = Array.isArray(branchesRes) ? branchesRes : (branchesRes?.data || []);
        if (branchesData.length > 0) {
          setBranches(branchesData);
        }
      } catch (err) {
        console.warn('Failed to load tests or branches', err);
      } finally {
        setIsLoadingCatalogs(false);
      }
    };
    loadCatalogs();
  }, []);

  const toggleTest = (testId: string) => {
    setSelectedTestIds(prev =>
      prev.includes(testId) ? prev.filter(id => id !== testId) : [...prev, testId]
    );
  };

  const selectedTestsList = availableTests.filter(t => selectedTestIds.includes(t.id));
  const totalEstimatedPrice = selectedTestsList.reduce((sum, t) => sum + (t.price || 0), 0);
  const estimatedCommission = Math.round((totalEstimatedPrice * 30) / 100);

  const handleSubmit = async () => {
    if (!patientName.trim() || !patientMobile.trim()) {
      showError('Please enter patient name and mobile number.');
      return;
    }
    const cleanMobile = patientMobile.trim().replace(/\D/g, '').slice(-10);
    if (cleanMobile.length !== 10) {
      showError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (selectedTestIds.length === 0) {
      showError('Please select at least one test to order.');
      return;
    }
    if (mode === 'HANDOVER' && !selectedBranchId) {
      showError('Please select target lab branch.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'PICKUP') {
        await apiService.requestDoctorSamplePickup({
          patientName: patientName.trim(),
          patientMobile: cleanMobile,
          patientAge: patientAge ? Number(patientAge) : undefined,
          patientGender,
          testIds: selectedTestIds,
          address: address.trim() || 'Doctor Clinic Location',
          notes: notes.trim() || undefined,
        });
        showSuccess('Sample pickup request dispatched! Phlebotomists will collect shortly.');
      } else {
        await apiService.doctorDirectSampleHandover({
          targetBranchId: selectedBranchId,
          patientName: patientName.trim(),
          patientMobile: cleanMobile,
          patientAge: patientAge ? Number(patientAge) : undefined,
          patientGender,
          testIds: selectedTestIds,
          sampleType: 'Blood / Serum',
          notes: notes.trim() || 'Direct clinic collection',
        });
        showSuccess('Direct sample handover logged. Sample marked as delivered to lab.');
      }
      router.navigate('/(doctor)/home');
    } catch (err: any) {
      console.error('Submission failed', err);
      showError(err?.response?.data?.error || 'Failed to submit test request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTests = availableTests.filter(t =>
    (t.name?.toLowerCase() || '').includes(testSearch.toLowerCase()) ||
    (t.code?.toLowerCase() || '').includes(testSearch.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScreenWrapper
        backgroundColor="#F8FAFC"
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 8,
            paddingBottom: 80 + insets.bottom,
          },
        ]}
      >
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.navigate('/(doctor)/home')}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Patient Test Request</Text>
        </View>

        {/* Mode Selector Toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeTab, mode === 'PICKUP' && styles.modeTabActive]}
            onPress={() => setMode('PICKUP')}
          >
            <MaterialCommunityIcons
              name="moped"
              size={18}
              color={mode === 'PICKUP' ? '#FFFFFF' : '#64748B'}
            />
            <Text style={[styles.modeTabText, mode === 'PICKUP' && styles.modeTabTextActive]}>
              Book Request
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeTab, mode === 'HANDOVER' && styles.modeTabActive]}
            onPress={() => setMode('HANDOVER')}
          >
            <MaterialCommunityIcons
              name="flask-outline"
              size={18}
              color={mode === 'HANDOVER' ? '#FFFFFF' : '#64748B'}
            />
            <Text style={[styles.modeTabText, mode === 'HANDOVER' && styles.modeTabTextActive]}>
              Already Collected
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <MaterialCommunityIcons
            name="information-outline"
            size={18}
            color="#0F766E"
            style={{ marginTop: 2 }}
          />
          <Text style={styles.infoText}>
            {mode === 'PICKUP'
              ? 'Phlebotomist will reach the location to collect the sample and safely transport it to the lab.'
              : 'You have already collected the sample at your clinic. It will be dispatched directly to the lab.'}
          </Text>
        </View>

        {/* Patient Details Section */}
        <View style={styles.formCard}>
          <Text style={styles.cardHeading}>1. Patient Details</Text>

          <Text style={styles.fieldLabel}>Patient Full Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Ramesh Patel"
            placeholderTextColor="#94A3B8"
            value={patientName}
            onChangeText={setPatientName}
          />

          <Text style={styles.fieldLabel}>Mobile Number *</Text>
          <TextInput
            style={styles.input}
            placeholder="10-digit mobile number"
            placeholderTextColor="#94A3B8"
            keyboardType="phone-pad"
            value={patientMobile}
            onChangeText={setPatientMobile}
          />

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.fieldLabel}>Age</Text>
              <TextInput
                style={styles.input}
                placeholder="Years"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={patientAge}
                onChangeText={setPatientAge}
              />
            </View>

            <View style={{ flex: 1.5 }}>
              <Text style={styles.fieldLabel}>Gender</Text>
              <View style={styles.genderRow}>
                {(['Male', 'Female', 'Other'] as const).map(g => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.genderChip, patientGender === g && styles.genderChipActive]}
                    onPress={() => setPatientGender(g)}
                  >
                    <Text style={[styles.genderChipText, patientGender === g && styles.genderChipTextActive]}>
                      {g}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {mode === 'PICKUP' ? (
            <>
              <Text style={styles.fieldLabel}>Collection Address</Text>
              <TextInput
                style={[styles.input, { height: 60 }]}
                placeholder="Clinic Address or Patient Home Location"
                placeholderTextColor="#94A3B8"
                multiline
                value={address}
                onChangeText={setAddress}
              />
            </>
          ) : (
            <>
              <Text style={styles.fieldLabel}>Target Lab Branch *</Text>
              {branches.length > 0 ? (
                <View style={{ marginBottom: 14, zIndex: 10 }}>
                  <TouchableOpacity
                    style={styles.dropdownSelector}
                    activeOpacity={0.8}
                    onPress={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
                  >
                    <MaterialCommunityIcons name="hospital-building" size={18} color="#0F766E" />
                    <Text style={styles.dropdownSelectedText}>
                      {branches.find(b => b.id === selectedBranchId)?.name || 'Select Branch'} 
                      {branches.find(b => b.id === selectedBranchId)?.city && ` (${branches.find(b => b.id === selectedBranchId)?.city})`}
                    </Text>
                    <MaterialCommunityIcons 
                      name={isBranchDropdownOpen ? "chevron-up" : "chevron-down"} 
                      size={22} 
                      color="#64748B" 
                    />
                  </TouchableOpacity>

                  {isBranchDropdownOpen && (
                    <View style={styles.dropdownOptionsContainer}>
                      {branches.map(b => (
                        <TouchableOpacity
                          key={b.id}
                          style={[
                            styles.dropdownOption, 
                            selectedBranchId === b.id && styles.dropdownOptionActive
                          ]}
                          onPress={() => {
                            setSelectedBranchId(b.id);
                            setIsBranchDropdownOpen(false);
                          }}
                        >
                          <Text style={[
                            styles.dropdownOptionText, 
                            selectedBranchId === b.id && styles.dropdownOptionTextActive
                          ]}>
                            {b.name} ({b.city || 'Central Lab'})
                          </Text>
                          {selectedBranchId === b.id && (
                            <MaterialCommunityIcons name="check" size={18} color="#006D6F" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              ) : (
                <Text style={styles.helperNotice}>Default Central Diagnostic Lab</Text>
              )}
            </>
          )}

          <Text style={styles.fieldLabel}>Doctor Clinical Notes (Optional)</Text>
          <TextInput
            style={[styles.input, { height: 50 }]}
            placeholder="e.g. Fasting sample, urgent lipid profile"
            placeholderTextColor="#94A3B8"
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        {/* Test Selection Section */}
        <View style={styles.formCard}>
          <View style={styles.cardHeadingRow}>
            <Text style={styles.cardHeading}>2. Select Diagnostic Tests</Text>
            <Text style={styles.selectedCountBadge}>{selectedTestIds.length} Selected</Text>
          </View>

          <TextInput
            style={styles.searchInput}
            placeholder="Search CBC, Thyroid, HbA1c..."
            placeholderTextColor="#94A3B8"
            value={testSearch}
            onChangeText={setTestSearch}
          />

          {isLoadingCatalogs ? (
            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 15 }} />
          ) : (
            <ScrollView style={styles.testsListScroll} nestedScrollEnabled>
              {filteredTests.slice(0, 15).map(t => {
                const isSelected = selectedTestIds.includes(t.id);
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.testItem, isSelected && styles.testItemActive]}
                    onPress={() => toggleTest(t.id)}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons
                      name={isSelected ? 'checkbox-marked' : 'checkbox-blank-outline'}
                      size={20}
                      color={isSelected ? '#006D6F' : '#94A3B8'}
                    />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.testName, isSelected && styles.testNameActive]}>{t.name}</Text>
                      {t.category && (
                        <Text style={styles.testCat}>
                          {typeof t.category === 'object' ? t.category?.name : t.category}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.testPrice}>₹{t.price || 0}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Pricing & Commission Preview */}
          {selectedTestIds.length > 0 && (
            <View style={styles.priceSummaryBox}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Test Billing</Text>
                <Text style={styles.summaryValue}>₹{totalEstimatedPrice}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: '#059669', fontWeight: '800' }]}>
                  Your Commission (Approx 30%)
                </Text>
                <Text style={[styles.summaryValue, { color: '#059669', fontWeight: '900' }]}>
                  +₹{estimatedCommission}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Submit Action Button */}
        <TouchableOpacity
          style={[styles.submitBtn, isSubmitting && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.88}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <MaterialCommunityIcons
                name={mode === 'PICKUP' ? 'send' : 'check-circle-outline'}
                size={20}
                color="#FFFFFF"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.submitBtnText}>
                {mode === 'PICKUP' ? 'Book Request' : 'Already Collected'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScreenWrapper>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 16, paddingBottom: 50 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A' },

  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 11,
  },
  modeTabActive: { backgroundColor: '#006D6F' },
  modeTabText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  modeTabTextActive: { color: '#FFFFFF' },

  infoBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#F0FDFA',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    marginBottom: 16,
  },
  infoText: { fontSize: 12, color: '#0F766E', flex: 1, lineHeight: 18 },

  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    ...SHADOWS.soft,
  },
  cardHeading: { fontSize: 15, fontWeight: '900', color: '#0F172A', marginBottom: 12 },
  cardHeadingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  selectedCountBadge: {
    fontSize: 11, fontWeight: '800', color: '#006D6F',
    backgroundColor: '#CCFBF1', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
  },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 46,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 14,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  genderRow: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  genderChip: {
    flex: 1,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  genderChipActive: { backgroundColor: '#006D6F', borderColor: '#006D6F' },
  genderChipText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  genderChipTextActive: { color: '#FFFFFF' },

  dropdownSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
  },
  dropdownSelectedText: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
    marginLeft: 8,
  },
  dropdownOptionsContainer: {
    marginTop: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    overflow: 'hidden',
    ...SHADOWS.soft,
  },
  dropdownOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownOptionActive: {
    backgroundColor: '#F0FDFA',
  },
  dropdownOptionText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  dropdownOptionTextActive: {
    color: '#006D6F',
    fontWeight: '700',
  },
  helperNotice: { fontSize: 12, color: '#64748B', fontStyle: 'italic', marginBottom: 14 },

  searchInput: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 13,
    color: '#0F172A',
    marginBottom: 10,
  },
  testsListScroll: { maxHeight: 220, marginBottom: 10 },
  testItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  testItemActive: { backgroundColor: '#F0FDFA', borderRadius: 8, paddingHorizontal: 6 },
  testName: { fontSize: 13, fontWeight: '700', color: '#334155' },
  testNameActive: { color: '#006D6F' },
  testCat: { fontSize: 10, color: '#94A3B8' },
  testPrice: { fontSize: 13, fontWeight: '800', color: '#0F172A' },

  priceSummaryBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 6,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  summaryLabel: { fontSize: 12, color: '#475569', fontWeight: '600' },
  summaryValue: { fontSize: 13, color: '#0F172A', fontWeight: '800' },

  submitBtn: {
    backgroundColor: '#006D6F',
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.soft,
  },
  submitBtnText: { fontSize: 16, fontWeight: '900', color: '#FFFFFF' },
});
