/**
 * AgriMonitor Agriculture AI Assistant Screen (Phase 5)
 *
 * Mobile-first conversational interface powered by Express Groq AI proxy
 * with live telemetry context injection and offline common question handling.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { THEME } from '../../constants/theme';
import { useTelemetry } from '../../hooks/useTelemetry';
import { AlertManager } from '../../services/alerts/AlertManager';
import { StorageService } from '../../services/storage/storageService';
import { ChatService } from '../../services/ai/chatService';
import { ChatMessage } from '../../types/chat';

const SUGGESTED_PROMPTS = [
  'Why is my soil moisture low?',
  'What does my TDS reading mean?',
  'How does temperature affect crops?',
  'How should I manage irrigation?',
  'Explain my current readings.',
];

export const AgricultureChatScreen: React.FC = () => {
  const { telemetry, connectionStatus } = useTelemetry();
  const isConnected = connectionStatus === 'CONNECTED';
  const alerts = AlertManager.getInstance().getActiveAlerts();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Load chat history on mount
  useEffect(() => {
    loadChatHistory();
  }, []);

  const loadChatHistory = async () => {
    try {
      const history = await StorageService.getChatHistory();
      if (history && history.length > 0) {
        setMessages(history);
      } else {
        // Initial welcome message
        const welcomeMessage: ChatMessage = {
          id: 'welcome-msg',
          role: 'assistant',
          content:
            '👋 Hello! I am your AgriMonitor Assistant.\n\nAsk me anything about soil moisture, irrigation, crop management, or your live sensor readings.',
          timestamp: Date.now(),
          isLocalAnswer: true,
        };
        setMessages([welcomeMessage]);
        await StorageService.saveChatHistory([welcomeMessage]);
      }
    } catch (e) {
      console.error('Failed to load chat history:', e);
    }
  };

  const handleSend = async (textToSend?: string) => {
    const messageContent = (textToSend || inputText).trim();
    if (!messageContent || isLoading) return;

    setInputText('');

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      role: 'user',
      content: messageContent,
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      // Scroll to bottom
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

      const activeAlerts = AlertManager.getInstance().getActiveAlerts();
      const result = await ChatService.sendMessage(
        messageContent,
        telemetry,
        activeAlerts,
        updatedMessages
      );

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        role: 'assistant',
        content: result.reply,
        timestamp: Date.now(),
        isLocalAnswer: result.isLocalAnswer,
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);
      await StorageService.saveChatHistory(finalMessages);
    } catch (error: any) {
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content:
          "I couldn't connect to the agriculture assistant. Please check the backend connection and try again.",
        timestamp: Date.now(),
        isLocalAnswer: true,
      };
      const finalMessages = [...updatedMessages, errorMessage];
      setMessages(finalMessages);
      await StorageService.saveChatHistory(finalMessages);
    } finally {
      setIsLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 150);
    }
  };

  const handleClearChat = () => {
    Alert.alert(
      'Clear Chat History',
      'Are you sure you want to clear all chat messages? Your sensor alerts, fertilizer logs, and settings will remain untouched.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await StorageService.clearChatHistory();
            const resetMessage: ChatMessage = {
              id: `welcome-${Date.now()}`,
              role: 'assistant',
              content:
                'Chat history cleared. How can I assist with your farm or telemetry today?',
              timestamp: Date.now(),
              isLocalAnswer: true,
            };
            setMessages([resetMessage]);
            await StorageService.saveChatHistory([resetMessage]);
          },
        },
      ]
    );
  };

  const renderMessageItem = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View
        style={[
          styles.messageRow,
          isUser ? styles.messageRowUser : styles.messageRowAssistant,
        ]}
      >
        {!isUser && (
          <View style={styles.assistantAvatar}>
            <Text style={styles.avatarIcon}>🌱</Text>
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.bubbleUser : styles.bubbleAssistant,
          ]}
        >
          {item.isLocalAnswer && !isUser && (
            <View style={styles.localBadge}>
              <Text style={styles.localBadgeText}>⚡ Offline Knowledge</Text>
            </View>
          )}
          <Text style={[styles.messageText, isUser ? styles.textUser : styles.textAssistant]}>
            {item.content}
          </Text>
          <Text style={[styles.timestampText, isUser ? styles.timeUser : styles.timeAssistant]}>
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🌱 Agriculture Assistant</Text>
          <Text style={styles.headerSubtitle}>
            AI Advice • Context-Aware Telemetry
          </Text>
        </View>
        <TouchableOpacity style={styles.clearBtn} onPress={handleClearChat}>
          <Text style={styles.clearBtnText}>Clear</Text>
        </TouchableOpacity>
      </View>

      {/* Conditions Context Header Bar */}
      <View style={styles.contextBar}>
        <View style={styles.contextHeader}>
          <Text style={styles.contextTitle}>CURRENT CONDITIONS</Text>
          <View style={styles.statusPill}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isConnected ? '#10B981' : THEME.colors.textMuted },
              ]}
            />
            <Text style={styles.statusPillText}>
              {isConnected ? 'LIVE ESP32' : 'OFFLINE'}
            </Text>
          </View>
        </View>
        <View style={styles.contextGrid}>
          <View style={styles.contextItem}>
            <Text style={styles.contextValue}>
              🌡 {telemetry ? `${telemetry.temperature.toFixed(1)}°C` : '--'}
            </Text>
            <Text style={styles.contextLabel}>Temp</Text>
          </View>
          <View style={styles.contextItem}>
            <Text style={styles.contextValue}>
              💧 {telemetry ? `${Math.round(telemetry.humidity)}%` : '--'}
            </Text>
            <Text style={styles.contextLabel}>Humidity</Text>
          </View>
          <View style={styles.contextItem}>
            <Text style={styles.contextValue}>
              🌱 {telemetry ? `${Math.round(telemetry.soilMoisture)}%` : '--'}
            </Text>
            <Text style={styles.contextLabel}>Moisture</Text>
          </View>
          <View style={styles.contextItem}>
            <Text style={styles.contextValue}>
              🧪 {telemetry ? `${Math.round(telemetry.tds)}` : '--'}
            </Text>
            <Text style={styles.contextLabel}>TDS ppm</Text>
          </View>
        </View>
      </View>

      {/* Suggested Prompts Bar */}
      <View style={styles.promptListContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={SUGGESTED_PROMPTS}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.promptsContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.promptChip}
              onPress={() => handleSend(item)}
              disabled={isLoading}
            >
              <Text style={styles.promptChipText}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessageItem}
        contentContainerStyle={styles.messagesContainer}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListFooterComponent={
          isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={THEME.colors.primary} />
              <Text style={styles.loadingText}>Assistant is thinking...</Text>
            </View>
          ) : null
        }
      />

      {/* Input Bar */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Ask about crops, soil, irrigation or readings..."
          placeholderTextColor="#64748B"
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={4000}
          editable={!isLoading}
        />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            (!inputText.trim() || isLoading) && styles.sendBtnDisabled,
          ]}
          onPress={() => handleSend()}
          disabled={!inputText.trim() || isLoading}
        >
          <Text style={styles.sendBtnIcon}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1120',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  clearBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  clearBtnText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
  },
  contextBar: {
    backgroundColor: '#131D31',
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  contextHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  contextTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B1120',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
  },
  contextGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  contextItem: {
    alignItems: 'center',
    flex: 1,
  },
  contextValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#38BDF8',
  },
  contextLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  promptListContainer: {
    paddingVertical: 6,
  },
  promptsContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  promptChip: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    marginRight: 8,
  },
  promptChipText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '600',
  },
  messagesContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexGrow: 1,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowAssistant: {
    justifyContent: 'flex-start',
  },
  assistantAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#064E3B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  avatarIcon: {
    fontSize: 14,
  },
  messageBubble: {
    maxWidth: '82%',
    padding: 12,
    borderRadius: 16,
  },
  bubbleUser: {
    backgroundColor: '#059669',
    borderBottomRightRadius: 2,
  },
  bubbleAssistant: {
    backgroundColor: '#1E293B',
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: '#334155',
  },
  localBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#0F172A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  localBadgeText: {
    fontSize: 9,
    color: '#34D399',
    fontWeight: '700',
  },
  messageText: {
    fontSize: 13.5,
    lineHeight: 19,
  },
  textUser: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  textAssistant: {
    color: '#E2E8F0',
  },
  timestampText: {
    fontSize: 9.5,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  timeUser: {
    color: '#A7F3D0',
  },
  timeAssistant: {
    color: '#64748B',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 12,
    marginLeft: 8,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#131D31',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#0B1120',
    color: '#F8FAFC',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxHeight: 90,
    fontSize: 13.5,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sendBtn: {
    backgroundColor: '#10B981',
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendBtnDisabled: {
    backgroundColor: '#334155',
    opacity: 0.5,
  },
  sendBtnIcon: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
