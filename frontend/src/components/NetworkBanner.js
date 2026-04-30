import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import OfflineLayer from 'offline-layer-sdk';
import { Ionicons } from '@expo/vector-icons';

export default function NetworkBanner() {
  const [status, setStatus] = useState(OfflineLayer.getConnectionStatus());
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const unsubStatus = OfflineLayer.onStatusChange((newStatus) => {
      setStatus(newStatus);
    });
    const unsubSync = OfflineLayer.onSyncProgress(({ processed, total }) => {
      setIsSyncing(processed < total);
    });
    return () => {
      unsubStatus();
      unsubSync();
    };
  }, []);

  if (status === 'online' && !isSyncing) return null;

  const getBannerDetails = () => {
    if (isSyncing) {
      return { text: 'SYNCING CHANGES', color: '#9b30ff', icon: 'sync' };
    }
    if (status === 'offline') {
      return { text: 'OFFLINE - QUEUED FOR SYNC', color: '#d32f2f', icon: 'cloud-offline' };
    }
    if (status === '2g') {
      return { text: '2G MODE - SLOW SYNC', color: '#f57c00', icon: 'cellular' };
    }
    return { text: '', color: 'transparent', icon: '' };
  };

  const details = getBannerDetails();

  return (
    <View style={[styles.banner, { backgroundColor: details.color }]}>
      <Ionicons name={details.icon} size={16} color="#fff" style={styles.icon} />
      <Text style={styles.text}>{details.text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    width: '100%',
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  icon: {
    marginRight: 6,
  }
});
