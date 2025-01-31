import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface VerifiedIconProps {
  size?: number;
  color?: string;
}

const VerifiedIcon: React.FC<VerifiedIconProps> = ({ 
  size = 14, 
  color = '#007AFF' 
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 14 12" fill="none">
      <Path
        d="M0.808312 2.95062C0.37935 3.6936 0.632055 4.63671 1.13747 6.52292L1.53952 8.0234C2.04493 9.90962 2.29763 10.8527 3.04061 11.2817C3.7836 11.7106 4.7267 11.4579 6.61292 7.62111 7.8733Z"
        fill={color}
      />
    </Svg>
  );
};

export default VerifiedIcon;
