import { Stack } from 'expo-router';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ErrorBoundary } from 'react-error-boundary';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS } from '../../src/theme/theme';

function SupportErrorFallback({ resetErrorBoundary }: { resetErrorBoundary: () => void }) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name="chat-alert-outline" size={56} color={COLORS.primary} />
      <Text style={styles.title}>Chat unavailable</Text>
      <Text style={styles.message}>
        Support chat could not open right now. Please try again or use call support.
      </Text>
      <TouchableOpacity style={styles.primaryBtn} onPress={resetErrorBoundary}>
        <Text style={styles.primaryBtnText}>Retry Chat</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.replace('/support')}>
        <Text style={styles.secondaryBtnText}>Back to Support</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function SupportLayout() {
  return (
    <ErrorBoundary FallbackComponent={SupportErrorFallback}>
      <Stack screenOptions={{ headerShown: false }} />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F8FAFC',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 16,
  },
  message: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
  },
  primaryBtn: {
    marginTop: 24,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  secondaryBtn: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  secondaryBtnText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});
