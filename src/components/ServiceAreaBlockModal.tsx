import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY } from '../theme/theme';

type Props = {
  visible: boolean;
  pincode?: string | null;
  onClose?: () => void;
};

export function ServiceAreaBlockModal({ visible, pincode, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <MaterialCommunityIcons name="map-marker-off-outline" size={56} color="#EF4444" />
          <Text style={styles.title}>Services Not Available</Text>
          <Text style={styles.message}>
            Aapke area me abhi humari services provide nahi hoti hain.
            {pincode ? `\n\nPincode: ${pincode}` : ''}
          </Text>
          <Text style={styles.subMessage}>
            Please try again from a serviceable location or contact support.
          </Text>
          {onClose ? (
            <TouchableOpacity style={styles.button} onPress={onClose}>
              <Text style={styles.buttonText}>Okay</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  title: {
    ...TYPOGRAPHY.h3,
    marginTop: 16,
    textAlign: 'center',
    color: COLORS.textDark,
  },
  message: {
    marginTop: 12,
    textAlign: 'center',
    color: '#475569',
    lineHeight: 22,
  },
  subMessage: {
    marginTop: 10,
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 20,
  },
  button: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
