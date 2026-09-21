import AsyncStorage from '@react-native-async-storage/async-storage';
import { Campaign } from '../types/campaign';
import { API_CONFIG } from '../config/authConfig';

// In-memory cache for resolved third-party image URLs
const resolvedImageUrlCache = new Map<string, string>();

/**
 * Resolves indirect image URLs (such as ImgBB HTML viewer pages like https://ibb.co/XYZ)
 * into direct image file URLs (e.g. https://i.ibb.co/.../logo.jpg) so that
 * React Native Image components can properly decode and display them.
 */
async function resolveDirectImageUrl(rawUrl: string): Promise<string> {
  if (!rawUrl) return '';
  const trimmed = rawUrl.trim();

  // If already resolved in cache, return immediately
  if (resolvedImageUrlCache.has(trimmed)) {
    return resolvedImageUrlCache.get(trimmed)!;
  }

  // Detect ImgBB viewer landing page URLs (e.g. ibb.co/XYZ instead of direct i.ibb.co/...)
  const isImgBbViewer = /^https?:\/\/(www\.)?ibb\.co\/[a-zA-Z0-9]+$/i.test(trimmed);
  if (!isImgBbViewer) {
    resolvedImageUrlCache.set(trimmed, trimmed);
    return trimmed;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(trimmed, {
      signal: controller.signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'Mozilla/5.0',
      },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const html = await res.text();
      const ogMatch = html.match(/property=["']og:image["']\s+content=["']([^"']+)["']/i);
      if (ogMatch && ogMatch[1]) {
        resolvedImageUrlCache.set(trimmed, ogMatch[1]);
        return ogMatch[1];
      }
      const linkMatch = html.match(/rel=["']image_src["']\s+href=["']([^"']+)["']/i);
      if (linkMatch && linkMatch[1]) {
        resolvedImageUrlCache.set(trimmed, linkMatch[1]);
        return linkMatch[1];
      }
    }
  } catch (err) {
    console.warn('Could not auto-resolve direct image for:', trimmed, err);
  }

  resolvedImageUrlCache.set(trimmed, trimmed);
  return trimmed;
}

const CAMPAIGNS_CACHE_KEY = '@cached_campaigns_v1';

// In-memory cache for live campaigns to avoid repetitive network calls and screen re-renders
let cachedCampaigns: Campaign[] | null = null;
let lastCampaignsFetchTimestamp = 0;
const CAMPAIGNS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL
let pendingCampaignsPromise: Promise<Campaign[]> | null = null;

// Eagerly restore campaigns from AsyncStorage on module load for 0ms initial render
AsyncStorage.getItem(CAMPAIGNS_CACHE_KEY)
  .then((stored) => {
    if (stored && !cachedCampaigns) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          cachedCampaigns = parsed;
        }
      } catch {}
    }
  })
  .catch(() => {});

export function getCachedCampaigns(): Campaign[] | null {
  return cachedCampaigns;
}

/**
 * Fetch live campaigns directly from the production database at earnbyapps.com.
 * Returns only genuine, active campaigns.
 * If forceFresh is false and data is cached within 5 minutes, returns immediately from cache to conserve Neon compute.
 */
export async function fetchLiveCampaigns(forceFresh = false): Promise<Campaign[]> {
  const now = Date.now();
  if (cachedCampaigns && !forceFresh && now - lastCampaignsFetchTimestamp < CAMPAIGNS_CACHE_TTL_MS) {
    return cachedCampaigns;
  }

  if (pendingCampaignsPromise) {
    return pendingCampaignsPromise;
  }

  pendingCampaignsPromise = (async () => {
    try {
      const res = await fetch(`${API_CONFIG.baseUrl}/api/campaigns`, {
        headers: {
          Accept: 'application/json',
        },
      });

      if (!res.ok) {
        console.warn(`Campaigns fetch failed: HTTP ${res.status}`);
        return cachedCampaigns || [];
      }

      const data = await res.json();
      const rawList: any[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.campaigns)
        ? data.campaigns
        : [];

    const activeList = rawList.filter((item: any) => item && item.isActive !== false);

    const campaigns: Campaign[] = await Promise.all(
      activeList.map(async (item: any) => {
        const directLogo = await resolveDirectImageUrl(String(item.logoUrl || ''));

        return {
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
          logoUrl: directLogo,
          referralCode: item.referralCode ? String(item.referralCode).trim() : undefined,
          actionText: item.actionText ? String(item.actionText) : undefined,
          videoUrl: item.videoUrl ? String(item.videoUrl) : undefined,
          isActive: true,
        };
      })
      );

      cachedCampaigns = campaigns;
      lastCampaignsFetchTimestamp = Date.now();
      AsyncStorage.setItem(CAMPAIGNS_CACHE_KEY, JSON.stringify(campaigns)).catch(() => {});
      return campaigns;
    } catch (err) {
      console.error('Error fetching live campaigns from earnbyapps.com:', err);
      return cachedCampaigns || [];
    } finally {
      pendingCampaignsPromise = null;
    }
  })();

  return pendingCampaignsPromise;
}
