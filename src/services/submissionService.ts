import { Platform } from 'react-native';
import { API_CONFIG } from '../config/authConfig';
import { TaskHistoryItem } from '../types/campaign';
import { getSavedBackendToken, invalidateUserCache } from './backendAuthService';

// In-memory cache for user submissions to eliminate unnecessary database hits
const cachedSubmissionsMap = new Map<string, TaskHistoryItem[]>();
const lastSubmissionsFetchMap = new Map<string, number>();
const pendingSubmissionsPromiseMap = new Map<string, Promise<TaskHistoryItem[]>>();
const SUBMISSIONS_CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes TTL

export function invalidateSubmissionsCache(userEmail?: string): void {
  if (userEmail) {
    const key = userEmail.toLowerCase().trim();
    cachedSubmissionsMap.delete(key);
    lastSubmissionsFetchMap.delete(key);
  } else {
    cachedSubmissionsMap.clear();
    lastSubmissionsFetchMap.clear();
  }
}

/**
 * Service to interact with the live production submissions and upload APIs (earnbyapps.com).
 * Pulls and stores genuine user submissions from Neon PostgreSQL and saves screenshots to Cloudinary.
 * If forceFresh is false and cached within 3 minutes, returns from memory without hitting Neon.
 */
export async function fetchUserSubmissions(
  userEmail?: string,
  forceFresh = false
): Promise<TaskHistoryItem[]> {
  if (!userEmail) return [];
  const key = userEmail.toLowerCase().trim();
  const now = Date.now();

  const cached = cachedSubmissionsMap.get(key);
  const lastFetched = lastSubmissionsFetchMap.get(key) || 0;
  if (!forceFresh && cached && now - lastFetched < SUBMISSIONS_CACHE_TTL_MS) {
    return cached;
  }

  const existingPromise = pendingSubmissionsPromiseMap.get(key);
  if (existingPromise) {
    return existingPromise;
  }

  const promise = (async () => {
    try {
      const token = await getSavedBackendToken();
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const url = `${API_CONFIG.baseUrl}/api/submissions?userEmail=${encodeURIComponent(userEmail.trim())}`;
      const res = await fetch(url, { headers });

      if (!res.ok) {
        console.warn(`Submissions fetch failed: HTTP ${res.status}`);
        return cached || [];
      }

      const data: any[] = await res.json();
      if (!Array.isArray(data)) return cached || [];

      // Filter by user email if provided
      const userFiltered = userEmail
        ? data.filter(
            (item) =>
              item.userEmail &&
              item.userEmail.trim().toLowerCase() === userEmail.trim().toLowerCase()
          )
        : data;

      const results = userFiltered.map((item) => ({
        id: String(item.id || `sub-${Date.now()}`),
        appName: String(item.appName || 'Task'),
        reward: Number(item.reward || 0),
        status: (['Paid', 'Pending', 'Rejected'].includes(item.status)
          ? item.status
          : 'Pending') as 'Paid' | 'Pending' | 'Rejected',
        date: String(item.time || 'Recently'),
        proofType: String(item.proofType || 'Verification Proof'),
        proofUrl: item.proofUrl ? String(item.proofUrl) : undefined,
        appId: item.appId ? String(item.appId) : undefined,
        appLogoUrl: item.appLogoUrl || item.logoUrl || undefined,
      }));

      cachedSubmissionsMap.set(key, results);
      lastSubmissionsFetchMap.set(key, Date.now());
      return results;
    } catch (err) {
      console.error('Error fetching live submissions:', err);
      return cached || [];
    } finally {
      pendingSubmissionsPromiseMap.delete(key);
    }
  })();

  pendingSubmissionsPromiseMap.set(key, promise);
  return promise;
}

/**
 * Uploads screenshot proof directly to Cloudinary via earnbyapps.com/api/upload.
 * Returns the secure Cloudinary image URL and public ID.
 *
 * Uses XMLHttpRequest with React Native's native multipart form streamer to ensure
 * robust file uploading across both Web and Native (preventing Expo SDK 57 WinterCG
 * "Unsupported FormDataPart implementation" errors).
 */
