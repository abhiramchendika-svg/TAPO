import type { TextStyle, ViewStyle } from 'react-native';

/**
 * "Gallery at night" tokens: a deep navy scene, warm off-white gallery walls,
 * and spotlight accents. Text/background pairs meet WCAG AA (4.5:1) or better;
 * ratios noted are against `surface` unless stated.
 */
export const colors = {
  bg: '#0B0E18', // the dark scene
  surface: '#151A29',
  surfaceAlt: '#1D2335',
  surfaceSunken: '#10141F',
  border: '#272E43',
  borderStrong: '#39415A',

  ink: '#F4F2EC', // headings, ~15:1
  text: '#E6E4DE', // body, ~13:1
  textMuted: '#B3BACB', // ~8.5:1
  textSubtle: '#939CB2', // ~6:1

  primary: '#ECE9E2', // off-white "gallery wall" — used for primary fills
  primaryPressed: '#D6D2C8',
  primarySoft: '#242B40',
  onPrimary: '#0B0E18', // ~16:1 on primary

  /** Gallery wall (light panels inside the dark scene). */
  wall: '#ECE9E2',
  wallShade: '#D9D5CB',
  onWall: '#14171F', // ~15:1 on wall
  onWallMuted: '#4A5060', // ~6.6:1 on wall
  spotlight: '#FFF8E8',

  hero: '#ECE9E2',
  heroText: '#0B0E18',
  heroMuted: '#4A5060',

  success: '#6FD9A4', // ~9.8:1
  successBg: '#132A22',
  warningText: '#F2C46D', // ~9:1 on warningBg
  warningBg: '#2A2416',
  warningBorder: '#4D3F1D',
  danger: '#FF9B92', // ~8:1
  dangerBg: '#2B1719',
  dangerBorder: '#5A2B2F',
};

export const space = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };
export const radius = { sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, pill: 999 };

/**
 * Font roles. These are tokens, resolved to a concrete font file per weight
 * by `resolveFont` (used by our <Text> wrapper). Fonts: Satoshi (body,
 * buttons, headings), JetBrains Mono (labels), Inter (₹ only).
 */
export const fonts = {
  body: 'body',
  display: 'display',
  /** Kept for existing call sites; same as `display` (now Satoshi). */
  condensed: 'display',
  mono: 'mono',
} as const;

type FontRole = 'body' | 'display' | 'mono';

/**
 * Only the weights the UI uses are bundled.
 * - Satoshi (ITF Free Font License, assets/fonts/satoshi/LICENSE-FFL.txt): body,
 *   buttons and headings. Official, unmodified .otf files.
 * - Inter: draws ₹ only — Satoshi and JetBrains Mono have no ₹ glyph.
 * - JetBrains Mono: small labels, card numbers, codes.
 */
export const FONT_FILES = {
  Satoshi_300Light: require('../assets/fonts/satoshi/Satoshi-Light.otf'),
  Satoshi_400Regular: require('../assets/fonts/satoshi/Satoshi-Regular.otf'),
  Satoshi_500Medium: require('../assets/fonts/satoshi/Satoshi-Medium.otf'),
  Satoshi_700Bold: require('../assets/fonts/satoshi/Satoshi-Bold.otf'),
  Satoshi_900Black: require('../assets/fonts/satoshi/Satoshi-Black.otf'),
  Inter_300Light: require('@expo-google-fonts/inter/300Light/Inter_300Light.ttf'),
  Inter_400Regular: require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf'),
  Inter_500Medium: require('@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf'),
  Inter_700Bold: require('@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf'),
  Inter_800ExtraBold: require('@expo-google-fonts/inter/800ExtraBold/Inter_800ExtraBold.ttf'),
  JetBrainsMono_300Light: require('@expo-google-fonts/jetbrains-mono/300Light/JetBrainsMono_300Light.ttf'),
  JetBrainsMono_500Medium: require('@expo-google-fonts/jetbrains-mono/500Medium/JetBrainsMono_500Medium.ttf'),
  JetBrainsMono_700Bold: require('@expo-google-fonts/jetbrains-mono/700Bold/JetBrainsMono_700Bold.ttf'),
} as const;

function toWeight(w: TextStyle['fontWeight']): number {
  if (w === undefined || w === 'normal') return 400;
  if (w === 'bold') return 700;
  const n = typeof w === 'number' ? w : parseInt(String(w), 10);
  return Number.isFinite(n) ? n : 400;
}

