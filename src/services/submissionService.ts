import { Platform } from 'react-native';
import { API_CONFIG } from '../config/authConfig';
import { TaskHistoryItem } from '../types/campaign';

/**
 * Service to interact with the live production submissions and upload APIs (earnbyapps.com).
 * Pulls and stores genuine user submissions from Neon PostgreSQL and saves screenshots to Cloudinary.
 */
export async function fetchUserSubmissions(userEmail?: string): Promise<TaskHistoryItem[]> {
  try {
    const res = await fetch(`${API_CONFIG.baseUrl}/api/submissions`, {
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      console.warn(`Submissions fetch failed: HTTP ${res.status}`);
      return [];
    }

    const data: any[] = await res.json();
    if (!Array.isArray(data)) return [];

    // Filter by user email if provided
    const userFiltered = userEmail
      ? data.filter(
          (item) =>
            item.userEmail &&
            item.userEmail.trim().toLowerCase() === userEmail.trim().toLowerCase()
        )
      : data;

    return userFiltered.map((item) => ({
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
    }));
  } catch (err) {
    console.error('Error fetching live submissions:', err);
    return [];
  }
}

/**
 * Uploads screenshot proof directly to Cloudinary via earnbyapps.com/api/upload.
 * Returns the secure Cloudinary image URL and public ID.
 */
export async function uploadProofImageToCloudinary(
  uri: string,
  mimeType: string = 'image/jpeg'
): Promise<{ success: boolean; url?: string; publicId?: string; error?: string }> {
  try {
    const formData = new FormData();

    if (Platform.OS === 'web') {
      const response = await fetch(uri);
      const blob = await response.blob();
      formData.append('file', blob, 'proof_screenshot.jpg');
    } else {
      formData.append('file', {
        uri,
        type: mimeType || 'image/jpeg',
        name: 'proof_screenshot.jpg',
      } as any);
    }

    const res = await fetch(`${API_CONFIG.baseUrl}/api/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `Upload failed with status ${res.status}`);
    }

    const data = await res.json();
    return {
      success: true,
      url: data.url,
      publicId: data.publicId,
    };
  } catch (err: any) {
    console.error('Cloudinary upload error:', err);
    return {
      success: false,
      error: err.message || 'Failed to upload screenshot to Cloudinary',
    };
  }
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

    const res = await fetch(`${API_CONFIG.baseUrl}/api/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
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
    };

    return { success: true, item: newItem };
  } catch (err: any) {
    console.error('Error submitting proof to earnbyapps.com:', err);
    return { success: false, error: err.message || 'Submission failed' };
  }
}
