import { Platform } from 'react-native';

// Determine API base URL from environment with sensible fallbacks
// Expo exposes variables prefixed with EXPO_PUBLIC_ at runtime
const envApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

// Android emulator cannot reach localhost of host machine directly
// Use 10.0.2.2 for Android emulator, 127.0.0.1/localhost for iOS/web/dev
const getLocalhostForPlatform = (): string => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000';
  }
  return 'http://localhost:3000';
};

export const API_BASE_URL = envApiUrl && envApiUrl.length > 0
  ? envApiUrl.replace(/\/$/, '')
  : getLocalhostForPlatform();

export const getApiUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

export default API_BASE_URL;


