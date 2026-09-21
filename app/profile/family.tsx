import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  Modal, 
  Platform, 
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView
} from 'react-native';
import ScreenWrapper from '../../src/components/ScreenWrapper';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { RootState, AppDispatch } from '../../src/store';
import { addFamilyMemberThunk, removeFamilyMemberThunk, fetchFamilyMembers, FamilyMember } from '../../src/store/slices/familySlice';
import { COLORS, TYPOGRAPHY, SHADOWS } from '../../src/theme/theme';
import { showSuccess, showError, showInfo } from '../../src/store/toastStore';
import { ConfirmSheet } from '../../src/components/ConfirmSheet';

type RelationType = FamilyMember['relation'];

export default function FamilyMembersScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { members, loading } = useSelector((state: RootState) => state.family);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [relation, setRelation] = useState<RelationType>('Wife');
const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    dispatch(fetchFamilyMembers());
  }, [dispatch]);

  const resetForm = () => {
    setName('');
    setAge('');
    setGender('male');
    setRelation('Wife');
  };

  const handleAddMember = async () => {
if (!name.trim()) {
      showInfo("Please enter your family member's name.");
      return;
    }

    setIsSaving(true);
    try {
      await dispatch(addFamilyMemberThunk({
        name: name.trim(),
        relation,
        gender,
        age: age ? parseInt(age) : undefined,
      })).unwrap();
      
    showSuccess(`${name} added to your family successfully!`);
      setIsModalVisible(false);
      resetForm();
    } catch (err: any) {
     showError(err || "Failed to add family member");
    } finally {
      setIsSaving(false);
    }
  };

const handleDeleteMember = (id: string, memberName: string) => {
    setDeleteTarget({ id, name: memberName });
  };

  const confirmDeleteMember = async () => {
    if (!deleteTarget) return;
    const { id } = deleteTarget;
    setDeleteTarget(null);
    try {
      await dispatch(removeFamilyMemberThunk(id)).unwrap();
    } catch (err: any) {
      showError(err || "Failed to remove family member");
    }
  };

  return (
 <View style={styles.container}>
      <ConfirmSheet
        visible={deleteTarget !== null}
        title="Remove Member"
        message={`Are you sure you want to remove ${deleteTarget?.name} from your family profile?`}
        confirmLabel="Remove"
        cancelLabel="Cancel"
        confirmDestructive
        onConfirm={confirmDeleteMember}
        onCancel={() => setDeleteTarget(null)}
      />
      {/* Custom App Bar Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textLight} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Family Members</Text>
        <View style={{ width: 24 }} />
      </View>

     <ScreenWrapper contentContainerStyle={styles.scrollContent}>
        <View style={styles.infoCard}>
          <MaterialCommunityIcons name="account-group-outline" size={36} color={COLORS.primary} />
          <Text style={styles.infoText}>
            Manage your family profile to book diagnostic tests seamlessly for your loved ones.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Active Profiles</Text>

        {members.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="account-multiple-minus-outline" size={60} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No members added yet</Text>
            <Text style={styles.emptyDesc}>Add your family to manage their health reports effortlessly.</Text>
          </View>
        ) : (
          members.map((member) => (
            <View key={member.id} style={styles.memberCard}>
              <View style={styles.avatarPlaceholder}>
                <MaterialCommunityIcons 
                  name={member.relation === 'Wife' || member.relation === 'Daughter' || member.relation === 'Mother' ? "face-woman" : member.relation === 'Son' ? "human-child" : "account"} 
                  size={28} 
                  color={COLORS.primary} 
                />
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{member.name}</Text>
                <Text style={styles.memberMeta}>
                  {member.relation} • {member.gender.charAt(0).toUpperCase() + member.gender.slice(1)}
                  {member.age ? ` • ${member.age} yrs` : ''}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.deleteBtn} 
                onPress={() => handleDeleteMember(member.id, member.name)}
              >
                <MaterialCommunityIcons name="trash-can-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))
        )}

    <View style={{ height: 100 }} />
      </ScreenWrapper>

      {/* Floating Add Member Button */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => {
          resetForm();
          setIsModalVisible(true);
        }}
      >
        <MaterialCommunityIcons name="plus" size={28} color="#FFFFFF" />
        <Text style={styles.fabText}>Add Member</Text>
      </TouchableOpacity>

      {/* Add Member Modal Sheet */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Family Member</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
              <Text style={styles.label}>FULL NAME *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Sarah Connor"
                placeholderTextColor="#94A3B8"
              />

              <View style={styles.rowInput}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.label}>AGE (OPTIONAL)</Text>
                  <TextInput
                    style={styles.input}
                    value={age}
                    onChangeText={setAge}
                    placeholder="32"
                    keyboardType="number-pad"
                    maxLength={3}
                    placeholderTextColor="#94A3B8"
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.label}>GENDER</Text>
                  <View style={styles.genderRow}>
                    {(['male', 'female'] as const).map((g) => (
                      <TouchableOpacity
                        key={g}
                        style={[styles.genderChip, gender === g && styles.genderChipActive]}
                        onPress={() => setGender(g)}
                      >
                        <Text style={[styles.genderText, gender === g && styles.genderTextActive]}>
                          {g === 'male' ? 'Male' : 'Female'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <Text style={styles.label}>RELATIONSHIP</Text>
              <View style={styles.relationGrid}>
                {(['Wife', 'Son', 'Daughter', 'Husband', 'Father', 'Mother', 'Other'] as const).map((r) => {
                  const isActive = relation === r;
                  return (
                    <TouchableOpacity
                      key={r}
                      style={[styles.relationChip, isActive && styles.relationChipActive]}
                      onPress={() => setRelation(r)}
                    >
                      <Text style={[styles.relationText, isActive && styles.relationTextActive]}>{r}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleAddMember}>
                <Text style={styles.saveBtnText}>Create Profile</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'ios' ? 50 : 45,
    paddingBottom: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textLight,
  },
  scrollContent: {
    padding: 20,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  infoText: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: '#1E3A8A',
    fontSize: 13,
    lineHeight: 18,
    marginLeft: 12,
  },
  sectionTitle: {
    ...TYPOGRAPHY.subtitle,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 16,
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    ...TYPOGRAPHY.subtitle,
    fontWeight: 'bold',
    color: '#64748B',
    marginTop: 12,
  },
  emptyDesc: {
    ...TYPOGRAPHY.caption,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 40,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.soft,
    elevation: 2,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 128, 128, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    ...TYPOGRAPHY.subtitle,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  memberMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  deleteBtn: {
    padding: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.soft,
    elevation: 6,
  },
  fabText: {
    ...TYPOGRAPHY.subtitle,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 6,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    ...TYPOGRAPHY.subtitle,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  label: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.textDark,
  },
  rowInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  genderRow: {
    flexDirection: 'row',
    height: 46,
  },
  genderChip: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  genderChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  genderText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748B',
  },
  genderTextActive: {
    color: '#FFFFFF',
  },
  relationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    marginHorizontal: -4,
  },
  relationChip: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    margin: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  relationChipActive: {
    backgroundColor: 'rgba(0, 128, 128, 0.08)',
    borderColor: COLORS.primary,
  },
  relationText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  relationTextActive: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
    ...SHADOWS.soft,
  },
  saveBtnText: {
    ...TYPOGRAPHY.subtitle,
    color: '#FFFFFF',
    fontWeight: 'bold',
  }
});
