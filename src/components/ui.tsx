import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, controlRadius, focusRing, fonts, isFocused, motion, radius, resolveFont, shadow, space, type } from '../theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export function Screen({
  children,
  scroll = true,
  edges = ['top'],
}: {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
}) {
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.inner}>{children}</View>
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.inner, { flex: 1 }]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

/** Gallery-style page title: mono kicker above a condensed uppercase headline. */
export function Title({
  children,
  kicker,
  subtitle,
  right,
}: {
  children: string;
  kicker?: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <View style={styles.titleRow}>
      <View style={{ flex: 1 }}>
        {kicker ? <Text style={[type.mono, { marginBottom: space.xs }]}>{kicker}</Text> : null}
        <Text style={type.display} accessibilityRole="header">
          {children}
        </Text>
        {subtitle ? <Text style={[type.small, { marginTop: space.sm }]}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flex: 1 }}>
        <View style={styles.rule} />
        <Text style={type.mono} accessibilityRole="header">
          {title}
        </Text>
      </View>
      {action}
    </View>
  );
}

export function Panel({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'inverse';

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  iconRight,
  size = 'md',
  disabled,
  accessibilityHint,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  iconRight?: IconName;
  size?: 'md' | 'sm';
  disabled?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const v = buttonVariants[variant];
  const sm = size === 'sm';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      style={(state) => [
        styles.button,
        sm && styles.buttonSm,
        { backgroundColor: state.pressed ? v.pressed : v.bg, borderColor: v.border },
        state.pressed && !disabled && { transform: [{ scale: 0.975 }] },
        disabled && { opacity: 0.45 },
        isFocused(state) && focusRing,
        style,
      ]}
    >
      {icon ? <Icon name={icon} color={v.fg} size={sm ? 18 : 20} strokeWidth={2.1} /> : null}
      <Text style={[styles.buttonText, sm && { fontSize: 13 }, { color: v.fg }]}>{label}</Text>
      {iconRight ? <Icon name={iconRight} color={v.fg} size={sm ? 16 : 18} strokeWidth={2.1} /> : null}
    </Pressable>
  );
}

const buttonVariants: Record<ButtonVariant, { bg: string; pressed: string; fg: string; border: string }> = {
  primary: { bg: colors.primary, pressed: colors.primaryPressed, fg: colors.onPrimary, border: colors.primary },
  secondary: { bg: colors.surfaceAlt, pressed: colors.border, fg: colors.ink, border: colors.borderStrong },
  outline: { bg: 'transparent', pressed: colors.surfaceAlt, fg: colors.ink, border: colors.borderStrong },
  danger: { bg: 'transparent', pressed: colors.dangerBg, fg: colors.danger, border: colors.dangerBorder },
  ghost: { bg: 'transparent', pressed: colors.surfaceAlt, fg: colors.ink, border: 'transparent' },
  /** Dark button for use on light "wall" panels. */
  inverse: { bg: colors.bg, pressed: '#1D2335', fg: colors.primary, border: colors.bg },
};

/** Circular icon-only button (≥44pt target). */
export function IconButton({
  icon,
  label,
  onPress,
  tone = 'outline',
  disabled,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  tone?: 'outline' | 'primary';
  disabled?: boolean;
}) {
  const primary = tone === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={4}
      style={(state) => [
        styles.iconButton,
        primary
          ? { backgroundColor: state.pressed ? colors.primaryPressed : colors.primary, borderColor: colors.primary }
          : { backgroundColor: state.pressed ? colors.surfaceAlt : 'transparent', borderColor: colors.borderStrong },
        disabled && { opacity: 0.35 },
        isFocused(state) && focusRing,
      ]}
    >
      <Icon name={icon} color={primary ? colors.onPrimary : colors.ink} size={20} strokeWidth={2} />
    </Pressable>
  );
}

