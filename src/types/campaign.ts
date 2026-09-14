export interface Campaign {
  id: string;
  name: string;
  category: string;
  platforms: string[];
  earningRate?: string;
  reward: number;
  description?: string;
  longDescription?: string;
  tags?: string[];
  externalUrl?: string;
  targetCountry?: string;
  currency?: string;
  currencySymbol?: string;
  logoUrl?: string;
  referralCode?: string;
  actionText?: string;
  videoUrl?: string;
  isActive?: boolean;
  isIndependent?: boolean;
}

export interface TaskHistoryItem {
  id: string;
  appName: string;
  reward: number;
  status: 'Pending' | 'Paid' | 'Rejected';
  date: string;
  proofType?: string;
  proofUrl?: string;
  appId?: string;
  appLogoUrl?: string;
}
