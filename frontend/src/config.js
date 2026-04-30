import Constants from 'expo-constants';

// Dynamically resolve the IP address that Expo is running on.
// This permanently fixes the "Network request failed" IP mismatch errors!
let hostIp = '127.0.0.1';

if (Constants.expoConfig?.hostUri) {
  hostIp = Constants.expoConfig.hostUri.split(':')[0];
} else if (Constants.manifest?.debuggerHost) {
  hostIp = Constants.manifest.debuggerHost.split(':')[0];
} else if (Constants.manifest2?.extra?.expoGo?.debuggerHost) {
  hostIp = Constants.manifest2.extra.expoGo.debuggerHost.split(':')[0];
}

export const API_URL = `http://${hostIp}:8000`;
export const WS_URL = `ws://${hostIp}:8000`;
