import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { formatRupees, rupeesA11y } from '../lib/format';
import { colors, radius, space, type } from '../theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

/* ------------------------------------------------------------------------ */
/* Amount                                                                    */
/* ------------------------------------------------------------------------ */

const AMOUNT_SIZES = {
  sm: { fontSize: 15, fontWeight: '600' as const },
  md: { fontSize: 17, fontWeight: '700' as const },
  lg: { fontSize: 24, fontWeight: '800' as const, letterSpacing: -0.4 },
  xl: { fontSize: 38, fontWeight: '800' as const, letterSpacing: -0.8 },
};

/**
 * One consistent way to show money: ₹ with Indian grouping, tabular digits so
 * columns line up, and a spoken label for screen readers.
 * `kind="spend"` prefixes a minus sign; `kind="reward"` uses the success colour
 * with a plus sign. Neither relies on colour alone.
 */
export function Amount({
  value,
  size = 'md',
  kind = 'plain',
  decimals,
  style,
}: {
  value: number;
  size?: keyof typeof AMOUNT_SIZES;
  kind?: 'plain' | 'spend' | 'reward' | 'muted';
  decimals?: boolean;
  style?: StyleProp<TextStyle>;
}) {
  const text = formatRupees(value, { decimals });
  const sign = kind === 'spend' ? '−' : kind === 'reward' ? '+' : '';
  const color = kind === 'reward' ? colors.success : kind === 'muted' ? colors.textMuted : colors.ink;
  const spoken = `${kind === 'spend' ? 'spent ' : kind === 'reward' ? 'earned ' : ''}${rupeesA11y(value)}`;
  return (
    <Text
      style={[styles.amount, AMOUNT_SIZES[size], { color }, style]}
      accessibilityLabel={spoken}
      numberOfLines={1}
    >
      {sign}
      {text}
    </Text>
  );
}

/* ------------------------------------------------------------------------ */
/* Status badge                                                              */
/* ------------------------------------------------------------------------ */

/**
 * Only states the app can actually know about. TAPO never processes real
 * payments, so the only approved/declined states are the tap-to-pay DEMO's,
 * and their labels always say "simulated".
 */
export type Status = 'sample' | 'estimate' | 'best' | 'unavailable' | 'demo-approved' | 'demo-declined' | 'demo';

const STATUS: Record<Status, { label: string; icon: IconName; fg: string; bg: string; border: string }> = {
  sample: { label: 'Sample record', icon: 'info', fg: colors.textMuted, bg: colors.surfaceAlt, border: colors.borderStrong },
  estimate: { label: 'Estimate', icon: 'spark', fg: colors.ink, bg: colors.primarySoft, border: colors.borderStrong },
  best: { label: 'Best match', icon: 'check', fg: colors.success, bg: colors.successBg, border: colors.successBorder },
  unavailable: {
    label: 'Not available',
    icon: 'lock',
    fg: colors.warningText,
    bg: colors.warningBg,
    border: colors.warningBorder,
  },
  'demo-approved': {
    label: 'Approved · simulated',
    icon: 'check',
    fg: colors.success,
    bg: colors.successBg,
    border: colors.successBorder,
  },
  'demo-declined': {
    label: 'Declined · simulated',
    icon: 'close',
    fg: colors.danger,
    bg: colors.dangerBg,
    border: colors.dangerBorder,
  },
  demo: { label: 'Demo — no money moved', icon: 'info', fg: colors.warningText, bg: colors.warningBg, border: colors.warningBorder },
};

/** Icon + words + colour, so status never depends on colour alone. */
export function StatusBadge({ status, label }: { status: Status; label?: string }) {
  const s = STATUS[status];
  const text = label ?? s.label;
  return (
    <View
      style={[styles.badge, { backgroundColor: s.bg, borderColor: s.border }]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Status: ${text}`}
    >
      <Icon name={s.icon} color={s.fg} size={14} strokeWidth={2.2} />
      <Text style={[styles.badgeText, { color: s.fg }]}>{text}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------------ */
/* Detail list (review summaries, receipts)                                  */
/* ------------------------------------------------------------------------ */

export function DetailList({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.list, style]}>{children}</View>;
}

/** Label on the left, value right-aligned. Pass `children` for a custom value. */
export function DetailRow({
  label,
  value,
  children,
  emphasis,
  last,
  hint,
}: {
  label: string;
  value?: string;
  children?: ReactNode;
  emphasis?: boolean;
  last?: boolean;
  hint?: string;
}) {
  return (
    <View
      style={[styles.row, !last && styles.rowDivider, emphasis && styles.rowEmphasis]}
      accessible={!children}
      accessibilityLabel={value ? `${label}: ${value}${hint ? `. ${hint}` : ''}` : undefined}
    >
      <View style={{ flexShrink: 1 }}>
        <Text style={[type.small, emphasis && { color: colors.ink, fontWeight: '600' }]}>{label}</Text>
        {hint ? <Text style={[type.caption, { fontWeight: '500', marginTop: 2 }]}>{hint}</Text> : null}
      </View>
      <View style={styles.rowValue}>
        {children ?? (
          <Text style={[styles.valueText, emphasis && { fontWeight: '700' }]} numberOfLines={2}>
            {value}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  amount: { fontVariant: ['tabular-nums'], textAlign: 'right' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm + 2,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 12, fontWeight: '600' },
  list: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.lg,
    paddingVertical: space.md + 2,
    minHeight: 52,
  },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowEmphasis: { paddingVertical: space.lg },
  rowValue: { flexShrink: 1, alignItems: 'flex-end' },
  valueText: { fontSize: 15, fontWeight: '500', color: colors.ink, textAlign: 'right', fontVariant: ['tabular-nums'] },
});