/**
 * Segmented control, e.g. Gallery | Stack | List. The selection thumb springs between options
 * (native driver); the label colour changes immediately so the response never waits on motion.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  const [layouts, setLayouts] = useState<Record<string, { x: number; width: number }>>({});
  const [x] = useState(() => new Animated.Value(0));
  const [w] = useState(() => new Animated.Value(0));
  const placedRef = useRef(false);
  const active = layouts[value];
  // The thumb exists once the selected option has been measured.
  const placed = !!active;
  useEffect(() => {
    if (!active) return;
    if (!placedRef.current) {
      x.setValue(active.x);
      w.setValue(active.width);
      placedRef.current = true;
      return;
    }
    Animated.parallel([
      Animated.spring(x, { toValue: active.x, ...motion.spring, useNativeDriver: false }),
      Animated.spring(w, { toValue: active.width, ...motion.spring, useNativeDriver: false }),
    ]).start();
  }, [active, x, w]);

  return (
    <View style={styles.segmented} accessibilityRole="tablist" accessibilityLabel={label}>
      {placed ? <Animated.View pointerEvents="none" style={[styles.segmentThumb, { left: x, width: w }]} /> : null}
      {options.map((o) => {
        const isActive = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            onLayout={(e) => {
              const { x: lx, width } = e.nativeEvent.layout;
              setLayouts((prev) =>
                prev[o.value]?.x === lx && prev[o.value]?.width === width ? prev : { ...prev, [o.value]: { x: lx, width } },
              );
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={o.label}
            style={(state) => [
              styles.segment,
              !placed && isActive && styles.segmentActive,
              state.pressed && { transform: [{ scale: 0.97 }] },
              isFocused(state) && focusRing,
            ]}
          >
            <Text style={[styles.segmentText, isActive && { color: colors.onPrimary }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: IconName;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected, checked: selected }}
      accessibilityLabel={label}
      style={(state) => [
        styles.chip,
        selected ? styles.chipSelected : null,
        state.pressed && !selected ? { backgroundColor: colors.surfaceAlt } : null,
        isFocused(state) && focusRing,
      ]}
    >
      {icon ? <Icon name={icon} size={16} color={selected ? colors.onPrimary : colors.textMuted} /> : null}
      <Text style={[styles.chipText, selected && { color: colors.onPrimary }]}>{label}</Text>
    </Pressable>
  );
}

export function ChipGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ marginBottom: space.lg }}>
      <Text style={[type.mono, { marginBottom: space.sm }]}>{label}</Text>
      <View style={styles.chipRow} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {children}
      </View>
    </View>
  );
}

export function Field({
  label,
  hint,
  error,
  prefix,
  suffix,
  style,
  ...input
}: TextInputProps & {
  label: string;
  hint?: string;
  error?: string | null;
  prefix?: string;
  suffix?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[{ marginBottom: space.lg }, style]}>
      <Text style={[type.mono, { marginBottom: space.sm }]}>{label}</Text>
      <View
        style={[
          styles.inputWrap,
          focused && { borderColor: colors.primary, borderWidth: 2, paddingHorizontal: space.md - 1 },
          error ? { borderColor: colors.danger, borderWidth: 2, paddingHorizontal: space.md - 1 } : null,
        ]}
      >
        {prefix ? <Text style={styles.affix}>{prefix}</Text> : null}
        <TextInput
          {...input}
          onFocus={(e) => {
            setFocused(true);
            input.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            input.onBlur?.(e);
          }}
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          placeholderTextColor={colors.textSubtle}
          selectionColor={colors.primary}
          style={styles.input}
          autoCorrect={false}
        />
        {suffix ? <Text style={styles.affix}>{suffix}</Text> : null}
      </View>
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite" accessibilityRole="alert">
          {error}
        </Text>
      ) : hint ? (
        <Text style={[type.caption, { marginTop: space.xs + 2, fontWeight: '500' }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

export function Notice({
  tone = 'info',
  title,
  icon,
  children,
}: {
  tone?: 'info' | 'warning';
  title?: string;
  icon?: IconName;
  children: ReactNode;
}) {
  const warn = tone === 'warning';
  const fg = warn ? colors.warningText : colors.textMuted;
  return (
    <View
      style={[styles.notice, warn ? { backgroundColor: colors.warningBg, borderColor: colors.warningBorder } : null]}
      accessibilityRole="summary"
    >
      <Icon name={icon ?? (warn ? 'info' : 'shield')} color={warn ? colors.warningText : colors.ink} size={20} />
      <View style={{ flex: 1, gap: 2 }}>
        {title ? <Text style={[type.label, { color: warn ? colors.warningText : colors.ink }]}>{title}</Text> : null}
        <Text style={[type.small, { color: fg }]}>{children}</Text>
      </View>
    </View>
  );
}

/** Slim, unobtrusive but always-visible demo disclaimer. */
export function DemoBanner({ text = 'Demo only · sample data · no payments' }: { text?: string }) {
  return (
    <View style={styles.demo} accessible accessibilityRole="text" accessibilityLabel={`Notice: ${text.replace(/·/g, ',')}`}>
      <View style={styles.demoDot} />
      <Text style={styles.demoText}>{text}</Text>
    </View>
  );
}

