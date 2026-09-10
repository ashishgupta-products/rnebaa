import { Campaign } from '../types/campaign';
import { API_CONFIG } from '../config/authConfig';

const FALLBACK_CAMPAIGNS: Campaign[] = [
  {
    id: 'hopr',
    name: 'Hopr',
    category: 'App Install & Sign Up',
    platforms: ['Android', 'iOS'],
    earningRate: '₹300.00 / action',
    reward: 300,
    description: 'Download the app and complete three rides to receive ₹300 in your wallet.',
    tags: ['Popular', 'Top Payout'],
    currencySymbol: '₹',
    externalUrl: 'https://earnbyapps.com',
  },
  {
    id: 'groww',
    name: 'Groww: Stocks & Mutual Funds',
    category: 'App Install & Sign Up',
    platforms: ['Android', 'iOS'],
    earningRate: '₹100.00 / signup',
    reward: 100,
    description: 'Open a Demat account and complete initial identity verification.',
    tags: ['Finance', 'Instant KYC'],
    currencySymbol: '₹',
    externalUrl: 'https://groww.in',
  },
  {
    id: 'googlepay',
    name: 'Google Pay UPI',
    category: 'App Install & Sign Up',
    platforms: ['Android', 'iOS'],
    earningRate: '₹51.00 / setup',
    reward: 51,
    description: 'Install Google Pay and complete your first UPI payment.',
    tags: ['UPI', 'Fast Payout'],
    currencySymbol: '₹',
    externalUrl: 'https://pay.google.com',
  },
  {
    id: 'dhan',
    name: 'Dhan Trading',
    category: 'App Install & Sign Up',
    platforms: ['Android', 'iOS', 'Web'],
    earningRate: '₹100.00 / trade',
    reward: 100,
    description: 'Install and complete your first trading task.',
    tags: ['Finance', 'High Reward'],
    currencySymbol: '₹',
    externalUrl: 'https://dhan.co',
  },
];

export async function fetchLiveCampaigns(): Promise<Campaign[]> {
  try {
    const res = await fetch(`${API_CONFIG.baseUrl}/api/campaigns`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return data.map((item: any) => ({
        id: item.id || String(Math.random()),
        name: item.name || 'Untitled Campaign',
        category: item.category || 'App Task',
        platforms: Array.isArray(item.platforms) ? item.platforms : ['Android'],
        earningRate: item.earningRate || `₹${item.reward || 0}`,
        reward: Number(item.reward || 0),
        description: item.description || '',
        longDescription: item.longDescription || '',
        tags: Array.isArray(item.tags) ? item.tags : ['Verified'],
        externalUrl: item.externalUrl || '',
        currencySymbol: item.currencySymbol || '₹',
        logoUrl: item.logoUrl || '',
      }));
    }
  } catch (err) {
    console.log('Using fallback campaigns due to fetch error:', err);
  }
  return FALLBACK_CAMPAIGNS;
}
