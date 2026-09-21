import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/authConfig';

export interface IndependentApp {
  id: string;
  appName: string;
  appImage: string;
  description: string;
  referralCode?: string;
  appLink?: string;
  rewardBadge?: string;
  category?: string;
  isActive?: boolean;
  createdAt?: string;
}

const INDEPENDENT_APPS_CACHE_KEY = '@cached_independent_apps_v1';

// In-memory cache for independent apps to prevent continuous database queries
let cachedIndependentApps: IndependentApp[] | null = null;
let lastIndependentAppsFetchTimestamp = 0;
const INDEPENDENT_APPS_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL
let pendingIndependentAppsPromise: Promise<IndependentApp[]> | null = null;

// Eagerly restore independent apps from AsyncStorage on module load for 0ms initial render
AsyncStorage.getItem(INDEPENDENT_APPS_CACHE_KEY)
  .then((stored) => {
    if (stored && !cachedIndependentApps) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          cachedIndependentApps = parsed;
        }
      } catch {}
    }
  })
  .catch(() => {});

export function getCachedIndependentApps(): IndependentApp[] | null {
  return cachedIndependentApps;
}

/**
 * Fetches the direct / independent payout apps created by the admin on earnbyapps.com.
 * Visible on domain/instantpayout (instantpayot) via /api/independent.
 * If forceFresh is false and cached within 5 minutes, returns from memory without hitting the database.
 */
export async function fetchIndependentApps(forceFresh = false): Promise<IndependentApp[]> {
  const now = Date.now();
  if (
    cachedIndependentApps &&
    !forceFresh &&
    now - lastIndependentAppsFetchTimestamp < INDEPENDENT_APPS_TTL_MS
  ) {
    return cachedIndependentApps;
  }

  if (pendingIndependentAppsPromise) {
    return pendingIndependentAppsPromise;
  }

  pendingIndependentAppsPromise = (async () => {
    try {
      const res = await fetch(`${API_CONFIG.baseUrl}/api/independent`, {
        headers: {
          Accept: 'application/json',
        },
      });

      if (!res.ok) {
        console.warn(`Independent apps fetch failed: HTTP ${res.status}`);
        return cachedIndependentApps || [];
      }

      const data = await res.json();
      const rawApps: any[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.apps)
        ? data.apps
        : [];

      const apps: IndependentApp[] = rawApps
        .filter((item: any) => item && item.isActive !== false)
        .map((item: any) => ({
          id: String(item.id || ''),
          appName: String(item.appName || 'Direct Payout App'),
          appImage: String(item.appImage || item.logoUrl || ''),
          description: String(item.description || ''),
          referralCode: item.referralCode ? String(item.referralCode).trim() : undefined,
          appLink: String(item.appLink || item.externalUrl || ''),
          rewardBadge: String(item.rewardBadge || (item.reward ? `₹${item.reward} Direct` : 'Direct Payout')),
          category: String(item.category || 'Direct Pay App'),
          isActive: item.isActive !== false,
          createdAt: item.createdAt ? String(item.createdAt) : undefined,
        }));

      cachedIndependentApps = apps;
      lastIndependentAppsFetchTimestamp = Date.now();
      AsyncStorage.setItem(INDEPENDENT_APPS_CACHE_KEY, JSON.stringify(apps)).catch(() => {});
      return apps;
    } catch (err) {
      console.error('Error fetching independent apps from /api/independent:', err);
      return cachedIndependentApps || [];
    } finally {
      pendingIndependentAppsPromise = null;
    }
  })();

  return pendingIndependentAppsPromise;
}
