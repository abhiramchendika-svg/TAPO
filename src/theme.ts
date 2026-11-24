import type { TextStyle, ViewStyle } from 'react-native';

/**
 * "Obsidian & Champagne" tokens, shared with the website (site/styles.css).
 * Warm neutral graphite surfaces, porcelain text and one accent: champagne, used for primary
 * actions and the brand. Semantic colours are separate: sage = money earned, ochre = caps and
 * missed rewards, coral = errors. No purple anywhere. Text pairs meet WCAG AA (4.5:1) or better;
 * ratios noted are against `surface` unless stated.
 */
export const colors = {
  bg: '#0A0A0B', // obsidian
  surface: '#141416',
  surfaceAlt: '#1C1C1F',
  surfaceSunken: '#0F0F11',
  border: '#26262A',
  borderStrong: '#36363B',

  ink: '#F2EFE9', // porcelain, ~16:1
  text: '#E2DED7', // ~13:1
  textMuted: '#ABA8A1', // ~7.6:1
  textSubtle: '#8E8B85', // ~5.4:1

  primary: '#D8BF8F', // champagne — the one accent
  primaryPressed: '#C4AB7B',
  primarySoft: '#2A2418',
  onPrimary: '#17130C', // ~10.8:1 on primary

  /** Light panels inside the dark scene (porcelain). */
  wall: '#F2EFE9',
  wallShade: '#E2DED7',
  onWall: '#141416', // ~16:1 on wall
  onWallMuted: '#55524C', // ~7:1 on wall
  spotlight: '#FFF8E8',

  hero: '#F2EFE9',
  heroText: '#0A0A0B',
  heroMuted: '#55524C',

  success: '#8FCBA6', // sage: money earned, ~9:1
  successBg: '#13201A',
  warningText: '#E3AE6B', // ochre: caps, missed rewards, ~8:1 on warningBg
  warningBg: '#241B10',
  warningBorder: '#4A3820',
  danger: '#EE8E80', // coral, ~7.5:1
  dangerBg: '#2A1614',
  dangerBorder: '#5A2B27',
};

/** Motion tokens (ms) and spring settings shared by app components. */
export const motion = {
  instant: 100,
  micro: 160,
  standard: 280,
  layout: 420,
  cinematic: 700,
  spring: { damping: 18, stiffness: 220, mass: 0.9 },
  springSoft: { damping: 22, stiffness: 160, mass: 1 },
} as const;

export const space = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };
export const radius = { sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, pill: 999 };
/** Buttons and inputs are rounded rectangles, not pills. */
export const controlRadius = 12;

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
  // Satoshi has Light, Regular, Medium, Bold and Black. Headings use Bold; Black is reserved
  // for explicit weight-900 requests.
  if (role === 'display') return w >= 900 ? 'Satoshi_900Black' : 'Satoshi_700Bold';
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
  /** Page headline: Satoshi Bold, tight tracking (Apple-like weight, not Black). */
  display: {
    fontSize: 32,
    lineHeight: 37,
    fontWeight: '700' as const,
    color: colors.ink,
    fontFamily: fonts.display,
    letterSpacing: -1,
  },
  title: {
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '700' as const,
    color: colors.ink,
    fontFamily: fonts.display,
    letterSpacing: -0.6,
  },
  h2: { fontSize: 18, fontWeight: '700' as const, color: colors.ink, letterSpacing: -0.3 },
  body: { fontSize: 16, color: colors.text, lineHeight: 23 },
  small: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  caption: { fontSize: 12, color: colors.textSubtle, lineHeight: 16, fontWeight: '500' as const },
  label: { fontSize: 14, fontWeight: '600' as const, color: colors.text },
  /**
   * Small section label ("Good Morning", "Recent Activity"): Satoshi Medium, Title Case.
   * (Named `mono` for history; it's not monospace.)
   */
  mono: {
    fontFamily: fonts.body,
    fontSize: 13,
    letterSpacing: 0.1,
    textTransform: 'capitalize' as const,
    color: colors.textSubtle,
    fontWeight: '500' as const,
  } satisfies TextStyle,
  overline: {
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: '500' as const,
    color: colors.textSubtle,
    letterSpacing: 0.1,
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
