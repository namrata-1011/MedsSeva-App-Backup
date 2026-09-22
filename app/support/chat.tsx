import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  FlatList, KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Socket } from 'socket.io-client';
import { tokenStorage } from '../../src/utils/tokenStorage';
import { COLORS, SHADOWS } from '../../src/theme/theme';
import { apiService } from '../../src/services/api';
import {
  ChatMessage,
  Conversation,
  createChatSocket,
  normalizeMessages,
} from '../../src/services/chatService';

const SUGGESTION_CHIPS = [
  'CBC price?',
  'Full body?',
  'SevaWoman?',
  'SevaMan?',
  'Free collection?',
  'Download report?',
];

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function SupportChatScreen() {
  const router = useRouter();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const [agentTypingName, setAgentTypingName] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [supportBannerVisible, setSupportBannerVisible] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const socketRef = useRef<Socket | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      try {
        flatListRef.current?.scrollToEnd({ animated: true });
      } catch {
        // FlatList may not be ready yet on first render.
      }
    }, 120);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAgentTyping, scrollToBottom]);

  const disconnectSocket = useCallback(() => {
    socketRef.current?.removeAllListeners();
    socketRef.current?.disconnect();
    socketRef.current = null;
  }, []);

  const initChat = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    setNeedsLogin(false);
    disconnectSocket();

    try {
      const token = await tokenStorage.getItem('token');
      if (!token) {
        setNeedsLogin(true);
        return;
      }

      const conv = await apiService.getOrCreateConversation() as Conversation;
      if (!conv?.id) {
        throw new Error('Unable to start support chat.');
      }

      setConversation(conv);
      setMessages(normalizeMessages(conv.messages));

      const socket = await createChatSocket(token);
      socketRef.current = socket;

      socket.on('connect_error', () => {
        setErrorMessage('Unable to connect to support chat. You can still retry in a moment.');
      });

      socket.on('chat:message', (msg: ChatMessage) => {
        if (!msg?.id) return;
        setMessages((prev) => (prev.find((m) => m.id === msg.id) ? prev : [...prev, msg]));
        setIsAgentTyping(false);
        setErrorMessage(null);
      });

      socket.on('chat:status_change', ({ status }: { status: string }) => {
        setConversation((prev) => (prev ? { ...prev, status: status as Conversation['status'] } : prev));
        if (status === 'PENDING_HUMAN' || status === 'HUMAN_ACTIVE') {
          setSupportBannerVisible(false);
        }
      });

      socket.on('chat:typing', ({ isTyping, userName }: { isTyping: boolean; userName: string }) => {
        setIsAgentTyping(!!isTyping);
        setAgentTypingName(userName || 'Support Agent');
      });

      socket.on('chat:read', () => {
        setMessages((prev) => prev.map((m) => ({ ...m, isRead: true })));
      });

      socket.emit('chat:join', { conversationId: conv.id });
    } catch (err: any) {
      const message =
        err?.response?.data?.error ||
        err?.message ||
        'Support chat is temporarily unavailable. Please try again.';
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }, [disconnectSocket]);

  useEffect(() => {
    initChat();
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      disconnectSocket();
    };
  }, [initChat, disconnectSocket]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !conversation || sending || conversation.status === 'CLOSED') return;

    if (!socketRef.current?.connected) {
      setErrorMessage('Chat connection lost. Reconnecting...');
      await initChat();
      return;
    }

    setSending(true);
    setInputText('');
    socketRef.current.emit('chat:send', { conversationId: conversation.id, text: trimmed });
    setSending(false);
  };

  const handleRequestSupport = () => {
    if (!conversation || !socketRef.current?.connected) return;
    setSupportBannerVisible(false);
    socketRef.current.emit('chat:request_support', { conversationId: conversation.id });
  };

  const handleTyping = (val: string) => {
    setInputText(val);
    if (!conversation || !socketRef.current?.connected) return;
    socketRef.current.emit('chat:typing', { conversationId: conversation.id, isTyping: true });
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socketRef.current?.emit('chat:typing', { conversationId: conversation.id, isTyping: false });
    }, 1500);
  };

  const getHeaderSubtitle = () => {
    if (!conversation) return 'MedsSeva AI Health Assistant • Online';
    if (conversation.status === 'HUMAN_ACTIVE' && conversation.assignedTo) {
      return `${conversation.assignedTo.user.name} • Support Agent`;
    }
    if (conversation.status === 'PENDING_HUMAN') return 'Connecting to support...';
    if (conversation.status === 'CLOSED') return 'Conversation closed';
    return 'MedsSeva AI Health Assistant • Online';
  };

  const getHeaderName = () => {
    if (!conversation) return 'SevaBot';
    if (conversation.status === 'HUMAN_ACTIVE') return 'MedsSeva Support';
    return 'SevaBot';
  };

  const renderWelcomeCard = () => (
    <View style={styles.welcomeCard}>
      <Text style={styles.welcomeGreeting}>
        <Text style={{ fontWeight: 'bold', color: '#1E293B' }}>Namaste!</Text>
        {' '}I'm SevaBot, your MedsSeva Health Assistant.
      </Text>
      <Text style={styles.welcomeSubtitle}>I can help you with:</Text>
      {[
        { icon: 'flask', text: 'Test prices & details' },
        { icon: 'package-variant', text: 'Package recommendations' },
        { icon: 'home-outline', text: 'Home collection info' },
        { icon: 'calendar-check', text: 'Booking help' },
      ].map((item, i) => (
        <View key={i} style={styles.listItem}>
          <MaterialCommunityIcons name={item.icon as any} size={16} color={COLORS.primary} />
          <Text style={styles.listText}>{item.text}</Text>
        </View>
      ))}
    </View>
  );

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    if (item.senderType === 'BOT' && item.senderId === 'system') {
      return (
        <View style={styles.systemMsgWrapper}>
          <View style={styles.systemMsg}>
            <MaterialCommunityIcons name="information-outline" size={12} color="#3B82F6" />
            <Text style={styles.systemMsgText}>{item.text}</Text>
          </View>
        </View>
      );
    }

    const isUser = item.senderType === 'USER';
    const isAgent = item.senderType === 'AGENT';

    return (
      <View style={[styles.msgBubbleWrapper, isUser ? styles.wrapperUser : styles.wrapperBot]}>
        {!isUser && isAgent && (
          <View style={[styles.botBubbleAvatar, styles.agentAvatar]}>
            <MaterialCommunityIcons name="headset" size={13} color="#FFF" />
          </View>
        )}
        <View style={[styles.msgBubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
          {isAgent && item.senderName ? <Text style={styles.senderName}>{item.senderName}</Text> : null}
          {item.text ? (
            <Text style={[styles.msgText, isUser ? styles.textUser : styles.textBot]}>{item.text}</Text>
          ) : null}
          <View style={styles.msgFooter}>
            <Text style={[styles.msgTime, isUser ? styles.timeUser : styles.timeBot]}>
              {formatTime(item.createdAt)}
            </Text>
            {isUser ? (
              <MaterialCommunityIcons
                name={item.isRead ? 'check-all' : 'check'}
                size={12}
                color={item.isRead ? '#60A5FA' : 'rgba(255,255,255,0.5)'}
                style={{ marginLeft: 3 }}
              />
            ) : null}
          </View>
        </View>
      </View>
    );
  };

  const renderBlockedState = () => {
    if (needsLogin) {
      return (
        <View style={styles.blockedState}>
          <MaterialCommunityIcons name="account-lock-outline" size={56} color={COLORS.primary} />
          <Text style={styles.blockedTitle}>Login Required</Text>
          <Text style={styles.blockedText}>Please login to use chat support.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => router.replace('/(auth)/login' as any)}>
            <Text style={styles.retryBtnText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (errorMessage) {
      return (
        <View style={styles.blockedState}>
          <MaterialCommunityIcons name="chat-alert-outline" size={56} color={COLORS.primary} />
          <Text style={styles.blockedTitle}>Chat Unavailable</Text>
          <Text style={styles.blockedText}>{errorMessage}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={initChat}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  const blockedState = renderBlockedState();
  const isInputDisabled = !conversation || conversation.status === 'CLOSED' || !!blockedState;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={conversation?.status === 'HUMAN_ACTIVE' ? '#0F766E' : COLORS.primary} />

      <View style={[styles.header, conversation?.status === 'HUMAN_ACTIVE' && styles.headerAgent]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#FFF" />
        </TouchableOpacity>
        {conversation?.status === 'HUMAN_ACTIVE' ? (
          <View style={[styles.headerAvatar, styles.headerAvatarAgent]}>
            <MaterialCommunityIcons name="headset" size={20} color="#FFF" />
          </View>
        ) : null}
        <View style={styles.headerMeta}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerName}>{getHeaderName()}</Text>
            <View style={[styles.onlineDot, conversation?.status === 'PENDING_HUMAN' && styles.pendingDot]} />
          </View>
          <Text style={styles.headerSub}>{getHeaderSubtitle()}</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={COLORS.primary} size="large" />
            <Text style={styles.loadingText}>Connecting to SevaBot...</Text>
          </View>
        ) : blockedState ? (
          blockedState
        ) : (
          <>
            {supportBannerVisible && conversation?.status === 'AI_ACTIVE' ? (
              <View style={styles.supportBanner}>
                <View style={styles.supportBannerLeft}>
                  <View style={styles.supportBannerIcon}>
                    <MaterialCommunityIcons name="headset" size={20} color={COLORS.primary} />
                  </View>
                  <View style={styles.supportBannerText}>
                    <Text style={styles.supportBannerTitle}>Talk to Customer Support</Text>
                    <Text style={styles.supportBannerSub}>Need help from a real executive? Connect instantly.</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.supportBannerBtn} onPress={handleRequestSupport} activeOpacity={0.85}>
                  <MaterialCommunityIcons name="headset" size={14} color="#FFF" />
                  <Text style={styles.supportBannerBtnText}>Connect</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item, index) => item.id || `msg-${index}`}
              renderItem={renderMessage}
              contentContainerStyle={styles.chatBody}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              ListHeaderComponent={messages.length === 0 ? renderWelcomeCard : undefined}
              ListFooterComponent={
                isAgentTyping ? (
                  <View style={[styles.msgBubbleWrapper, styles.wrapperBot]}>
                    <View style={styles.agentAvatar}>
                      <MaterialCommunityIcons name="headset" size={13} color="#FFF" />
                    </View>
                    <View style={[styles.msgBubble, styles.bubbleBot, styles.typingBubble]}>
                      <ActivityIndicator size="small" color={COLORS.primary} />
                      <Text style={styles.typingText}>{agentTypingName || 'Support Agent'} is typing...</Text>
                    </View>
                  </View>
                ) : null
              }
            />

            {!isInputDisabled ? (
              <View style={styles.suggestionContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                  {SUGGESTION_CHIPS.map((chip, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.chip}
                      onPress={() => sendMessage(chip)}
                      disabled={sending}
                    >
                      <Text style={styles.chipText}>{chip}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : null}
          </>
        )}

        <View style={styles.inputBar}>
          {isInputDisabled ? (
            <View style={styles.closedBanner}>
              <MaterialCommunityIcons name="information-outline" size={14} color="#64748B" />
              <Text style={styles.closedText}>
                {conversation?.status === 'CLOSED'
                  ? 'This conversation is closed. Start a new one.'
                  : 'Chat input unavailable right now.'}
              </Text>
            </View>
          ) : (
            <>
              <TextInput
                style={styles.input}
                placeholder={
                  conversation?.status === 'PENDING_HUMAN'
                    ? 'Waiting for support agent...'
                    : 'Type your question here...'
                }
                placeholderTextColor="#94A3B8"
                value={inputText}
                onChangeText={handleTyping}
                onSubmitEditing={() => sendMessage(inputText)}
                returnKeyType="send"
                blurOnSubmit={false}
              />
              <TouchableOpacity
                style={[styles.sendBtn, (!inputText.trim() || sending) && { opacity: 0.5 }]}
                onPress={() => sendMessage(inputText)}
                disabled={!inputText.trim() || sending}
              >
                <MaterialCommunityIcons name="send" size={20} color="#FFF" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  flex: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  headerAgent: { backgroundColor: '#0F766E' },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  headerAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)', marginRight: 10 },
  headerAvatarAgent: { backgroundColor: 'rgba(255,255,255,0.3)' },
  headerMeta: { flex: 1 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center' },
  headerName: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981', marginLeft: 8, borderWidth: 1, borderColor: '#FFF' },
  pendingDot: { backgroundColor: '#F59E0B' },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, backgroundColor: '#F8FAFC' },
  loadingText: { color: '#64748B', fontSize: 13 },
  blockedState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#F8FAFC' },
  blockedTitle: { fontSize: 20, fontWeight: '700', color: '#0F172A', marginTop: 16 },
  blockedText: { fontSize: 14, color: '#64748B', textAlign: 'center', marginTop: 10, lineHeight: 22 },
  retryBtn: { marginTop: 20, backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  retryBtnText: { color: '#FFFFFF', fontWeight: '700' },
  chatBody: { paddingHorizontal: 16, paddingVertical: 20 },
  welcomeCard: { backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', padding: 16, marginBottom: 20, ...SHADOWS.soft },
  welcomeGreeting: { fontSize: 14, color: '#475569', lineHeight: 20, marginBottom: 12 },
  welcomeSubtitle: { fontSize: 13, fontWeight: 'bold', color: '#1E293B', marginBottom: 8 },
  listItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  listText: { fontSize: 13, color: '#475569', fontWeight: '500' },
  systemMsgWrapper: { alignItems: 'center', marginVertical: 8 },
  systemMsg: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  systemMsgText: { fontSize: 11, color: '#1D4ED8', fontWeight: '500', flexShrink: 1 },
  msgBubbleWrapper: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12, maxWidth: '85%' },
  wrapperBot: { alignSelf: 'flex-start' },
  wrapperUser: { alignSelf: 'flex-end' },
  botBubbleAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: 8, marginBottom: 4 },
  agentAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#0F766E', justifyContent: 'center', alignItems: 'center', marginRight: 8, marginBottom: 4 },
  msgBubble: { borderRadius: 16, paddingVertical: 10, paddingHorizontal: 14 },
  bubbleBot: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderBottomLeftRadius: 4 },
  bubbleUser: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  senderName: { fontSize: 9, color: '#0F766E', fontWeight: 'bold', marginBottom: 3 },
  msgText: { fontSize: 14, lineHeight: 20 },
  textBot: { color: '#334155' },
  textUser: { color: '#FFF' },
  msgFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 },
  msgTime: { fontSize: 9 },
  timeBot: { color: '#94A3B8' },
  timeUser: { color: 'rgba(255,255,255,0.7)' },
  typingBubble: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typingText: { fontSize: 12, color: COLORS.primary, fontStyle: 'italic' },
  suggestionContainer: { backgroundColor: '#FFF', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  chipScroll: { paddingHorizontal: 16, gap: 8 },
  chip: { backgroundColor: '#F0FDFA', borderWidth: 1, borderColor: '#CCFBF1', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, marginRight: 8 },
  chipText: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
  inputBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 12, paddingBottom: Platform.OS === 'ios' ? 24 : 12, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  input: { flex: 1, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 24, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 10 : 6, fontSize: 14, color: '#1E293B', marginRight: 10 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', ...SHADOWS.glow },
  closedBanner: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#F1F5F9', borderRadius: 12 },
  closedText: { fontSize: 12, color: '#64748B', flex: 1 },
  supportBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F0FDFA', borderBottomWidth: 1, borderBottomColor: '#CCFBF1', paddingHorizontal: 14, paddingVertical: 10 },
  supportBannerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
  supportBannerIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#CCFBF1', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  supportBannerText: { flex: 1 },
  supportBannerTitle: { fontSize: 12, fontWeight: 'bold', color: '#0F172A' },
  supportBannerSub: { fontSize: 10, color: '#64748B', marginTop: 1 },
  supportBannerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, gap: 5 },
  supportBannerBtnText: { fontSize: 11, fontWeight: 'bold', color: '#FFF' },
});
