// Mock for @react-native-community/netinfo in Jest tests
// NetInfoState is a discriminated union — each 'type' value requires a specific
// 'details' shape. We use `as unknown as NetInfoState` throughout so we only need
// to provide the fields our SDK actually reads (isConnected, type, cellularGeneration).
import type { NetInfoState } from '@react-native-community/netinfo';

let _listeners: Array<(state: NetInfoState) => void> = [];
let _mockState: NetInfoState = {
  type:                'wifi',
  isConnected:         true,
  isInternetReachable: true,
  details:             null,
} as unknown as NetInfoState;

const NetInfo = {
  fetch: jest.fn(async () => _mockState),
  addEventListener: jest.fn((listener: (state: NetInfoState) => void) => {
    _listeners.push(listener);
    return () => {
      _listeners = _listeners.filter((l) => l !== listener);
    };
  }),

  // Test helpers — call these in tests to simulate network changes
  __mockOnline: () => {
    _mockState = {
      type: 'wifi', isConnected: true, isInternetReachable: true, details: null,
    } as unknown as NetInfoState;
    _listeners.forEach((fn) => fn(_mockState));
  },
  __mockOffline: () => {
    _mockState = {
      type: 'none', isConnected: false, isInternetReachable: false, details: null,
    } as unknown as NetInfoState;
    _listeners.forEach((fn) => fn(_mockState));
  },
  __mock2G: () => {
    _mockState = {
      type: 'cellular', isConnected: true, isInternetReachable: true,
      details: { cellularGeneration: '2g', carrier: 'Jio', isConnectionExpensive: true },
    } as unknown as NetInfoState;
    _listeners.forEach((fn) => fn(_mockState));
  },
};

export default NetInfo;

