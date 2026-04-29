// Mock for @react-native-async-storage/async-storage in Jest tests
const store: Record<string, string> = {};

const AsyncStorage = {
  getItem:    jest.fn(async (key: string) => store[key] ?? null),
  setItem:    jest.fn(async (key: string, value: string) => { store[key] = value; }),
  removeItem: jest.fn(async (key: string) => { delete store[key]; }),
  getAllKeys:  jest.fn(async () => Object.keys(store)),
  multiGet:   jest.fn(async (keys: string[]) =>
    keys.map((k) => [k, store[k] ?? null] as [string, string | null])
  ),
  multiRemove: jest.fn(async (keys: string[]) => {
    keys.forEach((k) => delete store[k]);
  }),
  clear: jest.fn(async () => {
    Object.keys(store).forEach((k) => delete store[k]);
  }),
  _store: store, // expose for test assertions
};

export default AsyncStorage;
