import { API_CONFIG } from '../config/authConfig';
import { getSavedBackendToken, invalidateUserCache } from './backendAuthService';

export interface PayoutRequestPayload {
  amount: number;
  method: 'UPI' | 'Bank Transfer' | 'Paytm';
  account: string;
  upiId?: string;
  email?: string;
}

export interface PayoutItem {
  id: string;
  amount: number;
  method: string;
  account: string;
  status: 'Pending' | 'Processed' | 'Completed' | 'Rejected';
  date: string;
}

/**
 * Submit a real withdrawal request to the Next.js production backend.
 * Protected by Authorization: Bearer <token> so withdrawals are bound strictly to the authenticated user.
 */
export async function requestPayout(
  payload: PayoutRequestPayload
): Promise<{ success: boolean; payout?: PayoutItem; error?: string }> {
  try {
    const token = await getSavedBackendToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const body = {
      amount: payload.amount,
      payoutRail: payload.method === 'UPI' ? 'upi' : 'bank',
      payoutDetails: payload.upiId || payload.account,
      method: payload.method,
      account: payload.account,
      upiId: payload.upiId || payload.account,
      email: payload.email,
      originAppId: 'earnbyapps-mobile',
    };

    let res = await fetch(`${API_CONFIG.baseUrl}/api/payouts`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || data.success === false) {
      return {
        success: false,
        error: data.error || data.message || `Payout request failed (HTTP ${res.status})`,
      };
    }

    const payoutItem: PayoutItem = {
      id: data.id || data.payoutId || `WD-${Date.now().toString().slice(-6)}`,
      amount: payload.amount,
      method: payload.method,
      account: payload.account,
      status: 'Pending',
      date: new Date().toISOString().replace('T', ' at ').slice(0, 19),
    };

    if (payload.email) {
      invalidatePayoutsCache(payload.email);
    }
    invalidateUserCache();

    return {
      success: true,
      payout: payoutItem,
    };
  } catch (err: any) {
    console.error('Error requesting payout:', err);
    return {
      success: false,
      error: err.message || 'Network error requesting payout',
    };
  }
}

// In-memory cache for user payouts to conserve Neon compute
const cachedPayoutsMap = new Map<string, PayoutItem[]>();
const lastPayoutsFetchMap = new Map<string, number>();
const pendingPayoutsPromiseMap = new Map<string, Promise<PayoutItem[] | null>>();
const PAYOUTS_CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes TTL

export function invalidatePayoutsCache(userEmail?: string): void {
  if (userEmail) {
    const key = userEmail.toLowerCase().trim();
    cachedPayoutsMap.delete(key);
    lastPayoutsFetchMap.delete(key);
  } else {
    cachedPayoutsMap.clear();
    lastPayoutsFetchMap.clear();
  }
}

/**
 * Fetch authenticated user's withdrawal history from PostgreSQL database.
 * If forceFresh is false and cached within 3 minutes, returns from memory without hitting Neon.
 */
export async function fetchUserPayouts(
  userEmail?: string,
  forceFresh = false
): Promise<PayoutItem[] | null> {
  if (!userEmail) return [];
  const key = userEmail.toLowerCase().trim();
  const now = Date.now();

  const cached = cachedPayoutsMap.get(key);
  const lastFetched = lastPayoutsFetchMap.get(key) || 0;
  if (!forceFresh && cached && now - lastFetched < PAYOUTS_CACHE_TTL_MS) {
    return cached;
  }

  const existingPromise = pendingPayoutsPromiseMap.get(key);
  if (existingPromise) {
    return existingPromise;
  }

  const promise = (async () => {
    try {
      const token = await getSavedBackendToken();
      const headers: Record<string, string> = {
        Accept: 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const url = `${API_CONFIG.baseUrl}/api/payouts?email=${encodeURIComponent(userEmail.trim())}`;

      let res = await fetch(url, { headers });

      if (!res.ok) {
        console.warn(`Payouts fetch failed with HTTP ${res.status}`);
        return cached || null;
      }

      const data = await res.json().catch(() => ({}));
      const rawList: any[] = Array.isArray(data)
        ? data
        : Array.isArray(data.requests)
        ? data.requests
        : Array.isArray(data.payouts)
        ? data.payouts
        : [];

      const list = userEmail
        ? rawList.filter((item: any) => {
            const itemEmail = (item.email || item.userEmail || '').toLowerCase().trim();
            return itemEmail === userEmail.toLowerCase().trim();
          })
        : rawList;

      const results: PayoutItem[] = list.map((item: any) => ({
        id: String(item.id || `wd-${Date.now()}`),
        amount: Number(item.amount || 0),
        method: String(item.payoutRail || item.method || 'UPI'),
        account: String(item.payoutDetails || item.upi || item.account || 'Account'),
        status: (item.status === 'Completed' || item.status === 'Processed'
          ? 'Completed'
          : item.status === 'Rejected'
          ? 'Rejected'
          : 'Pending') as 'Pending' | 'Processed' | 'Completed' | 'Rejected',
        date: String(item.date || item.createdAt || 'Recently'),
      }));

      cachedPayoutsMap.set(key, results);
      lastPayoutsFetchMap.set(key, Date.now());
      return results;
    } catch (err) {
      console.error('Error fetching user payouts:', err);
      return cached || null;
    } finally {
      pendingPayoutsPromiseMap.delete(key);
    }
  })();

  pendingPayoutsPromiseMap.set(key, promise);
  return promise;
}
