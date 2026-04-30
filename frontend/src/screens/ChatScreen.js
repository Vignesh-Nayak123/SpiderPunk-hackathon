import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';
import MessageBubble from '../components/MessageBubble';
import NetworkBanner from '../components/NetworkBanner';
import OfflineLayer from 'offline-layer-sdk';

export default function ChatScreen({ route, navigation }) {
  const { contact } = route.params || { contact: { name: 'Chat' } };
  const [text, setText] = useState('');
  const [messages, setMessages] = useState([]);
  const flatListRef = useRef(null);

  const fetchMessages = async () => {
    try {
      const activeUser = OfflineLayer.getUserId ? OfflineLayer.getUserId() : 'UserA';
      const res = await fetch(`${API_URL}/api/messages`, {
        headers: {
          'X-User-Id': activeUser
        }
      });
      const data = await res.json();
      if (data && data.messages) {
        setMessages(prev => {
          const serverMsgs = data.messages;
          const serverTexts = new Set(serverMsgs.map(m => m.text));
          const pendingMsgs = prev.filter(m => m.status === 'pending' && !serverTexts.has(m.text));
          return [...serverMsgs, ...pendingMsgs];
        });
      }
    } catch (e) {
      console.log('Fetch messages failed (offline?)', e);
    }
  };

  useEffect(() => {
    fetchMessages();
    // Poll blazingly fast for the presentation!
    const interval = setInterval(fetchMessages, 500);
    return () => clearInterval(interval);
  }, []);

  const handleSend = async () => {
    if (!text.trim()) return;
    
    // Add locally for optimistic UI
    const tempMsg = {
      id: Date.now().toString(),
      text: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isOwn: true,
      status: 'pending'
    };
    setMessages(prev => [...prev, tempMsg]);
    setText('');
    
    // The OfflineLayer SDK will intercept this if offline and queue it
    try {
      const activeUser = OfflineLayer.getUserId ? OfflineLayer.getUserId() : 'UserA';
      await fetch(`${API_URL}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': activeUser },
        body: JSON.stringify({ chat_id: contact.id || 'c1', message: text.trim() })
      });
    } catch (e) {
      // It's queued if offline
    }
    
    // Scroll to bottom
    setTimeout(() => {
      if (flatListRef.current) {
        flatListRef.current.scrollToEnd({ animated: true });
      }
    }, 100);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#9b30ff" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.contactName}>{contact.name}</Text>
          <Text style={styles.contactStatus}>OFFLINE LAYER SYNC</Text>
        </View>
        <Ionicons name="videocam-outline" size={24} color="#b0b3c6" style={styles.headerIcon} />
        <Ionicons name="search-outline" size={24} color="#b0b3c6" style={styles.headerIcon} />
      </View>
      <NetworkBanner />
      
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <MessageBubble message={item} isOwn={item.isOwn} />}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => {
          if (messages.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: true });
          }
        }}
      />
      
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachButton} onPress={() => {
            fetch(`${API_URL}/behavior/`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_id: 'default_user', event: 'UPLOAD_FILE' })
            }).catch(() => {});
          }}>
            <Ionicons name="add" size={24} color="#b0b3c6" />
          </TouchableOpacity>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor="#b0b3c6"
              value={text}
              onChangeText={setText}
              onSubmitEditing={handleSend}
            />
            <Ionicons name="happy-outline" size={24} color="#b0b3c6" />
          </View>
          <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f111a' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#1a1c29', borderBottomWidth: 1, borderBottomColor: '#2a2d40' },
  backButton: { marginRight: 16 },
  headerInfo: { flex: 1 },
  contactName: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  contactStatus: { color: '#b0b3c6', fontSize: 10, marginTop: 2, letterSpacing: 1 },
  headerIcon: { marginLeft: 16 },
  messageList: { padding: 16, flexGrow: 1, justifyContent: 'flex-end' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#1a1c29', borderTopWidth: 1, borderTopColor: '#2a2d40' },
  attachButton: { padding: 8, backgroundColor: '#2a2d40', borderRadius: 12, marginRight: 8 },
  inputBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#2a2d40', borderRadius: 20, paddingHorizontal: 16, height: 40 },
  input: { flex: 1, color: '#fff', marginRight: 8 },
  sendButton: { width: 40, height: 40, backgroundColor: '#9b30ff', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
});
