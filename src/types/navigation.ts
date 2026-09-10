export type TabType = 'home' | 'history' | 'profile';

export interface TabItem {
  key: TabType;
  label: string;
  iconName: string;
  activeIconName: string;
}
