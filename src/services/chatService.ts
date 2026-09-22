import { getSocketBaseUrl } from '../config/env';

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderType: 'USER' | 'BOT' | 'AGENT';
  senderId: string;
  text?: string;
  isRead: boolean;
  createdAt: string;
  senderName?: string;
}

export interface Conversation {
  id: string;
  status: 'AI_ACTIVE' | 'PENDING_HUMAN' | 'HUMAN_ACTIVE' | 'CLOSED';
  messages: ChatMessage[];
  assignedTo?: { user: { name: string } };
}

export async function createChatSocket(token: string) {
  const { io } = await import('socket.io-client');
  return io(getSocketBaseUrl(), {
    auth: { token },
    transports: ['polling', 'websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    timeout: 20000,
    forceNew: true,
  });
}

export function normalizeMessages(messages: unknown): ChatMessage[] {
  if (!Array.isArray(messages)) return [];
  return messages.filter((item): item is ChatMessage => !!item && typeof item === 'object' && 'id' in item);
}
