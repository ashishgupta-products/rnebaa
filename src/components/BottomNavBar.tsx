import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TabType } from '../types/navigation';
import { ModernHomeIcon } from './ModernHomeIcon';

interface BottomNavBarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

interface NavItem {
  id: TabType;
  label: string;
  activeIcon: keyof typeof Ionicons.glyphMap;
  inactiveIcon: keyof typeof Ionicons.glyphMap;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'home',
    label: 'Home',
    activeIcon: 'home',
    inactiveIcon: 'home-outline',
  },
  {
    id: 'history',
    label: 'History',
    activeIcon: 'time',
    inactiveIcon: 'time-outline',
  },
  {
    id: 'instant',
    label: 'Instant',
    activeIcon: 'flash',
    inactiveIcon: 'flash-outline',
  },
  {
    id: 'profile',
    label: 'Profile',
    activeIcon: 'person',
    inactiveIcon: 'person-outline',
  },
];

interface TabButtonProps {
  item: NavItem;
  isActive: boolean;
  onPress: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({ item, isActive, onPress }) => {
  const pressScaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(pressScaleAnim, {
      toValue: 0.92,
      useNativeDriver: true,
      speed: 30,
      bounciness: 0,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressScaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 60,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.tabButton}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={item.label}
    >
      <Animated.View
        style={[
          styles.tabContent,
          { transform: [{ scale: pressScaleAnim }] },
        ]}
      >
        <View style={styles.iconContainer}>
          {item.id === 'home' ? (
            <ModernHomeIcon
              size={23}
              color={isActive ? '#2563EB' : '#94A3B8'}
              isActive={isActive}
            />
          ) : (
            <Ionicons
              name={isActive ? item.activeIcon : item.inactiveIcon}
              size={23}
              color={isActive ? '#2563EB' : '#94A3B8'}
            />
          )}
        </View>
        <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
          {item.label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  currentTab,
  onSelectTab,
}) => {
  const insets = useSafeAreaInsets();

  // Dynamically adapt for Gesture/Swipe navigation vs 3-Button navigation:
  // - Gesture navigation (Android & iOS): insets.bottom > 0 (e.g. 16-34px). We add safe padding above the gesture line.
  // - 3-button navigation (Android): insets.bottom is 0 (or system bar height). We maintain a clean compact 10px padding.
  const dynamicPaddingBottom = insets.bottom > 0
    ? insets.bottom + 4
    : (Platform.OS === 'ios' ? 14 : 10);

  return (
    <View style={[styles.container, { paddingBottom: dynamicPaddingBottom }]}>
      <View style={styles.navBar}>
        {NAV_ITEMS.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <TabButton
              key={item.id}
              item={item}
              isActive={isActive}
              onPress={() => onSelectTab(item.id)}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 -2px 12px rgba(15, 23, 42, 0.04)',
      },
    }),
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  iconContainer: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94A3B8',
    marginTop: 2,
    letterSpacing: 0.1,
  },
  tabLabelActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
});
