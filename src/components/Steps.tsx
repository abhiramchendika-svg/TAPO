import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Line, Path, Rect } from 'react-native-svg';

import { colors, focusRing, fonts, isFocused, space, type } from '../theme';
import { Icon } from './Icon';
import { Text } from './Text';

const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * "Label   01 | 04" with a hairline progress track beneath.
 * Inspired by architectural stage counters.
 */
export function StepCounter({ label, step, total }: { label: string; step: number; total: number }) {
  const pct = Math.max(0, Math.min(1, step / total));
  return (
    <View
      style={styles.counter}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`${label}, step ${step} of ${total}`}
      accessibilityValue={{ min: 0, max: total, now: step }}
    >
      <View style={styles.counterRow}>
        <Text style={styles.counterLabel} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.counterNums}>
          <Text style={{ color: colors.ink }}>{pad2(step)}</Text>
          <Text style={{ color: colors.borderStrong }}>{'  |  '}</Text>
          <Text style={{ color: colors.textSubtle }}>{pad2(total)}</Text>
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%` }]} />
      </View>
    </View>
  );
}

/** Large light numeral + title, separated by a hairline. */
export function NumberedHeading({
  n,
  title,
  state = 'active',
  right,
}: {
  n: number;
  title: string;
  state?: 'done' | 'active' | 'todo';
  right?: ReactNode;
}) {
  const dim = state === 'todo';
  return (
    <View style={styles.heading}>
      <Text style={[styles.headingNum, dim && { color: colors.borderStrong }]}>{pad2(n)}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[type.h2, dim && { color: colors.textSubtle }]} accessibilityRole="header">
          {title}
        </Text>
      </View>
      {state === 'done' ? <Icon name="check" color={colors.success} size={20} strokeWidth={2.4} /> : null}
      {right}
    </View>
  );
}

/** Numbered expandable section with an optional "Scope" list. */
export function Accordion({
  n,
  title,
  summary,
  scope,
  children,
  initiallyOpen = false,
}: {
  n: number;
  title: string;
  summary?: string;
  scope?: string[];
  children?: ReactNode;
  initiallyOpen?: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <View style={styles.acc}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${pad2(n)}, ${title}`}
        accessibilityHint={open ? 'Collapses this section' : 'Expands this section'}
        style={(state) => [styles.accHeader, state.pressed && { opacity: 0.7 }, isFocused(state) && focusRing]}
      >
        <Text style={styles.accNum}>{pad2(n)}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.accTitle}>{title}</Text>
          {summary && !open ? (
            <Text style={[type.small, { marginTop: 2 }]} numberOfLines={1}>
              {summary}
            </Text>
          ) : null}
        </View>
        <View style={[styles.accToggle, open && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
          <Icon name={open ? 'minus' : 'plus'} color={open ? colors.onPrimary : colors.ink} size={16} strokeWidth={2.2} />
        </View>
      </Pressable>
      {open ? (
        <View style={styles.accBody}>
          {children}
          {scope?.length ? (
            <View style={{ marginTop: space.md }}>
              <Text style={[type.mono, { marginBottom: space.sm }]}>Scope</Text>
              {scope.map((s) => (
                <View key={s} style={styles.scopeRow}>
                  <View style={styles.scopeTick} />
                  <Text style={[type.body, { flex: 1, fontSize: 15 }]}>{s}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/** Original blueprint-style line drawing: hairline grid, diagonals and a card outline. */
export function BlueprintArt({ width, height }: { width: number; height: number }) {
  const stroke = 'rgba(236, 233, 226, 0.16)';
  const strong = 'rgba(236, 233, 226, 0.34)';
  const cw = width * 0.46;
  const ch = cw / 1.586;
  const cx = (width - cw) / 2;
  const cy = (height - ch) / 2;
  const cols = 6;
  const rows = 4;
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Svg width={width} height={height}>
      {Array.from({ length: cols + 1 }, (_, i) => (
        <Line key={`v${i}`} x1={(width / cols) * i} y1={0} x2={(width / cols) * i} y2={height} stroke={stroke} />
      ))}
      {Array.from({ length: rows + 1 }, (_, i) => (
        <Line key={`h${i}`} x1={0} y1={(height / rows) * i} x2={width} y2={(height / rows) * i} stroke={stroke} />
      ))}
      <Line x1={0} y1={0} x2={width} y2={height} stroke={stroke} />
      <Line x1={width} y1={0} x2={0} y2={height} stroke={stroke} />
      {/* Card outline with chip and tap waves, drawn as construction lines */}
      <Rect x={cx} y={cy} width={cw} height={ch} rx={cw * 0.05} stroke={strong} strokeWidth={1.2} fill="none" />
      <Rect
        x={cx + cw * 0.09}
        y={cy + ch * 0.34}
        width={cw * 0.14}
        height={ch * 0.2}
        rx={3}
        stroke={strong}
        fill="none"
      />
      {[0.1, 0.17, 0.24].map((r) => (
        <Path
          key={r}
          d={`M${cx + cw * 0.3} ${cy + ch * 0.44 - cw * r * 0.5} a ${cw * r * 0.7} ${cw * r * 0.7} 0 0 1 0 ${cw * r}`}
          stroke={strong}
          fill="none"
        />
      ))}
      <Line x1={cx - 12} y1={cy + ch + 10} x2={cx + cw + 12} y2={cy + ch + 10} stroke={strong} />
      <Line x1={cx} y1={cy + ch + 4} x2={cx} y2={cy + ch + 16} stroke={strong} />
      <Line x1={cx + cw} y1={cy + ch + 4} x2={cx + cw} y2={cy + ch + 16} stroke={strong} />
    </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  counter: { gap: space.sm },
  counterRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space.md },
  counterLabel: { fontSize: 15, fontWeight: '600', color: colors.ink, flex: 1 },
  counterNums: { fontFamily: fonts.body, fontSize: 14, fontWeight: '700', letterSpacing: 0.5, fontVariant: ['tabular-nums'] },
  track: { height: 2, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: 2, backgroundColor: colors.primary },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingBottom: space.sm,
    marginBottom: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderStrong,
  },
  headingNum: {
    fontFamily: fonts.body,
    fontSize: 22,
    fontWeight: '300',
    color: colors.textMuted,
    letterSpacing: 0.5,
    minWidth: 34,
    fontVariant: ['tabular-nums'],
  },
  acc: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderStrong },
  accHeader: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.lg, minHeight: 64 },
  accNum: {
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSubtle,
    width: 28,
    fontVariant: ['tabular-nums'],
  },
  accTitle: { fontSize: 19, fontWeight: '500', color: colors.ink, letterSpacing: -0.2 },
  accToggle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accBody: { paddingLeft: 28 + space.md, paddingBottom: space.lg },
  scopeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, paddingVertical: 4 },
  scopeTick: { width: 12, height: 1, backgroundColor: colors.textMuted, marginTop: 11 },
});
