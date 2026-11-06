import { Image } from 'expo-image';
import React from 'react';

const ICONS = {
  karma: require('../../../assets/images/karma.png'),
  ai: require('../../../assets/images/ai-chat.png'),
  verified: require('../../../assets/images/verified.png'),
};

export function KarmaMark({ size = 22 }: { size?: number }) {
  return <Image source={ICONS.karma} style={{ width: size, height: size }} contentFit="contain" />;
}

export function AiMark({ size = 22 }: { size?: number }) {
  return <Image source={ICONS.ai} style={{ width: size, height: size }} contentFit="contain" />;
}

export function VerifiedBadge({ size = 18 }: { size?: number }) {
  return <Image source={ICONS.verified} style={{ width: size, height: size }} contentFit="contain" />;
}
