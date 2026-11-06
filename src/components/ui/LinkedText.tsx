import React from 'react';
import { useRouter } from 'expo-router';

import { Txt } from './Txt';

const LINK =
  /((?:https?:\/\/|www\.)[^\s<]+|(?:[a-z0-9-]+\.)+(?:com|io|co|app|dev|ai|net|org|me|xyz|so|gg|to|tv)(?:\/[^\s<]*)?)/gi;

function hrefFor(raw: string): string {
  const trimmed = raw.replace(/[),.]+$/, '');
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function looksLikeLink(part: string): boolean {
  return /^(?:https?:\/\/|www\.)/i.test(part) || /^(?:[a-z0-9-]+\.)+(?:com|io|co|app|dev|ai|net|org|me|xyz|so|gg|to|tv)\b/i.test(part);
}

export function LinkedText({
  text,
  size = 15.5,
  color,
  lh = 1.4,
}: {
  text: string;
  size?: number;
  color?: string;
  lh?: number;
}) {
  const router = useRouter();
  const parts = text.split(LINK);

  return (
    <Txt size={size} lh={lh} color={color}>
      {parts.map((part, index) => {
        if (!part || !looksLikeLink(part)) return part;
        const href = hrefFor(part);
        return (
          <Txt
            key={`${href}-${index}`}
            size={size}
            lh={lh}
            color={color}
            weight={600}
            onPress={() =>
              router.push({ pathname: '/browser', params: { kind: 'Web', value: href } })
            }
            style={{ textDecorationLine: 'underline' }}
          >
            {part}
          </Txt>
        );
      })}
    </Txt>
  );
}
