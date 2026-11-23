import { useId } from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { colors, fonts } from '../theme';
import { Text } from './Text';

/**
 * TAPO brand mark (original artwork): a rounded tile holding a "T" whose
 * crossbar is a card, with two tap waves rising from it.
 */
export function LogoMark({ size = 36 }: { size?: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Defs>
        <LinearGradient id={`tile${uid}`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFDF7" />
          <Stop offset="1" stopColor="#D9D4C7" />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={40} height={40} rx={11} fill={`url(#tile${uid})`} />
      {/* Card-shaped crossbar */}
      <Rect x={8} y={13} width={20} height={8} rx={2.4} fill={colors.bg} />
      <Rect x={10.5} y={15.2} width={4} height={3.2} rx={0.8} fill="#D8B96A" />
      {/* Stem */}
      <Rect x={15} y={19} width={6} height={13} rx={2} fill={colors.bg} />
      {/* Tap waves */}
      <Path d="M30 12.5a6 6 0 0 1 0 9" stroke={colors.bg} strokeWidth={2.2} strokeLinecap="round" fill="none" />
      <Path d="M33.5 9.5a10.5 10.5 0 0 1 0 15" stroke={colors.bg} strokeWidth={2.2} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/** Mark + wordmark lockup. */
export function Logo({ size = 36, tagline }: { size?: number; tagline?: string }) {
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: Math.round(size * 0.3) }}
      accessible
      accessibilityRole="image"
      accessibilityLabel="TAPO"
    >
      <LogoMark size={size} />
      <View>
        <Text
          style={{
            fontFamily: fonts.condensed,
            fontWeight: '800',
            fontSize: Math.round(size * 0.68),
            lineHeight: Math.round(size * 0.74),
            letterSpacing: size * 0.14,
            color: colors.ink,
          }}
        >
          TAPO
        </Text>
        {tagline ? (
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 11,
              letterSpacing: 0.3,
              color: colors.textSubtle,
              textTransform: 'capitalize',
              fontWeight: '600',
            }}
          >
            {tagline}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
