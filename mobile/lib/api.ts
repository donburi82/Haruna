import { Platform } from 'react-native';
import Constants from 'expo-constants';

export const getBaseUrl = () => {
  // Example hostUri: "10.17.5.186:8081" or "localhost:8081"
  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) {
    // Fallbacks if hostUri is unavailable
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:5050';
    }
    return 'http://localhost:5050';
  }

  const host = hostUri.split(':')[0];

  // Special case: Android emulator + localhost
  if (Platform.OS === 'android' && host === 'localhost') {
    return 'http://10.0.2.2:5050';
  }

  // For physical devices (and LAN mode), use host:5050
  return `http://${host}:5050`;
};

export const API_BASE_URL = getBaseUrl();
export async function api(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${API_BASE_URL}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  return res;
}
