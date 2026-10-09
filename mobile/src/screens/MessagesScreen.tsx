import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Alert,
  Animated,
  RefreshControl,
} from 'react-native';
import { Text, TextInput, Button, Chip, Avatar, Divider, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { fetchMessages as fetchMessagesApi, sendMessage } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';

const MESSAGE_TYPE_META: Record<string, { icon: string; color: string; bg: string; label: string }> = {
  ORDER: { icon: 'package-variant', color: '#D97706', bg: '#FEF3C7', label: 'Order' },
  PAYMENT: { icon: 'credit-card-check', color: '#7C3AED', bg: '#EDE9FE', label: 'Payment' },
  ALERT: { icon: 'alert-circle', color: '#DC2626', bg: '#FEE2E2', label: 'Alert' },
  REMINDER: { icon: 'calendar-clock', color: '#0891B2', bg: '#E0F2FE', label: 'Reminder' },
  INVOICE: { icon: 'file-document', color: '#059669', bg: '#D1FAE5', label: 'Invoice' },
  REPORT: { icon: 'chart-bar', color: '#2E5D36', bg: '#DCFCE7', label: 'Report' },
  USER: { icon: 'message-text', color: '#2E5D36', bg: '#DCFCE7', label: 'Message' },
};

export const MessagesScreen = () => {
  const user = useAuthStore(state => state.user);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [composeVisible, setComposeVisible] = useState(false);
  const [selectedMsg, setSelectedMsg] = useState<any>(null);
  const [msgTitle, setMsgTitle] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [sending, setSending] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const loadMessages = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await fetchMessagesApi();
      setMessages(Array.isArray(data) ? data : []);
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    } catch (error) {
      console.error('Failed to fetch messages', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  const handleSend = async () => {
    if (!msgTitle.trim() || !msgBody.trim()) {
      Alert.alert('Required', 'Please fill in both subject and message body.');
      return;
    }
    setSending(true);
    try {
      await sendMessage({ title: msgTitle.trim(), body: msgBody.trim(), toEmail: 'admin@renu.com' });
      Alert.alert('Sent!', 'Your message has been sent to the Renu Biome team.');
      setComposeVisible(false);
      setMsgTitle('');
      setMsgBody('');
      await loadMessages(true);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const unreadCount = messages.filter(m => m.dot === 'true').length;
  const meta = (type?: string) => MESSAGE_TYPE_META[type || 'USER'] || MESSAGE_TYPE_META.USER;

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const m = meta(item.type);
    const isUnread = item.dot === 'true';

    return (
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
        <TouchableOpacity
          style={[styles.messageCard, isUnread && styles.messageCardUnread]}
          onPress={() => setSelectedMsg(item)}
          activeOpacity={0.85}
        >
          {isUnread && <View style={styles.unreadBar} />}
          <View style={[styles.iconBox, { backgroundColor: m.bg }]}>
            <MaterialCommunityIcons name={m.icon as any} size={22} color={m.color} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.msgHeader}>
              <Text style={[styles.msgTitle, isUnread && { color: '#0F172A' }]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.msgTime}>{item.when}</Text>
            </View>
            <Text style={styles.msgSub} numberOfLines={2}>{item.sub}</Text>
            <View style={styles.msgFooter}>
              <View style={[styles.typeBadge, { backgroundColor: m.bg }]}>
                <Text style={[styles.typeLabel, { color: m.color }]}>{m.label}</Text>
              </View>
              {item.fromEmail && (
                <Text style={styles.fromText}>from {item.fromEmail}</Text>
              )}
            </View>
          </View>
          {isUnread && <View style={styles.unreadDot} />}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>Messages</Text>
          <Text style={styles.pageSubtitle}>
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
          </Text>
        </View>
        <TouchableOpacity style={styles.composeBtn} onPress={() => setComposeVisible(true)}>
          <MaterialCommunityIcons name="pencil-plus" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Stats Row */}
      {!loading && messages.length > 0 && (
        <View style={styles.statsRow}>
          {(['ORDER', 'ALERT', 'REPORT'] as string[]).map(type => {
            const count = messages.filter(m => m.type === type).length;
            const m = meta(type);
            return count > 0 ? (
              <View key={type} style={[styles.statChip, { backgroundColor: m.bg }]}>
                <MaterialCommunityIcons name={m.icon as any} size={14} color={m.color} />
                <Text style={[styles.statChipText, { color: m.color }]}>{count} {m.label}</Text>
              </View>
            ) : null;
          })}
        </View>
      )}

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#2E5D36" size="large" />
          <Text style={{ color: '#64748B', marginTop: 12 }}>Loading messages…</Text>
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.emptyBox}>
          <MaterialCommunityIcons name="message-off-outline" size={64} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>No messages yet</Text>
          <Text style={styles.emptyText}>Tap the compose button to send your first message to the Renu team.</Text>
          <Button
            mode="contained"
            buttonColor="#2E5D36"
            onPress={() => setComposeVisible(true)}
            style={{ marginTop: 16, borderRadius: 10 }}
            icon="pencil-plus"
          >
            Compose Message
          </Button>
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item, i) => item.id || String(i)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 20 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadMessages(true)} colors={['#2E5D36']} tintColor="#2E5D36" />
          }
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}

      {/* Message Detail Modal */}
      <Modal visible={!!selectedMsg} animationType="slide" transparent onRequestClose={() => setSelectedMsg(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            {selectedMsg && (() => {
              const m = meta(selectedMsg.type);
              return (
                <>
                  <View style={styles.modalDragBar} />
                  <View style={[styles.modalIconBox, { backgroundColor: m.bg }]}>
                    <MaterialCommunityIcons name={m.icon as any} size={30} color={m.color} />
                  </View>
                  <Text style={styles.modalTitle}>{selectedMsg.title}</Text>
                  <Text style={styles.modalFrom}>
                    {selectedMsg.fromEmail ? `From: ${selectedMsg.fromEmail}` : 'System Notification'} • {selectedMsg.when}
                  </Text>
                  <Divider style={{ marginVertical: 14 }} />
                  <Text style={styles.modalBody}>{selectedMsg.sub}</Text>
                  <View style={{ marginTop: 24, flexDirection: 'row', gap: 12 }}>
                    <Button
                      mode="outlined"
                      onPress={() => setSelectedMsg(null)}
                      style={{ flex: 1, borderColor: '#CBD5E1' }}
                      textColor="#64748B"
                    >
                      Dismiss
                    </Button>
                    <Button
                      mode="contained"
                      buttonColor="#2E5D36"
                      onPress={() => {
                        setSelectedMsg(null);
                        setMsgTitle(`Re: ${selectedMsg.title}`);
                        setComposeVisible(true);
                      }}
                      style={{ flex: 1, borderRadius: 10 }}
                      icon="reply"
                    >
                      Reply
                    </Button>
                  </View>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* Compose Message Modal */}
      <Modal visible={composeVisible} animationType="slide" transparent onRequestClose={() => setComposeVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: 40 }]}>
            <View style={styles.modalDragBar} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <Text style={styles.composeTitle}>New Message</Text>
              <TouchableOpacity onPress={() => setComposeVisible(false)}>
                <MaterialCommunityIcons name="close-circle" size={28} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <View style={styles.toBox}>
              <MaterialCommunityIcons name="account-tie" size={16} color="#2E5D36" style={{ marginRight: 6 }} />
              <Text style={{ color: '#334155', fontSize: 14 }}>To: <Text style={{ fontWeight: 'bold' }}>Renu Biome Team (admin@renu.com)</Text></Text>
            </View>

            <TextInput
              label="Subject"
              value={msgTitle}
              onChangeText={setMsgTitle}
              mode="outlined"
              style={styles.composeInput}
              outlineColor="#CBD5E1"
              activeOutlineColor="#2E5D36"
              left={<TextInput.Icon icon="format-title" color="#64748B" />}
            />
            <TextInput
              label="Message"
              value={msgBody}
              onChangeText={setMsgBody}
              mode="outlined"
              multiline
              numberOfLines={6}
              style={[styles.composeInput, { minHeight: 130 }]}
              outlineColor="#CBD5E1"
              activeOutlineColor="#2E5D36"
              left={<TextInput.Icon icon="text" color="#64748B" />}
            />

            <Button
              mode="contained"
              buttonColor="#2E5D36"
              loading={sending}
              disabled={sending}
              onPress={handleSend}
              style={{ marginTop: 8, borderRadius: 12, paddingVertical: 4 }}
              icon="send"
            >
              Send Message
            </Button>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  pageTitle: { fontSize: 26, fontWeight: 'bold', color: '#0F172A' },
  pageSubtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
  composeBtn: {
    backgroundColor: '#2E5D36',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2E5D36',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  statChipText: { fontSize: 12, fontWeight: '600' },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#334155', marginTop: 16 },
  emptyText: { color: '#64748B', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  messageCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
    overflow: 'hidden',
  },
  messageCardUnread: {
    borderColor: '#BBF7D0',
    backgroundColor: '#FAFFFC',
    shadowOpacity: 0.06,
    elevation: 2,
  },
  unreadBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: '#2E5D36',
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  msgHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  msgTitle: { fontSize: 14, fontWeight: '600', color: '#334155', flex: 1, marginRight: 8 },
  msgTime: { fontSize: 11, color: '#94A3B8' },
  msgSub: { fontSize: 13, color: '#64748B', lineHeight: 18 },
  msgFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  typeLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  fromText: { fontSize: 11, color: '#94A3B8' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2E5D36', alignSelf: 'center', flexShrink: 0 },
  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 48,
    minHeight: 300,
  },
  modalDragBar: { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F172A', textAlign: 'center' },
  modalFrom: { fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 4 },
  modalBody: { fontSize: 15, color: '#475569', lineHeight: 24 },
  composeTitle: { fontSize: 20, fontWeight: 'bold', color: '#0F172A' },
  toBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  composeInput: { marginBottom: 14, backgroundColor: '#F8FAFC' },
});
