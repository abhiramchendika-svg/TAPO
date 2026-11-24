import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { colors, fonts } from '../theme';
import { Text } from './Text';

/** Size of the mark while the dots assemble. The logo geometry is drawn in a 40-unit box. */
const STAGE = 160;
const UNIT = STAGE / 40;
const DOT = 5;

type Target = { x: number; y: number; green: boolean };

/** Points that trace the TAPO mark: the card-shaped crossbar, the stem and the two tap waves. */
function markPoints(): Target[] {
  const pts: Target[] = [];
  for (let x = 9; x <= 27; x += 2.5) for (let y = 14; y <= 20; y += 2.5) pts.push({ x, y, green: false });
  for (let x = 16; x <= 20; x += 2.2) for (let y = 22.5; y <= 31; y += 2.4) pts.push({ x, y, green: false });
  for (let a = -45; a <= 45; a += 22.5) {
    const r = (a * Math.PI) / 180;
    pts.push({ x: 26 + 6 * Math.cos(r), y: 17 + 6 * Math.sin(r), green: true });
  }
  for (let a = -42; a <= 42; a += 14) {
    const r = (a * Math.PI) / 180;
    pts.push({ x: 26.2 + 10.5 * Math.cos(r), y: 17 + 10.5 * Math.sin(r), green: true });
  }
  return pts;
}

type Dot = Target & { fromX: number; fromY: number; start: number };

/**
 * Launch intro: scattered dots fly together into the TAPO mark, the full mark settles in,
 * then the name rises. Plays once per app launch; tap anywhere to skip. Skipped entirely
 * when the system's Reduce Motion setting is on.
 */
export function Intro({ onDone }: { onDone: () => void }) {
  const { width, height } = useWindowDimensions();
  const [dots] = useState<Dot[]>(() =>
    markPoints().map((p) => {
      const angle = Math.random() * Math.PI * 2;
      const dist = 240 + Math.random() * 360;
      return {
        ...p,
        fromX: STAGE / 2 + Math.cos(angle) * dist,
        fromY: STAGE / 2 + Math.sin(angle) * dist,
        start: Math.random() * 0.28,
      };
    }),
  );
  const [gather] = useState(() => new Animated.Value(0));
  const [mark] = useState(() => new Animated.Value(0));
  const [word] = useState(() => new Animated.Value(0));
  const [out] = useState(() => new Animated.Value(0));
  const finished = useRef(false);

  const finish = (fast = false) => {
    if (finished.current) return;
    finished.current = true;
    gather.stopAnimation();
    mark.stopAnimation();
    word.stopAnimation();
    Animated.timing(out, { toValue: 1, duration: fast ? 220 : 450, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() =>
      onDone(),
    );
  };

  useEffect(() => {
    let cancelled = false;
    let sequence: Animated.CompositeAnimation | null = null;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled) return;
        if (reduce) {
          finished.current = true;
          onDone();
          return;
        }
        const ease = Easing.bezier(0.2, 0.8, 0.2, 1);
        sequence = Animated.sequence([
          Animated.timing(gather, { toValue: 1, duration: 1300, easing: ease, useNativeDriver: true }),
          Animated.timing(mark, { toValue: 1, duration: 420, easing: ease, useNativeDriver: true }),
          Animated.timing(word, { toValue: 1, duration: 520, easing: ease, useNativeDriver: true }),
          Animated.delay(650),
        ]);
        sequence.start(({ finished: ok }) => {
          if (ok) finish();
        });
      });
    return () => {
      cancelled = true;
      sequence?.stop();
    };
    // Runs once on mount; the animated values are stable for the component's life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const overlayOpacity = out.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const dotsOpacity = mark.interpolate({ inputRange: [0, 0.6], outputRange: [1, 0], extrapolate: 'clamp' });
  const markScale = mark.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });
  const wordShift = word.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });

  return (
    <Animated.View style={[styles.overlay, { opacity: overlayOpacity, width, height }]} pointerEvents="box-none">
      <Pressable
        style={styles.fill}
        onPress={() => finish(true)}
        accessibilityRole="button"
        accessibilityLabel="TAPO. Tap to skip the intro"
      >
        <View style={styles.center}>
          <View style={{ width: STAGE, height: STAGE }}>
            <Animated.View style={[StyleSheet.absoluteFill, { opacity: dotsOpacity }]} importantForAccessibility="no-hide-descendants">
              {dots.map((d, i) => {
                const end = Math.min(1, d.start + 0.72);
                const translateX = gather.interpolate({ inputRange: [0, d.start, end, 1], outputRange: [d.fromX, d.fromX, d.x * UNIT, d.x * UNIT] });
                const translateY = gather.interpolate({ inputRange: [0, d.start, end, 1], outputRange: [d.fromY, d.fromY, d.y * UNIT, d.y * UNIT] });
                const opacity = gather.interpolate({ inputRange: [0, d.start, Math.min(1, d.start + 0.2), 1], outputRange: [0, 0, 1, 1] });
                return (
                  <Animated.View
                    key={i}
                    style={[
                      styles.dot,
                      { backgroundColor: d.green ? colors.success : colors.primary, opacity, transform: [{ translateX }, { translateY }] },
                    ]}
                  />
                );
              })}
            </Animated.View>
            <Animated.View style={[StyleSheet.absoluteFill, { opacity: mark, transform: [{ scale: markScale }] }]}>
              <Svg width={STAGE} height={STAGE} viewBox="0 0 40 40">
                <Rect x={1} y={1} width={38} height={38} rx={10.5} fill="none" stroke={colors.primary} strokeWidth={0.8} />
                <Rect x={8} y={13} width={20} height={8} rx={2.4} fill={colors.primary} />
                <Rect x={10.5} y={15.2} width={4} height={3.2} rx={0.8} fill="#D8B96A" />
                <Rect x={15} y={19} width={6} height={13} rx={2} fill={colors.primary} />
                <Path
                  d="M30 12.5a6 6 0 0 1 0 9M33.5 9.5a10.5 10.5 0 0 1 0 15"
                  stroke={colors.success}
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  fill="none"
                />
              </Svg>
            </Animated.View>
          </View>
          <Animated.View style={{ opacity: word, transform: [{ translateY: wordShift }], alignItems: 'center' }}>
            <Text style={styles.word}>TAPO</Text>
            <Text style={styles.tag}>The right card, every time.</Text>
          </Animated.View>
        </View>
        <Text style={styles.skip}>Tap to skip</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', left: 0, top: 0, zIndex: 100, backgroundColor: colors.bg },
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28 },
  dot: {
    position: 'absolute',
    left: -DOT / 2,
    top: -DOT / 2,
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
  },
  word: { fontFamily: fonts.display, fontWeight: '900', fontSize: 34, letterSpacing: 11, color: colors.ink, paddingLeft: 11 },
  tag: { marginTop: 6, fontSize: 14, color: colors.textMuted },
  skip: { position: 'absolute', bottom: 40, alignSelf: 'center', fontSize: 13, color: colors.textSubtle },
});