/** Map a role token (or undefined = body) and weight to a loaded font family name. */
export function resolveFont(family: string | undefined, weight: TextStyle['fontWeight']): string {
  const role: FontRole = family === 'display' || family === 'mono' ? family : 'body';
  const w = toWeight(weight);
  if (role === 'mono') {
    return w >= 700 ? 'JetBrainsMono_700Bold' : w <= 300 ? 'JetBrainsMono_300Light' : 'JetBrainsMono_500Medium';
  }
  // Satoshi has Light, Regular, Medium, Bold and Black.
  if (role === 'display') return w >= 800 ? 'Satoshi_900Black' : 'Satoshi_700Bold';
  if (w >= 800) return 'Satoshi_900Black';
  if (w >= 600) return 'Satoshi_700Bold';
  if (w >= 500) return 'Satoshi_500Medium';
  if (w <= 300) return 'Satoshi_300Light';
  return 'Satoshi_400Regular';
}

/** Inter weight used to draw ₹ (missing from Satoshi and JetBrains Mono) at a matching weight. */
export function resolveRupeeFont(weight: TextStyle['fontWeight']): string {
  const w = toWeight(weight);
  if (w >= 800) return 'Inter_800ExtraBold';
  if (w >= 600) return 'Inter_700Bold';
  if (w >= 500) return 'Inter_500Medium';
  if (w <= 300) return 'Inter_300Light';
  return 'Inter_400Regular';
}

/** Whether a fontFamily value is one of our role tokens (vs. a concrete font name). */
export function isFontRole(family: unknown): family is FontRole {
  return family === 'body' || family === 'display' || family === 'mono';
}

export const type = {
  /** Page headline: Satoshi Black, tight tracking. */
  display: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '900' as const,
    color: colors.ink,
    fontFamily: fonts.display,
    letterSpacing: -0.8,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900' as const,
    color: colors.ink,
    fontFamily: fonts.display,
    letterSpacing: -0.5,
  },
  h2: { fontSize: 18, fontWeight: '700' as const, color: colors.ink, letterSpacing: -0.2 },
  body: { fontSize: 16, color: colors.text, lineHeight: 22 },
  small: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  caption: { fontSize: 12, color: colors.textSubtle, lineHeight: 16, fontWeight: '600' as const },
  label: { fontSize: 14, fontWeight: '600' as const, color: colors.text },
  /**
   * Small label/kicker in Satoshi, Title Case ("Sample Ledger", "Good Morning").
   * (Named `mono` for history; it's no longer monospace.)
   */
  mono: {
    fontFamily: fonts.body,
    fontSize: 13,
    letterSpacing: 0.2,
    textTransform: 'capitalize' as const,
    color: colors.textSubtle,
    fontWeight: '500' as const,
  } satisfies TextStyle,
  overline: {
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: '500' as const,
    color: colors.textSubtle,
    letterSpacing: 0.2,
    textTransform: 'capitalize' as const,
  },
};

/** Cross-platform shadows (RN `boxShadow` works on iOS, Android and web). */
export const shadow: Record<'sm' | 'md' | 'lg' | 'card', ViewStyle> = {
  sm: { boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.35)' },
  md: { boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.35), 0px 12px 28px rgba(0, 0, 0, 0.35)' },
  lg: { boxShadow: '0px 8px 20px rgba(0, 0, 0, 0.45), 0px 24px 48px rgba(0, 0, 0, 0.45)' },
  card: {
    boxShadow:
      '0px 2px 4px rgba(10, 12, 20, 0.30), 0px 10px 20px rgba(10, 12, 20, 0.28), 0px 22px 40px rgba(10, 12, 20, 0.30)',
  },
};

/** Visible keyboard focus outline (web/desktop keyboards; harmless elsewhere). */
export const focusRing: ViewStyle = {
  outlineColor: colors.primary,
  outlineStyle: 'solid',
  outlineWidth: 2,
  outlineOffset: 2,
};

/** Pressable style callbacks receive `focused` on web; native only passes `pressed`. */
export function isFocused(state: { pressed: boolean }): boolean {
  return (state as { focused?: boolean }).focused === true;
}

/** #RRGGBB → rgba() with the given alpha (0–1). */
export function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Lighten (amt > 0) or darken (amt < 0) a #RRGGBB colour by mixing with white/black. */
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const target = amt < 0 ? 0 : 255;
  const p = Math.abs(amt);
  const mix = (c: number) => Math.round((target - c) * p + c);
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}
