import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  Keyboard,
  Platform,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
const SafeArea = SafeAreaView as any;
import { COLORS } from '../theme/theme';

interface ScreenWrapperProps {
  children: React.ReactNode;
  bottomButton?: React.ReactNode;
  scrollable?: boolean;
  backgroundColor?: string;
  style?: any;
  contentContainerStyle?: any;
  scrollViewStyle?: any;
  disableKeyboardDismiss?: boolean;
  refreshControl?: React.ReactElement;
  extraScrollHeight?: number;
}

export default function ScreenWrapper({
  children,
  bottomButton,
  scrollable = true,
  backgroundColor = COLORS.background,
  style,
  contentContainerStyle,
  scrollViewStyle,
  disableKeyboardDismiss = false,
  refreshControl,
  extraScrollHeight = 80,
}: ScreenWrapperProps) {
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom;

  const handleScrollBeginDrag = useCallback(() => {
    if (!disableKeyboardDismiss) {
      Keyboard.dismiss();
    }
  }, [disableKeyboardDismiss]);

  if (!scrollable) {
    return (
      <SafeArea style={[styles.container, { backgroundColor }, style] as any} edges={['top', 'left', 'right']}>
        <View style={[styles.nonScrollContent, contentContainerStyle]}>
          {children}
        </View>
        {bottomButton && (
          <View
            style={[
              styles.buttonContainer,
              { paddingBottom: bottomInset > 0 ? bottomInset : 16 },
            ]}
          >
            {bottomButton}
          </View>
        )}
      </SafeArea>
    );
  }

  return (
    <SafeArea style={[styles.container, { backgroundColor }, style] as any} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? extraScrollHeight : 0}
      >
        <ScrollView
          style={[styles.scrollView, scrollViewStyle]}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: bottomButton ? 80 + bottomInset : 24 + bottomInset
            },
            contentContainerStyle,
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          onScrollBeginDrag={handleScrollBeginDrag}
          showsVerticalScrollIndicator={false}
          bounces
          alwaysBounceVertical
          refreshControl={refreshControl as any}
          scrollEventThrottle={16}
        >
          {children}
        </ScrollView>

        {bottomButton && (
          <View
            style={[
              styles.buttonContainer,
              { paddingBottom: bottomInset > 0 ? bottomInset : 16 },
            ]}
          >
            {bottomButton}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  nonScrollContent: {
    flex: 1,
  },
  buttonContainer: {
    backgroundColor: COLORS.surface,
    paddingTop: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
});