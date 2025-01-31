import React from 'react';
import { Image, ImageStyle } from 'react-native';

interface AvatarProps {
  uri?: string | null;
  size?: number;
  style?: ImageStyle;
}

const Avatar: React.FC<AvatarProps> = ({ uri, size = 40, style }) => {
  return (
    <Image
      source={uri ? { uri } : require('../assets/default-avatar.png')}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        style,
      ]}
    />
  );
};

export default Avatar;
