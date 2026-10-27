// src/api/config.ts
import { Platform } from 'react-native';

/**
 * Network API Configuration for Physical Android Devices, Emulators, & Public Tunnels.
 * 
 * - Public Tunnel / Remote URL: Set REMOTE_TUNNEL_URL (e.g., https://xyz.antigravity.dev or https://xyz.ngrok-free.app)
 * - Physical Android phone on LAN: 192.168.28.93:5000
 * - Android Emulator: 10.0.2.2:5000 points to host PC localhost
 * - iOS Simulator / Web: 127.0.0.1:5000
 */

// 🌐 REMOTE TUNNEL URL (Replace with your live tunnel or remote host)
export const REMOTE_TUNNEL_URL = '<https://aepttas-backend-321380050559.asia-south1.run.app/>';

// Local fallback hosts
export const LAN_HOST = '192.168.28.93';
export const EMULATOR_HOST = '10.0.2.2';
export const LOCALHOST = '127.0.0.1';

// Unified Backend Port
export const BACKEND_PORT = 5000;

// Dynamic runtime override
let runtimeCustomBaseUrl: string | null = null;

export const setCustomBackendUrl = (url: string): void => {
  if (url && url.trim()) {
    runtimeCustomBaseUrl = url.trim().replace(/\/+$/, '');
  }
};

/**
 * Resolve working host for local LAN or emulator
 */
const getResolvedHost = (): string => {
  try {
    const g = globalThis as any;
    const constants = g?.expo?.modules?.ExponentConstants || g?.NativeModules?.ExponentConstants;
    const hostUri = constants?.debuggerHost || constants?.manifest?.debuggerHost;
    if (hostUri) {
      const ip = String(hostUri).split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
        return ip;
      }
    }
  } catch {}

  return LAN_HOST;
};

export const ACTIVE_HOST = getResolvedHost();

/**
 * Centralized Base URL Resolver
 * Priority: Runtime Override > Remote Tunnel (if set) > Local LAN / Emulator
 */
export const getBackendBaseUrl = (): string => {
  if (runtimeCustomBaseUrl) {
    return runtimeCustomBaseUrl;
  }

  // Check if tunnel URL is valid (not the placeholder)
  if (
    REMOTE_TUNNEL_URL &&
    !REMOTE_TUNNEL_URL.startsWith('<REPLACE_') &&
    (REMOTE_TUNNEL_URL.startsWith('http://') || REMOTE_TUNNEL_URL.startsWith('https://'))
  ) {
    return REMOTE_TUNNEL_URL.replace(/\/+$/, '');
  }

  return `http://${ACTIVE_HOST}:${BACKEND_PORT}`;
};

// Base URLs
export const API_BASE_URL = getBackendBaseUrl();
export const EMULATOR_BASE_URL = `http://${EMULATOR_HOST}:${BACKEND_PORT}`;
export const LOCAL_BASE_URL = `http://${LOCALHOST}:${BACKEND_PORT}`;

// Geolocation Endpoints
export const GEOLOCATION_BASE_URL = API_BASE_URL;
export const GEOLOCATION_CURRENT_ENDPOINT = `${API_BASE_URL}/api/v1/geolocation/current`;
export const GEOLOCATION_SAVE_ENDPOINT = `${API_BASE_URL}/api/v1/geolocation/save`;
export const GEOLOCATION_HISTORY_ENDPOINT = `${API_BASE_URL}/api/v1/geolocation/history`;
export const GEOLOCATION_NEARBY_ENDPOINT = `${API_BASE_URL}/api/v1/geolocation/nearby`;

// Parental Control Contract Endpoints
export const PAIRING_LINK_ENDPOINT = '/api/pairing/link';
export const LOCATION_TELEMETRY_ENDPOINT = '/api/location/telemetry';
export const APPS_SYNC_ENDPOINT = '/api/apps/sync';

export const CONFIG = {
  get BASE_URL() {
    return getBackendBaseUrl();
  },
  API_BASE_URL,
  REMOTE_TUNNEL_URL,
  GEOLOCATION_BASE_URL,
  GEOLOCATION_CURRENT_ENDPOINT,
  GEOLOCATION_SAVE_ENDPOINT,
  GEOLOCATION_HISTORY_ENDPOINT,
  GEOLOCATION_NEARBY_ENDPOINT,
  PAIRING_LINK_ENDPOINT,
  LOCATION_TELEMETRY_ENDPOINT,
  APPS_SYNC_ENDPOINT,
  PORT: BACKEND_PORT,
  LAN_HOST,
  EMULATOR_HOST,
};

export default CONFIG;
