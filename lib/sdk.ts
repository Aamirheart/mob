import Medusa from "@medusajs/js-sdk";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

// 1. FIX: Match the exact names from your .env file
const MEDUSA_BACKEND_URL =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_MEDUSA_BACKEND_URL ||
  process.env.EXPO_PUBLIC_MEDUSA_BACKEND_URL ||
  "http://localhost:9000";

const MEDUSA_PUBLISHABLE_KEY = 
  Constants.expoConfig?.extra?.EXPO_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
  process.env.EXPO_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
  "";

console.log("🔌 Connecting to:", MEDUSA_BACKEND_URL);

// 2. FIX: Create a proper storage adapter
const storage = {
  setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
  getItem: (key: string) => AsyncStorage.getItem(key),
  removeItem: (key: string) => AsyncStorage.removeItem(key),
};

export const sdk = new Medusa({
  baseUrl: MEDUSA_BACKEND_URL,
  debug: __DEV__,
  publishableKey: MEDUSA_PUBLISHABLE_KEY,
  // 3. FIX: 'storage' must be at the root, NOT inside 'auth'
  storage: storage, 
});