import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';

const pinnedContacts = [
  { id: 'p1', name: 'Alex Rivet', initials: 'AR', color: '#4caf50' },
  { id: 'p2', name: 'Jordan Rao', initials: 'JR', color: '#2196f3', unread: 3 },
  { id: 'p3', name: 'Dr. Miller', initials: 'DM', color: '#ff9800' },
];

const conversations = [
  { id: '1', name: 'Sarah Jenkins', message: 'The deployment logs show a...', time: '12:45 PM', unread: 2 },
  { id: '2', name: 'Dev Core Team', message: 'Merge request #442 has been...', time: 'YESTERDAY' },
  { id: '3', name: 'Layer Monitor', message: 'Bot: All nodes operational.', time: 'TUE' },
];

export default function ChatListScreen({ navigation }) {
  const renderConversation = ({ item }) => (
    <TouchableOpacity style={styles.chatItem} onPress={() => {
      fetch(`${API_URL}/behavior/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'default_user', event: 'OPEN_CHAT' })
      }).catch(() => {}); // fire and forget (queued if offline)
      navigation.navigate('ChatScreen', { contact: item });
    }}>
      <View style={[styles.avatar, { backgroundColor: '#2a2d40' }]}>
        <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
      </View>
      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatName}>{item.name}</Text>
          <Text style={styles.chatTime}>{item.time}</Text>
        </View>
        <View style={styles.chatFooter}>
          <Text style={styles.chatMessage} numberOfLines={1}>{item.message}</Text>
          {item.unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unread}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Ionicons name="layers" size={24} color="#9b30ff" />
          <Text style={styles.headerTitle}>Connect</Text>
        </View>
        <View style={styles.statusBadge}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>ONLINE</Text>
        </View>
        <Ionicons name="search" size={24} color="#b0b3c6" />
      </View>

      <Text style={styles.sectionTitle}>Pinned</Text>
      <View style={styles.pinnedContainer}>
        {pinnedContacts.map(contact => (
          <TouchableOpacity key={contact.id} style={styles.pinnedItem} onPress={() => {
            fetch(`${API_URL}/behavior/`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_id: 'default_user', event: 'OPEN_CHAT' })
            }).catch(() => {});
            navigation.navigate('ChatScreen', { contact });
          }}>
            <View style={styles.pinnedAvatar}>
              <Text style={styles.pinnedAvatarText}>{contact.initials}</Text>
              {contact.unread && (
                <View style={styles.pinnedBadge}>
                  <Text style={styles.unreadText}>{contact.unread}</Text>
                </View>
              )}
            </View>
            <Text style={styles.pinnedName}>{contact.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Conversations</Text>
      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={item => item.id}
      />

      <TouchableOpacity style={styles.fab} onPress={() => {
        fetch(`${API_URL}/behavior/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: 'default_user', event: 'OPEN_FORM' })
        }).catch(() => {});
        navigation.navigate('ChatScreen', { contact: { name: 'New Chat' } });
      }}>
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f111a' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#2a2d40' },
  logoContainer: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { color: '#9b30ff', fontSize: 20, fontWeight: 'bold', marginLeft: 8 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(155, 48, 255, 0.1)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#9b30ff', marginRight: 6 },
  statusText: { color: '#9b30ff', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  sectionTitle: { color: '#b0b3c6', fontSize: 12, fontWeight: 'bold', letterSpacing: 1, marginHorizontal: 16, marginTop: 24, marginBottom: 16 },
  pinnedContainer: { flexDirection: 'row', paddingHorizontal: 16 },
  pinnedItem: { alignItems: 'center', marginRight: 24 },
  pinnedAvatar: { width: 64, height: 64, borderRadius: 24, backgroundColor: '#1a1c29', borderWidth: 2, borderColor: '#2a2d40', alignItems: 'center', justifyContent: 'center' },
  pinnedAvatarText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  pinnedName: { color: '#fff', fontSize: 12, marginTop: 8 },
  pinnedBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#9b30ff', width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#0f111a' },
  chatItem: { flexDirection: 'row', alignItems: 'center', padding: 16, marginHorizontal: 16, marginBottom: 8, backgroundColor: '#1a1c29', borderRadius: 16 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  chatInfo: { flex: 1 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  chatName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  chatTime: { color: '#b0b3c6', fontSize: 12 },
  chatFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chatMessage: { color: '#b0b3c6', fontSize: 14, flex: 1, marginRight: 16 },
  unreadBadge: { backgroundColor: '#9b30ff', width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  unreadText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 64, height: 64, borderRadius: 32, backgroundColor: '#9b30ff', alignItems: 'center', justifyContent: 'center', shadowColor: '#9b30ff', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
});
