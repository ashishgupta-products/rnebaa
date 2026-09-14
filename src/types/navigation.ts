export type TabType = 'home' | 'instant' | 'history' | 'profile';

export interface TabItem {
  key: TabType;
  label: string;
  iconName: string;
  activeIconName: string;
}
