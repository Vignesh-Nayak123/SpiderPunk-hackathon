import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function MessageBubble({ message, isOwn }) {
  const isPending = message.status === 'pending';
  const isDelivered = message.status === 'delivered';

  return (
    <View style={[styles.container, isOwn ? styles.ownContainer : styles.otherContainer]}>
      <Text style={styles.text}>{message.text}</Text>
      <View style={styles.footer}>
        <Text style={styles.time}>{message.time}</Text>
        {isOwn && (
          <Ionicons 
            name={isPending ? 'time-outline' : isDelivered ? 'checkmark-done-outline' : 'checkmark-outline'} 
            size={12} 
            color={isPending ? '#b0b3c6' : '#9b30ff'} 
            style={styles.statusIcon}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginVertical: 4,
  },
  ownContainer: {
    alignSelf: 'flex-end',
    backgroundColor: '#381460', // dark purple
    borderBottomRightRadius: 4,
  },
  otherContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#1a1c29',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#2a2d40',
  },
  text: {
    color: '#fff',
    fontSize: 15,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  time: {
    fontSize: 10,
    color: '#b0b3c6',
  },
  statusIcon: {
    marginLeft: 4,
  }
});
