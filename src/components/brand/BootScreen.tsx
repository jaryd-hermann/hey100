import React from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { Wordmark } from './Logo';

/** Core homepage accents. `dark` picks the white wordmark. */
const ACCENTS = [
  { bg: '#00FF00', dark: false },
  { bg: '#0020A1', dark: true },
  { bg: '#FFFF00', dark: false },
  { bg: '#FF1C6F', dark: false },
  { bg: '#00FFFF', dark: false },
  { bg: '#FF5900', dark: false },
  { bg: '#7B00FF', dark: true },
  { bg: '#FF0000', dark: false },
  { bg: '#FF00FF', dark: false },
  { bg: '#0000EB', dark: true },
  { bg: '#2E5CFF', dark: true },
] as const;

/** One color per launch, shared by the session wait and the profile wait. */
const accent = ACCENTS[Math.floor(Math.random() * ACCENTS.length)];

/** Full-screen hold while the session or profile is loading. */
export function BootScreen() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: accent.bg,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 36,
      }}
    >
      <StatusBar style={accent.dark ? 'light' : 'dark'} />
      <Wordmark size={72} onDark={accent.dark} onLight={!accent.dark} />
    </View>
  );
}
