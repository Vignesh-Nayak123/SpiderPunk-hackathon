import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import OfflineLayer from 'offline-layer-sdk';

export default function StatusScreen() {
  const [cacheStatus, setCacheStatus] = useState(OfflineLayer.getCacheStats());
  const [networkState, setNetworkState] = useState(OfflineLayer.getConnectionStatus());
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const unsubStatus = OfflineLayer.onStatusChange((status) => {
      setNetworkState(status);
    });
    
    const unsubSync = OfflineLayer.onSyncProgress(({ processed, total }) => {
      setIsSyncing(processed < total);
    });

    // periodic cache update
    const interval = setInterval(async () => {
      setCacheStatus(OfflineLayer.getCacheStats());
    }, 2000);

    return () => {
      unsubStatus();
      unsubSync();
      clearInterval(interval);
    };
  }, []);

  const progress = (cacheStatus.used / cacheStatus.limit) * 100;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.sectionTitle}>System Status</Text>
          <Text style={styles.version}>v2.4.0-stable</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.statusRow}>
            <View style={styles.statusInfo}>
              <View style={[styles.statusDot, { backgroundColor: networkState === 'offline' ? '#d32f2f' : '#9b30ff' }]} />
              <View>
                <Text style={styles.statusTitle}>{networkState === 'offline' ? 'Offline' : isSyncing ? 'Syncing' : 'Online'}</Text>
                <Text style={styles.statusSubtitle}>Last heartbeat: 12ms ago</Text>
              </View>
            </View>
            <View style={styles.uplinkInfo}>
              <Text style={styles.uplinkSpeed}>{networkState === 'offline' ? '0 Kbps' : '842.1 Kbps'}</Text>
              <Text style={styles.uplinkLabel}>Uplink Activity</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Storage Budget</Text>
        <View style={styles.card}>
          <Text style={styles.usedLabel}>Used Space</Text>
          <View style={styles.storageRow}>
            <Text style={styles.usedValue}>{cacheStatus.used}</Text>
            <Text style={styles.limitValue}> / {cacheStatus.limit} MB</Text>
            <View style={{ flex: 1 }} />
            <Text style={styles.capacityValue}>{progress.toFixed(1)}% Capacity</Text>
          </View>
          
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progress}%` }]} />
          </View>

          <View style={styles.storageDetails}>
            <View style={styles.storageBox}>
              <Text style={styles.storageBoxLabel}>METADATA</Text>
              <Text style={styles.storageBoxValue}>{cacheStatus.metadata} MB</Text>
            </View>
            <View style={styles.storageBox}>
              <Text style={styles.storageBoxLabel}>RESOURCES</Text>
              <Text style={styles.storageBoxValue}>{cacheStatus.resources} MB</Text>
            </View>
          </View>
        </View>

        <View style={styles.header}>
          <Text style={styles.sectionTitle}>Pre-fetched Repositories</Text>
          <TouchableOpacity><Text style={styles.purgeText}>PURGE ALL</Text></TouchableOpacity>
        </View>

        {[
          { id: '1', name: 'core-api-v2', time: '2h ago', size: '12.4 MB', icon: 'code-slash' },
          { id: '2', name: 'assets-bundle-ios', time: '14m ago', size: '8.1 MB', icon: 'cube' },
          { id: '3', name: 'analytics-schema-prod', time: '5d ago', size: '11.9 MB', icon: 'git-network' },
        ].map(repo => (
          <View key={repo.id} style={styles.repoCard}>
            <View style={styles.repoIconContainer}>
              <Ionicons name={repo.icon} size={20} color="#b0b3c6" />
            </View>
            <View style={styles.repoInfo}>
              <Text style={styles.repoName}>{repo.name}</Text>
              <Text style={styles.repoDetails}>Cached {repo.time} • {repo.size}</Text>
            </View>
            <TouchableOpacity>
              <Ionicons name="trash-outline" size={20} color="#b0b3c6" />
            </TouchableOpacity>
          </View>
        ))}

        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Ionicons name="flash" size={20} color="#2196f3" style={styles.metricIcon} />
            <Text style={styles.metricLabel}>AVG LATENCY</Text>
            <Text style={styles.metricValue}>14ms</Text>
          </View>
          <View style={styles.metricCard}>
            <Ionicons name="time" size={20} color="#9b30ff" style={styles.metricIcon} />
            <Text style={styles.metricLabel}>UPTIME</Text>
            <Text style={styles.metricValue}>99.9%</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f111a' },
  scrollContent: { padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 8 },
  sectionTitle: { color: '#b0b3c6', fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
  version: { color: '#00bcd4', fontSize: 12 },
  card: { backgroundColor: '#1a1c29', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#2a2d40' },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusInfo: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#9b30ff', marginRight: 12 },
  statusTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  statusSubtitle: { color: '#b0b3c6', fontSize: 12, marginTop: 4 },
  uplinkInfo: { alignItems: 'flex-end' },
  uplinkSpeed: { color: '#e1bee7', fontSize: 14, fontWeight: 'bold' },
  uplinkLabel: { color: '#b0b3c6', fontSize: 10, marginTop: 2 },
  usedLabel: { color: '#b0b3c6', fontSize: 12, marginBottom: 8 },
  storageRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 16 },
  usedValue: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  limitValue: { color: '#b0b3c6', fontSize: 16 },
  capacityValue: { color: '#9b30ff', fontSize: 12, fontWeight: 'bold' },
  progressBarContainer: { height: 6, backgroundColor: '#2a2d40', borderRadius: 3, marginBottom: 24 },
  progressBar: { height: 6, backgroundColor: '#9b30ff', borderRadius: 3 },
  storageDetails: { flexDirection: 'row', justifyContent: 'space-between' },
  storageBox: { flex: 1, backgroundColor: '#0f111a', borderRadius: 12, padding: 12, marginRight: 8 },
  storageBoxLabel: { color: '#b0b3c6', fontSize: 10, letterSpacing: 1, marginBottom: 4 },
  storageBoxValue: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  purgeText: { color: '#d32f2f', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  repoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1c29', borderRadius: 16, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: '#2a2d40' },
  repoIconContainer: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#2a2d40', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  repoInfo: { flex: 1 },
  repoName: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  repoDetails: { color: '#b0b3c6', fontSize: 12 },
  metricsRow: { flexDirection: 'row', marginTop: 8, marginBottom: 24 },
  metricCard: { flex: 1, backgroundColor: '#1a1c29', borderRadius: 16, padding: 16, marginRight: 8, borderWidth: 1, borderColor: '#2a2d40' },
  metricIcon: { marginBottom: 12 },
  metricLabel: { color: '#b0b3c6', fontSize: 10, letterSpacing: 1, marginBottom: 4 },
  metricValue: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
