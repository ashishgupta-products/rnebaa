import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TabType } from '../types/navigation';

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
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.90,
      useNativeDriver: true,
      speed: 30,
      bounciness: 0,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 50,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.tabButton}
    >
      <Animated.View
        style={[
          styles.tabContent,
          isActive && styles.tabContentActive,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <View style={[styles.iconContainer, isActive && styles.iconContainerActive]}>
          <Ionicons
            name={isActive ? item.activeIcon : item.inactiveIcon}
            size={isActive ? 22 : 21}
            color={isActive ? '#2563EB' : '#64748B'}
          />
        </View>
        <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
          {item.label}
        </Text>
        {isActive ? <View style={styles.activeDot} /> : <View style={styles.dotPlaceholder} />}
      </Animated.View>
    </TouchableOpacity>
  );
};

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  currentTab,
  onSelectTab,
}) => {
  return (
    <View style={styles.container}>
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
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    paddingTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
      },
      android: {
        elevation: 10,
      },
      web: {
        boxShadow: '0 -4px 16px rgba(15, 23, 42, 0.04)',
      },
    }),
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
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
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  tabContentActive: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  iconContainer: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerActive: {},
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
    letterSpacing: 0.1,
  },
  tabLabelActive: {
    color: '#2563EB',
    fontWeight: '800',
  },
  activeDot: {
    width: 12,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#2563EB',
    marginTop: 3,
  },
  dotPlaceholder: {
    height: 3,
    marginTop: 3,
  },
});
