import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import OfflineLayer from 'offline-layer-sdk';

export default function DemoControlScreen() {
  const [networkState, setNetworkState] = useState(OfflineLayer.getConnectionStatus());
  const [queueLength, setQueueLength] = useState(0);
  const [userId, setUserId] = useState('UserA');
  const [logs, setLogs] = useState([
    { time: '14:02:01', level: 'INFO', msg: 'Initializing reconciliation layer...' },
  ]);

  useEffect(() => {
    const unsubStatus = OfflineLayer.onStatusChange((status) => {
      setNetworkState(status);
      addLog(`Network state changed to ${status}`);
    });
    
    // Polling for queue length since SDK only notifies on flush progress
    const interval = setInterval(async () => {
      const q = await OfflineLayer.getQueue();
      setQueueLength(q.length);
    }, 1000);

    return () => {
      unsubStatus();
      clearInterval(interval);
    };
  }, []);

  const isOffline = networkState === 'offline';
  const is2G = networkState === '2g';

  const handleManualSync = () => {
    OfflineLayer.forceSync();
    addLog('Triggered manual synchronization');
  };

  const addLog = (msg) => {
    const time = new Date().toLocaleTimeString([], { hour12: false });
    setLogs(prev => [...prev, { time, level: 'INFO', msg }]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="layers" size={24} color="#9b30ff" />
        <Text style={styles.headerTitle}>OFFLINE LAYER</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.cardMain}>
          <View style={styles.sdkHeader}>
            <View style={[styles.statusDot, { backgroundColor: isOffline ? '#d32f2f' : '#9b30ff' }]} />
            <View>
              <Text style={styles.sdkTitle}>SDK Healthy</Text>
              <Text style={styles.sdkSubtitle}>Core Protocol Active • V2.4.1</Text>
            </View>
            <View style={{ flex: 1 }} />
            <Ionicons name="shield-checkmark" size={24} color="#9b30ff" />
          </View>
        </View>

        <View style={styles.togglesRow}>
          <View style={styles.toggleCard}>
            <Ionicons name="person-outline" size={24} color="#b0b3c6" style={styles.toggleIcon} />
            <Text style={styles.toggleTitle}>Active User</Text>
            <View style={styles.toggleControl}>
              <Text style={styles.toggleState}>{userId}</Text>
              <Switch 
                value={userId === 'UserB'} 
                onValueChange={(val) => {
                  const newId = val ? 'UserB' : 'UserA';
                  setUserId(newId);
                  OfflineLayer.setUserId(newId);
                  addLog(`Switched identity to ${newId}`);
                }} 
                trackColor={{ true: '#9b30ff', false: '#2a2d40' }} 
              />
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Traffic Flow</Text>
          <View style={styles.trafficHeader}>
            <Text style={styles.trafficSubtitle}>Packet Distribution per Second</Text>
            <Text style={styles.trafficPeak}>2.4 MB/s Peak</Text>
          </View>
          
          <View style={styles.chartPlaceholder}>
            {/* Chart mockup line */}
            <View style={styles.chartLine} />
          </View>

          <View style={styles.trafficStats}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Queue</Text>
              <Text style={styles.statValue}>{queueLength}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Latency</Text>
              <Text style={styles.statValue}>{isOffline ? '-' : is2G ? '542ms' : '42ms'}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Retries</Text>
              <Text style={styles.statValue}>3</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Data Persistence</Text>
          <Text style={styles.cardDesc}>Forcing manual synchronization bypasses standard interval scheduling for immediate data reconciliation.</Text>
          
          <TouchableOpacity style={styles.syncButton} onPress={handleManualSync}>
            <Ionicons name="sync" size={20} color="#fff" style={styles.syncIcon} />
            <Text style={styles.syncButtonText}>Trigger Manual Sync</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.consoleCard}>
          <View style={styles.consoleHeader}>
            <Text style={styles.consoleTitle}>Live Console</Text>
            <Text style={styles.consoleStatus}>{isOffline ? 'Disconnected' : 'Connected'}</Text>
          </View>
          
          {logs.slice(-5).map((log, i) => (
            <View key={i} style={styles.logRow}>
              <Text style={styles.logTime}>[{log.time}]</Text>
              <Text style={[styles.logLevel, { color: log.level === 'SYNC' ? '#e1bee7' : '#00bcd4' }]}>{log.level}</Text>
              <Text style={styles.logMsg}>{log.msg}</Text>
            </View>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f111a' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#2a2d40' },
  headerTitle: { color: '#00bcd4', fontSize: 16, fontWeight: 'bold', letterSpacing: 2, marginLeft: 8 },
  content: { padding: 16 },
  cardMain: { backgroundColor: '#1a1c29', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#9b30ff', borderLeftWidth: 4 },
  sdkHeader: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  sdkTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  sdkSubtitle: { color: '#b0b3c6', fontSize: 12, marginTop: 4 },
  togglesRow: { flexDirection: 'row', marginBottom: 16 },
  toggleCard: { flex: 1, backgroundColor: '#1a1c29', borderRadius: 16, padding: 16, marginRight: 8, borderWidth: 1, borderColor: '#2a2d40' },
  toggleIcon: { marginBottom: 12 },
  toggleTitle: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginBottom: 12 },
  toggleControl: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggleState: { color: '#00bcd4', fontSize: 12 },
  card: { backgroundColor: '#1a1c29', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#2a2d40' },
  cardTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  trafficHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  trafficSubtitle: { color: '#b0b3c6', fontSize: 12 },
  trafficPeak: { color: '#e1bee7', fontSize: 12 },
  chartPlaceholder: { height: 60, marginVertical: 16, borderBottomWidth: 1, borderBottomColor: '#2a2d40', justifyContent: 'center' },
  chartLine: { height: 2, backgroundColor: '#9b30ff', width: '100%', opacity: 0.5 },
  trafficStats: { flexDirection: 'row', justifyContent: 'space-between' },
  statBox: { alignItems: 'center' },
  statLabel: { color: '#b0b3c6', fontSize: 12, fontWeight: 'bold', marginBottom: 4 },
  statValue: { color: '#fff', fontSize: 16 },
  cardDesc: { color: '#b0b3c6', fontSize: 14, marginTop: 8, marginBottom: 16, lineHeight: 20 },
  syncButton: { flexDirection: 'row', backgroundColor: '#9b30ff', borderRadius: 12, padding: 16, alignItems: 'center', justifyContent: 'center' },
  syncIcon: { marginRight: 8 },
  syncButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  consoleCard: { backgroundColor: '#1a1c29', borderRadius: 16, padding: 16, marginBottom: 32, borderWidth: 1, borderColor: '#2a2d40' },
  consoleHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  consoleTitle: { color: '#b0b3c6', fontSize: 12 },
  consoleStatus: { color: '#9b30ff', fontSize: 12 },
  logRow: { flexDirection: 'row', marginBottom: 8 },
  logTime: { color: '#b0b3c6', fontSize: 12, marginRight: 8, fontFamily: 'monospace' },
  logLevel: { fontSize: 12, marginRight: 8, fontFamily: 'monospace', width: 40 },
  logMsg: { color: '#b0b3c6', fontSize: 12, flex: 1, fontFamily: 'monospace' },
});