export function SampleBadge() {
  return (
    <View style={styles.badge} accessibilityLabel="Sample data">
      <Text style={styles.badgeText}>SAMPLE</Text>
    </View>
  );
}

export function EmptyState({
  title,
  message,
  action,
  icon = 'card',
}: {
  title: string;
  message: string;
  action?: ReactNode;
  icon?: IconName;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Icon name={icon} color={colors.ink} size={26} />
      </View>
      <Text style={[type.h2, { textAlign: 'center' }]}>{title}</Text>
      <Text style={[type.small, { textAlign: 'center', marginTop: space.xs, marginBottom: action ? space.lg : 0 }]}>
        {message}
      </Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: space.lg + 4, paddingTop: space.lg, paddingBottom: space.xxxl },
  inner: { width: '100%', maxWidth: 640, alignSelf: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md, marginBottom: space.lg },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.xl + 4,
    marginBottom: space.md,
    minHeight: 32,
  },
  rule: { width: 18, height: 1, backgroundColor: colors.borderStrong },
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
  },
  button: {
    minHeight: 52,
    paddingHorizontal: space.xl - 4,
    borderRadius: controlRadius,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: space.sm,
  },
  buttonSm: { minHeight: 44, paddingHorizontal: space.lg, borderRadius: 10 },
  // Title Case ("Reset Demo Data") — labels are written in sentence case and capitalised here.
  buttonText: {
    fontFamily: fonts.body,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.1,
    textTransform: 'capitalize',
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmented: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: controlRadius,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceSunken,
  },
  segment: { minHeight: 38, paddingHorizontal: space.md + 2, borderRadius: controlRadius - 3, justifyContent: 'center', zIndex: 1 },
  segmentThumb: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    borderRadius: controlRadius - 3,
    backgroundColor: colors.primary,
    boxShadow: '0px 1px 0px rgba(255,255,255,0.35) inset, 0px 4px 12px rgba(0,0,0,0.35)',
  },
  segmentActive: { backgroundColor: colors.primary },
  segmentText: { fontFamily: fonts.body, fontSize: 14, fontWeight: '700', color: colors.textMuted },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    minHeight: 44,
    paddingHorizontal: space.md + 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.text },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: controlRadius,
    backgroundColor: colors.surfaceSunken,
    paddingHorizontal: space.md,
  },
  // TextInput isn't wrapped by our <Text>, so it names the font file directly.
  input: { flex: 1, fontSize: 17, color: colors.ink, paddingVertical: space.md, fontFamily: resolveFont('body', '500') },
  affix: { fontSize: 17, color: colors.textMuted, fontWeight: '600', marginHorizontal: 2 },
  error: { color: colors.danger, fontSize: 14, marginTop: space.xs + 2, fontWeight: '600' },
  notice: {
    flexDirection: 'row',
    gap: space.md,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.md + 2,
  },
  demo: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.warningBg,
    borderColor: colors.warningBorder,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 6,
  },
  demoDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.warningText },
  demoText: { fontFamily: fonts.body, fontSize: 13, fontWeight: '700', color: colors.warningText },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    backgroundColor: colors.warningBg,
  },
  badgeText: { fontSize: 11, fontWeight: '800', color: colors.warningText, letterSpacing: 0.8 },
  empty: {
    alignItems: 'center',
    paddingVertical: space.xl + 4,
    paddingHorizontal: space.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.md,
  },
});
