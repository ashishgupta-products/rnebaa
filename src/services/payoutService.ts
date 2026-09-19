import { API_CONFIG } from '../config/authConfig';
import { getSavedBackendToken } from './backendAuthService';

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

/**
 * Fetch authenticated user's withdrawal history from PostgreSQL database.
 */
export async function fetchUserPayouts(
  userEmail?: string
): Promise<PayoutItem[] | null> {
  if (!userEmail) return [];
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
      // Return null so caller knows this was a server/network error and does NOT wipe local cache
      return null;
    }

    const data = await res.json().catch(() => ({}));
    const rawList: any[] = Array.isArray(data)
      ? data
      : Array.isArray(data.requests)
      ? data.requests
      : Array.isArray(data.payouts)
      ? data.payouts
      : [];

    // Strictly filter by current user's email so other users' payouts are never mixed in
    const list = userEmail
      ? rawList.filter((item: any) => {
          const itemEmail = (item.email || item.userEmail || '').toLowerCase().trim();
          return itemEmail === userEmail.toLowerCase().trim();
        })
      : rawList;

    return list.map((item: any) => ({
      id: String(item.id || `wd-${Date.now()}`),
      amount: Number(item.amount || 0),
      method: String(item.payoutRail || item.method || 'UPI'),
      account: String(item.payoutDetails || item.upi || item.account || 'Account'),
      status: item.status === 'Completed' || item.status === 'Processed'
        ? 'Completed'
        : item.status === 'Rejected'
        ? 'Rejected'
        : 'Pending',
      date: String(item.date || item.createdAt || 'Recently'),
    }));
  } catch (err) {
    console.error('Error fetching user payouts:', err);
    return null;
  }
}
