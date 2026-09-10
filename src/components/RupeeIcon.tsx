import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface RupeeIconProps {
  size?: number;
  color?: string;
}

/**
 * Pixel-perfect vector Indian Rupee symbol (₹)
 * Rendered using react-native-svg for instant, zero-flicker display on Web, iOS, and Android.
 */
export const RupeeIcon: React.FC<RupeeIconProps> = ({
  size = 24,
  color = '#FFFFFF',
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        fill={color}
        d="M13.66 7C13.1 5.82 11.9 5 10.5 5L6 5V3H18V5H14.74C15.22 5.58 15.58 6.26 15.79 7H18V9H16C15.73 11.8 13.37 14 10.5 14H9.61L15.89 21H13.11L6.89 14V12H10.5C12.43 12 14 10.43 14 8.5C14 7.96 13.88 7.46 13.66 7Z"
      />
    </Svg>
  );
};
