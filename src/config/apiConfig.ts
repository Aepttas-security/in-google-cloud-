import { Platform } from 'react-native';

/**
 * Central API Configuration for Parent Control Backend
 * - Dynamically extracts Host LAN IP from Expo environment when running on physical devices
 * - Android Emulator uses 10.0.2.2 to reach host machine localhost
 * - Web / Desktop uses 127.0.0.1 or localhost
 * - Port 8000 is the running FastAPI server
 */
const getHostFromExpo = (): string | null => {
  try {
    const g = globalThis as any;
    const constants = g?.expo?.modules?.ExponentConstants || g?.NativeModules?.ExponentConstants;
    const hostUri = constants?.debuggerHost || constants?.manifest?.debuggerHost || constants?.manifest2?.extra?.expoGo?.developer?.tool;
    if (hostUri) {
      const ip = String(hostUri).split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
        return ip;
      }
    }
  } catch { }
  return null;
};


export const PRODUCTION_URL = 'https://aepttas-backend-321380050559.asia-south1.run.app';
const expoIp = getHostFromExpo();
export const DEFAULT_HOST = expoIp || '192.168.28.93';
const CANDIDATE_HOSTS = [PRODUCTION_URL];
const DEFAULT_PORT = '5000';

let customBaseUrl: string | null = null;
let resolvedWorkingBaseUrl: string = PRODUCTION_URL;

export const getUnifiedBaseUrl = (): string => {
  if (customBaseUrl) {
    return customBaseUrl;
  }
  return resolvedWorkingBaseUrl;
};

export const getFallbackUrls = (): string[] => {
  return [PRODUCTION_URL];
};

export const setResolvedHost = (url: string) => {
  resolvedWorkingBaseUrl = url.replace(/\/+$/, '');
};

const getLocalBaseUrl = (port: number): string => {
  if (customBaseUrl) return customBaseUrl;
  return PRODUCTION_URL || `http://${DEFAULT_HOST}:${port}`;
};

export const getParentalBaseUrl = (): string => {
  return getLocalBaseUrl(5000);
};

export const getApiBaseUrl = (): string => {
  return getLocalBaseUrl(5000);
};

export const getMalwareBaseUrl = (): string => {
  return getLocalBaseUrl(5000);
};

export const getAuthBaseUrl = (): string => {
  return getLocalBaseUrl(5000);
};

export const getGeoBaseUrl = (): string => {
  // Port 5000 is the Unified Backend hosting /api/v1/geolocation/*
  return getLocalBaseUrl(5000);
};

export const getVulnBaseUrl = (): string => {
  return getLocalBaseUrl(5000);
};

export const getCallerBaseUrl = (): string => {
  return getLocalBaseUrl(5000);
};

export const setApiBaseUrl = (url: string) => {
  customBaseUrl = url.trim().replace(/\/+$/, '');
};

export const API_BASE_URL = `http://${DEFAULT_HOST}:${DEFAULT_PORT}`;
