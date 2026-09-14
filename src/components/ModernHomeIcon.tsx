import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface ModernHomeIconProps {
  size?: number;
  color?: string;
  isActive?: boolean;
}

/**
 * Modern minimalist architectural Home Icon for the bottom navbar.
 * Features smooth continuous curvature, rounded roofline, and rounded arch door.
 */
export const ModernHomeIcon: React.FC<ModernHomeIconProps> = ({
  size = 23,
  color = '#2563EB',
  isActive = false,
}) => {
  if (isActive) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {/* Solid modern body with sleek cut-out negative space arch door */}
        <Path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M9.4 2.8C10.9 1.6 13.1 1.6 14.6 2.8L20.2 7.3C21.3 8.2 22 9.6 22 11V18.2C22 20.3 20.3 22 18.2 22H5.8C3.7 22 2 20.3 2 18.2V11C2 9.6 2.7 8.2 3.8 7.3L9.4 2.8ZM9.5 22V15C9.5 13.62 10.62 12.5 12 12.5C13.38 12.5 14.5 13.62 14.5 15V22H9.5Z"
          fill={color}
        />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Sleek 1.85px rounded outline body */}
      <Path
        d="M9.4 2.8C10.9 1.6 13.1 1.6 14.6 2.8L20.2 7.3C21.3 8.2 22 9.6 22 11V18.2C22 20.3 20.3 22 18.2 22H5.8C3.7 22 2 20.3 2 18.2V11C2 9.6 2.7 8.2 3.8 7.3L9.4 2.8Z"
        stroke={color}
        strokeWidth="1.85"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Sleek rounded arch door */}
      <Path
        d="M9.5 22V15C9.5 13.62 10.62 12.5 12 12.5C13.38 12.5 14.5 13.62 14.5 15V22"
        stroke={color}
        strokeWidth="1.85"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};