export async function uploadProofImageToCloudinary(
  uri: string,
  mimeType: string = 'image/jpeg',
  fileName?: string
): Promise<{ success: boolean; url?: string; publicId?: string; error?: string }> {
  return new Promise(async (resolve) => {
    try {
      const formData = new FormData();
      const cleanName = fileName || uri.split('/').pop()?.split('?')[0] || 'proof_screenshot.jpg';
      const finalFileName = cleanName.includes('.') ? cleanName : `${cleanName}.jpg`;
      const finalMimeType = mimeType || (finalFileName.endsWith('.png') ? 'image/png' : 'image/jpeg');

      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        formData.append('file', blob, finalFileName);
      } else {
        formData.append('file', {
          uri,
          type: finalMimeType,
          name: finalFileName,
        } as any);
      }

      const token = await getSavedBackendToken();
      const xhr = new XMLHttpRequest();

      xhr.open('POST', `${API_CONFIG.baseUrl}/api/upload`);
      xhr.timeout = 60000; // 60-second timeout for mobile uploads

      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.onload = () => {
        let data: any = {};
        try {
          data = JSON.parse(xhr.responseText);
        } catch {
          data = {};
        }

        if (xhr.status >= 200 && xhr.status < 300) {
          if (data.url) {
            resolve({
              success: true,
              url: data.url,
              publicId: data.publicId,
            });
          } else {
            resolve({
              success: false,
              error: 'Server did not return an image URL.',
            });
          }
        } else {
          resolve({
            success: false,
            error: data.error || data.message || `Upload failed with status ${xhr.status}`,
          });
        }
      };

      xhr.onerror = () => {
        resolve({
          success: false,
          error: 'Network request failed during media upload. Please check your internet connection.',
        });
      };

      xhr.ontimeout = () => {
        resolve({
          success: false,
          error: 'Upload timed out. Please try again with a smaller image or faster connection.',
        });
      };

      xhr.send(formData);
    } catch (err: any) {
      console.error('Upload error:', err);
      resolve({
        success: false,
        error: err.message || 'Failed to upload screenshot. Please try again.',
      });
    }
  });
}

export interface NewSubmissionPayload {
  userName: string;
  userEmail: string;
  appName: string;
  appId: string;
  reward: number;
  proof: string;
  proofType?: string;
  proofUrl?: string;
  appLogoUrl?: string;
}

export async function submitTaskProof(
  payload: NewSubmissionPayload
): Promise<{ success: boolean; item?: TaskHistoryItem; error?: string }> {
  try {
    const subId = `sub-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const nowStr = new Date().toLocaleString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const finalProofType = payload.proofUrl ? 'image' : (payload.proofType || 'text');

    const body = {
      id: subId,
      userName: payload.userName || 'User',
      userEmail: payload.userEmail || '',
      appName: payload.appName,
      appId: payload.appId,
      reward: payload.reward,
      proof: payload.proof,
      proofType: finalProofType,
      proofUrl: payload.proofUrl || null,
      status: 'Pending',
      verifierEmail: 'admin',
      verificationType: 'admin',
      time: nowStr,
      originAppId: 'earnbyapps-mobile',
    };

    const token = await getSavedBackendToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let res = await fetch(`${API_CONFIG.baseUrl}/api/submissions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `Server responded with ${res.status}`);
    }

    const newItem: TaskHistoryItem = {
      id: subId,
      appName: payload.appName,
      reward: payload.reward,
      status: 'Pending',
      date: 'Just now',
      proofType: finalProofType === 'image' ? 'Screenshot Proof' : 'Text Proof',
      proofUrl: payload.proofUrl,
      appId: payload.appId,
      appLogoUrl: payload.appLogoUrl,
    };

    if (payload.userEmail) {
      invalidateSubmissionsCache(payload.userEmail);
    }
    invalidateUserCache();

    return { success: true, item: newItem };
  } catch (err: any) {
    console.error('Error submitting proof to earnbyapps.com:', err);
    return { success: false, error: err.message || 'Submission failed' };
  }
}
