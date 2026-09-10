import { Campaign } from '../types/campaign';
import { API_CONFIG } from '../config/authConfig';

/**
 * Fetch live campaigns directly from the production database at earnbyapps.com.
 * Returns only genuine, active campaigns. Zero dummy data.
 */
export async function fetchLiveCampaigns(): Promise<Campaign[]> {
  try {
    const res = await fetch(`${API_CONFIG.baseUrl}/api/campaigns`, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      console.warn(`Campaigns fetch failed: HTTP ${res.status}`);
      return [];
    }

    const data = await res.json();
    const rawList: any[] = Array.isArray(data)
      ? data
      : Array.isArray(data?.campaigns)
      ? data.campaigns
      : [];

    return rawList
      .filter((item: any) => item && item.isActive !== false)
      .map((item: any) => ({
        id: String(item.id || ''),
        name: String(item.name || 'Untitled Campaign'),
        category: String(item.category || 'General'),
        platforms: Array.isArray(item.platforms) && item.platforms.length > 0
          ? item.platforms
          : ['Android'],
        earningRate: String(item.earningRate || (item.reward ? `₹${item.reward}` : '₹0.00')),
        reward: Number(item.reward || 0),
        description: String(item.description || ''),
        longDescription: String(item.longDescription || item.description || ''),
        tags: Array.isArray(item.tags) ? item.tags : [],
        externalUrl: String(item.externalUrl || ''),
        currencySymbol: String(item.currencySymbol || '₹'),
        logoUrl: String(item.logoUrl || ''),
        referralCode: item.referralCode ? String(item.referralCode).trim() : undefined,
        actionText: item.actionText ? String(item.actionText) : undefined,
        videoUrl: item.videoUrl ? String(item.videoUrl) : undefined,
        isActive: true,
      }));
  } catch (err) {
    console.error('Error fetching live campaigns from earnbyapps.com:', err);
    return [];
  }
}
