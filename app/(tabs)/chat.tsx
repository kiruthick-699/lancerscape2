import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, StyleSheet, TextInput } from 'react-native';
import { MessageCircle, Send, User, Clock } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import TopNavBar from '@/components/TopNavBar';
import { mockMessages, mockJobs } from '@/data/mockData';

interface ChatThread {
  jobId: string;
  jobTitle: string;
  client: string;
  lastMessage: string;
  timestamp: Date;
  unreadCount: number;
}

export default function ChatScreen() {
  const { colors } = useTheme();
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');

  // Create chat threads from messages
  const chatThreads: ChatThread[] = mockJobs
    .filter(job => job.status === 'accepted' || job.status === 'in_progress')
    .map(job => {
      const jobMessages = mockMessages.filter(msg => msg.jobId === job.id);
      const lastMessage = jobMessages[jobMessages.length - 1];
      
      return {
        jobId: job.id,
        jobTitle: job.title,
        client: job.client,
        lastMessage: lastMessage?.text || 'No messages yet',
        timestamp: lastMessage?.timestamp || new Date(),
        unreadCount: Math.floor(Math.random() * 3), // Mock unread count
      };
    });

  const currentThreadMessages = selectedThread 
    ? mockMessages.filter(msg => msg.jobId === selectedThread)
    : [];

  const sendMessage = () => {
    if (messageInput.trim() && selectedThread) {
      // In a real app, this would send the message to the backend
      setMessageInput('');
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <TopNavBar />
      
      {!selectedThread ? (
        // Chat Threads List
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]}>Messages</Text>
          
          {chatThreads.length > 0 ? (
            <ScrollView showsVerticalScrollIndicator={false}>
              {chatThreads.map((thread) => (
                <TouchableOpacity
                  key={thread.jobId}
                  style={[styles.threadItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => setSelectedThread(thread.jobId)}
                >
                  <View style={styles.threadHeader}>
                    <Text style={[styles.jobTitle, { color: colors.text }]} numberOfLines={1}>
                      {thread.jobTitle}
                    </Text>
                    <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
                      {formatTime(thread.timestamp)}
                    </Text>
                  </View>
                  
                  <Text style={[styles.clientName, { color: colors.textSecondary }]}>
                    {thread.client}
                  </Text>
                  
                  <View style={styles.threadFooter}>
                    <Text style={[styles.lastMessage, { color: colors.textSecondary }]} numberOfLines={1}>
                      {thread.lastMessage}
                    </Text>
                    {thread.unreadCount > 0 && (
                      <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                        <Text style={styles.unreadCount}>{thread.unreadCount}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <MessageCircle size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Messages</Text>
              <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
                Start a conversation when you accept a job
              </Text>
            </View>
          )}
        </View>
      ) : (
        // Chat Conversation
        <View style={styles.chatContainer}>
          <View style={[styles.chatHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity onPress={() => setSelectedThread(null)}>
              <Text style={[styles.backButton, { color: colors.primary }]}>← Back</Text>
            </TouchableOpacity>
            <Text style={[styles.chatTitle, { color: colors.text }]}>
              {chatThreads.find(t => t.jobId === selectedThread)?.jobTitle}
            </Text>
          </View>
          
          <ScrollView style={styles.messagesContainer} showsVerticalScrollIndicator={false}>
            {currentThreadMessages.map((message, index) => (
              <View
                key={message.id}
                style={[
                  styles.messageContainer,
                  message.sender === 'freelancer' ? styles.messageRight : styles.messageLeft
                ]}
              >
                <View style={[
                  styles.messageBubble,
                  { 
                    backgroundColor: message.sender === 'freelancer' 
                      ? colors.primary 
                      : colors.surface,
                    borderColor: colors.border
                  }
                ]}>
                  <Text style={[
                    styles.messageText,
                    { color: message.sender === 'freelancer' ? '#fff' : colors.text }
                  ]}>
                    {message.text}
                  </Text>
                  <Text style={[
                    styles.messageTime,
                    { color: message.sender === 'freelancer' ? '#fff' : colors.textSecondary }
                  ]}>
                    {formatTime(message.timestamp)}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
          
          <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TextInput
              style={[styles.messageInput, { color: colors.text }]}
              placeholder="Type a message..."
              placeholderTextColor={colors.textSecondary}
              value={messageInput}
              onChangeText={setMessageInput}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendButton, { backgroundColor: colors.primary }]}
              onPress={sendMessage}
            >
              <Send size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 20,
  },
  threadItem: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  threadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  timestamp: {
    fontSize: 12,
  },
  clientName: {
    fontSize: 14,
    marginBottom: 8,
  },
  threadFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    flex: 1,
  },
  unreadBadge: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  unreadCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    padding: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  chatContainer: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  backButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
    padding: 16,
  },
  messageContainer: {
    marginBottom: 12,
  },
  messageLeft: {
    alignItems: 'flex-start',
  },
  messageRight: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 12,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  messageInput: {
    flex: 1,
    maxHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    fontSize: 16,
  },
  sendButton: {
    padding: 12,
    borderRadius: 20,
  },
});