import { Text, View, StyleSheet, Platform, ViewStyle } from 'react-native';
import { BrandLogo } from './BrandLogo';

interface BrandHeaderProps {
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
  subtitle?: string;
  style?: ViewStyle;
}

export const BrandHeader: React.FC<BrandHeaderProps> = ({
  leftContent,
  rightContent,
  subtitle,
  style,
}) => {
  return (
    <View style={[styles.header, subtitle ? styles.headerWithSubtitle : null, style]}>
      {/* Absolute centered logo to ensure perfect screen alignment */}
      <View style={styles.centerAbsolute} pointerEvents="box-none">
        <BrandLogo fontSize={subtitle ? 22 : 26} />
        {subtitle ? (
          <Text style={styles.subtitleText} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {/* Left side actions */}
      <View style={styles.sideLeft}>
        {leftContent}
      </View>

      {/* Right side actions */}
      <View style={styles.sideRight}>
        {rightContent}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    position: 'relative',
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 1px 4px rgba(15, 23, 42, 0.04)',
      },
    }),
  },
  headerWithSubtitle: {
    height: 62,
    paddingVertical: 4,
  },
  subtitleText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.1,
    marginTop: 0.5,
  },
  centerAbsolute: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  sideLeft: {
    minWidth: 44,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'flex-start',
    zIndex: 2,
  },
  sideRight: {
    minWidth: 44,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'flex-end',
    zIndex: 2,
  },
});
