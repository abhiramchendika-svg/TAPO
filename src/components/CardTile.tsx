import { useId } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import type { Card } from '../lib/types';
import { focusRing, fonts, isFocused, shade, shadow } from '../theme';
import { Text } from './Text';

/** ISO/IEC 7810 ID-1 aspect ratio (85.60 × 53.98 mm). */
export const CARD_RATIO = 85.6 / 53.98;

/** Card width that fits the screen with page gutters, capped for tablets/web. */
export function useCardWidth(max = 380, gutter = 40): number {
  const { width } = useWindowDimensions();
  return Math.max(240, Math.min(width - gutter, max));
}

/** Placeholder only — the app never collects a real cardholder name. */
const HOLDER_PLACEHOLDER = 'DEMO CARDHOLDER';

const MONO = fonts.mono;

/**
 * A realistic but original card face. Shows only safe display info: a
 * masked number with the user-chosen last four, a placeholder holder name,
 * the network as plain text (no logos), and a SAMPLE marker.
 */
export function CardTile({
  card,
  width = 320,
  onPress,
  accessibilityHint = 'Opens card details',
  elevated = true,
}: {
  card: Card;
  width?: number;
  onPress?: () => void;
  accessibilityHint?: string;
  elevated?: boolean;
}) {
  const a11y = `Sample card. ${card.nickname}, ${card.type} card on ${card.network}, issued by ${
    card.issuer
  }, ending in ${card.last4.split('').join(' ')}`;

  const face = <CardFace card={card} width={width} elevated={elevated} />;
  if (!onPress) {
    return (
      <View accessible accessibilityRole="image" accessibilityLabel={a11y}>
        {face}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityHint={accessibilityHint}
      style={(state) => [
        { transform: [{ scale: state.pressed ? 0.98 : 1 }], borderRadius: Math.round(width * 0.052) },
        isFocused(state) && focusRing,
      ]}
    >
      {face}
    </Pressable>
  );
}

function CardFace({ card, width, elevated }: { card: Card; width: number; elevated: boolean }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const height = width / CARD_RATIO;
  const s = width / 340; // scale factor relative to a 340pt-wide reference card
  const r = Math.round(width * 0.052);
  const pad = Math.round(20 * s);
  const fs = (n: number, min: number) => Math.max(min, Math.round(n * s));

  const base = card.color;
  const light = shade(base, 0.22);
  const dark = shade(base, -0.45);

  return (
    <View style={[{ width, height, borderRadius: r }, elevated && shadow.card]}>
      <View style={[StyleSheet.absoluteFill, { borderRadius: r, overflow: 'hidden', backgroundColor: base }]}>
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id={`base${uid}`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={light} />
              <Stop offset="0.55" stopColor={base} />
              <Stop offset="1" stopColor={dark} />
            </LinearGradient>
            <RadialGradient id={`glow${uid}`} cx="0.12" cy="0.05" r="0.75">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.28" />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
            </RadialGradient>
            <LinearGradient id={`sheen${uid}`} x1="0" y1="0" x2="1" y2="0.6">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.14" />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
            </LinearGradient>
            <LinearGradient id={`vig${uid}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0.55" stopColor="#000000" stopOpacity="0" />
              <Stop offset="1" stopColor="#000000" stopOpacity="0.28" />
            </LinearGradient>
          </Defs>
          <Rect width={width} height={height} fill={`url(#base${uid})`} />
          {/* Original guilloché-style ring pattern */}
          <G opacity={0.1}>
            {[0.28, 0.4, 0.52, 0.64, 0.76].map((k) => (
              <Circle
                key={k}
                cx={width * 0.98}
                cy={height * 1.02}
                r={width * k}
                stroke="#FFFFFF"
                strokeWidth={1}
                fill="none"
              />
            ))}
          </G>
          <Rect width={width} height={height} fill={`url(#glow${uid})`} />
          <Path d={`M0 0 H${width * 0.62} L${width * 0.3} ${height} H0 Z`} fill={`url(#sheen${uid})`} />
          <Rect width={width} height={height} fill={`url(#vig${uid})`} />
          <Rect
            x={0.5}
            y={0.5}
            width={width - 1}
            height={height - 1}
            rx={r - 0.5}
            stroke="#FFFFFF"
            strokeOpacity={0.16}
            fill="none"
          />
        </Svg>

        <View style={{ flex: 1, padding: pad, justifyContent: 'space-between' }}>
          {/* Top: issuer / product + SAMPLE */}
          <View style={styles.row}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={[styles.issuer, { fontSize: fs(11, 10) }]} numberOfLines={1}>
                {card.issuer.toUpperCase()}
              </Text>
              <Text style={[styles.product, { fontSize: fs(17, 13) }]} numberOfLines={1}>
                {card.nickname}
              </Text>
            </View>
            {/* Every card in this prototype is a sample, including user-added ones. */}
            <View style={[styles.sample, { paddingHorizontal: fs(8, 6), paddingVertical: fs(3, 2) }]}>
              <Text style={[styles.sampleText, { fontSize: fs(10, 9) }]}>SAMPLE</Text>
            </View>
          </View>

          {/* Middle: chip + contactless mark */}
          <View style={[styles.row, { justifyContent: 'flex-start', gap: Math.round(12 * s) }]}>
            <Chip w={Math.round(44 * s)} uid={uid} />
            <Contactless size={Math.round(22 * s)} />
          </View>

          {/* Masked number */}
          <Text
            style={[styles.number, { fontSize: fs(17, 13), letterSpacing: Math.max(1, 2 * s), fontFamily: MONO }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            ••••  ••••  ••••  {card.last4}
          </Text>

          {/* Bottom: holder + type/network */}
          <View style={[styles.row, { alignItems: 'flex-end' }]}>
            <View style={{ flexShrink: 1 }}>
              <Text style={[styles.micro, { fontSize: fs(8, 8) }]}>CARDHOLDER</Text>
              <Text style={[styles.holder, { fontSize: fs(12, 10) }]} numberOfLines={1}>
                {HOLDER_PLACEHOLDER}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.micro, { fontSize: fs(8, 8) }]}>{card.type.toUpperCase()}</Text>
              <Text style={[styles.network, { fontSize: fs(14, 11) }]} numberOfLines={1}>
                {card.network.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

/** Generic contact-chip illustration (original artwork). */
function Chip({ w, uid }: { w: number; uid: string }) {
  const h = Math.round(w * 0.76);
  return (
    <Svg width={w} height={h} viewBox="0 0 44 34">
      <Defs>
        <LinearGradient id={`chip${uid}`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#F4E3B0" />
          <Stop offset="0.45" stopColor="#D8B96A" />
          <Stop offset="1" stopColor="#A9853C" />
        </LinearGradient>
      </Defs>
      <Rect x={0.5} y={0.5} width={43} height={33} rx={6} fill={`url(#chip${uid})`} stroke="#8C6B2B" strokeOpacity={0.5} />
      <Path
        d="M0.5 11.5 H14 M0.5 22.5 H14 M30 11.5 H43.5 M30 22.5 H43.5 M14 6 V28 M30 6 V28 M14 6 H30 M14 28 H30 M22 0.5 V6 M22 28 V33.5"
        stroke="#8C6B2B"
        strokeOpacity={0.55}
        strokeWidth={1.1}
        fill="none"
      />
      <Rect x={17} y={11} width={10} height={12} rx={2.5} fill="#FFFFFF" fillOpacity={0.18} />
    </Svg>
  );
}

/** Generic radio-wave mark indicating contactless capability. Decorative only. */
function Contactless({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {[5, 9.5, 14].map((rad) => (
        <Path
          key={rad}
          d={`M${3 + rad * 0.7071} ${12 - rad * 0.7071} A ${rad} ${rad} 0 0 1 ${3 + rad * 0.7071} ${12 + rad * 0.7071}`}
          stroke="#FFFFFF"
          strokeOpacity={0.85}
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
        />
      ))}
    </Svg>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  issuer: { color: 'rgba(255,255,255,0.82)', fontWeight: '700', letterSpacing: 1.2 },
  product: { color: '#FFFFFF', fontWeight: '700', marginTop: 2, letterSpacing: -0.2 },
  sample: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  sampleText: { color: '#FFFFFF', fontWeight: '800', letterSpacing: 1.4 },
  number: {
    color: '#FFFFFF',
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  micro: { color: 'rgba(255,255,255,0.72)', fontWeight: '700', letterSpacing: 1.2 },
  holder: { color: '#FFFFFF', fontWeight: '600', letterSpacing: 1.1, marginTop: 1 },
  network: { color: '#FFFFFF', fontWeight: '800', letterSpacing: 1.6, marginTop: 1 },
});
