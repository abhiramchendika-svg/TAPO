import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

import { formatPercent } from '../lib/format';
import { CATEGORY_LABELS, type Card } from '../lib/types';
import { colors, focusRing, fonts, isFocused, radius, shade, space, type, withAlpha } from '../theme';
import { CARD_RATIO, CardTile } from './CardTile';
import { Icon } from './Icon';
import { Text } from './Text';
import { IconButton } from './ui';

/** Short "best for" line used on placards and lists. */
export function bestFor(card: Card): string {
  const top = [...card.rules].sort((a, b) => b.ratePercent - a.ratePercent)[0];
  if (!top || top.ratePercent <= card.baseRatePercent) return `${formatPercent(card.baseRatePercent)} on everything`;
  return `${formatPercent(top.ratePercent)} on ${CATEGORY_LABELS[top.category]}`;
}

/* ------------------------------------------------------------------------ */
/* Spotlight glow                                                            */
/* ------------------------------------------------------------------------ */

/** Soft halo behind a floating card — light falling on it from above, on the dark scene. */
function Spot({ width, height, color = colors.spotlight }: { width: number; height: number; color?: string }) {
  const id = `spot${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id={id} cx="0.5" cy="0.42" rx="0.5" ry="0.5">
          <Stop offset="0" stopColor={color} stopOpacity="0.16" />
          <Stop offset="0.6" stopColor={color} stopOpacity="0.05" />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Ellipse cx={width / 2} cy={height / 2} rx={width / 2} ry={height / 2} fill={`url(#${id})`} />
    </Svg>
  );
}

/** Faint pool of light under a hovering card, suggesting height above the ground. */
function FloorGlow({ width, color = '#FFFFFF' }: { width: number; color?: string }) {
  const id = `pool${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const h = 18;
  return (
    <Svg width={width} height={h} pointerEvents="none">
      <Defs>
        <RadialGradient id={id} cx="0.5" cy="0.5" rx="0.5" ry="0.5">
          <Stop offset="0" stopColor={color} stopOpacity="0.22" />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Ellipse cx={width / 2} cy={h / 2} rx={width / 2} ry={h / 2} fill={`url(#${id})`} />
    </Svg>
  );
}

/** Coloured glow under a card, as if lit by its own colour. */
function cardGlow(color: string, width: number) {
  return {
    borderRadius: Math.round(width * 0.052),
    boxShadow: `0px 18px 42px ${withAlpha(color, 0.5)}, 0px 6px 14px rgba(0, 0, 0, 0.45)`,
  };
}

/* ------------------------------------------------------------------------ */
/* Placard: museum-style label shown beneath a card on the wall              */
/* ------------------------------------------------------------------------ */

export function Placard({ card, width }: { card: Card; width: number }) {
  return (
    <View
      style={[styles.placard, { width }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text style={styles.placardMeta} numberOfLines={1}>
        {card.issuer}
      </Text>
      <Text style={styles.placardTitle} numberOfLines={1}>
        {card.nickname}
      </Text>
      <Text style={styles.placardMeta} numberOfLines={1}>
        {card.isSample ? 'Sample · ' : ''}•• {card.last4}
      </Text>
    </View>
  );
}

/* ------------------------------------------------------------------------ */
/* Stage: a single card floating over the dark scene                         */
/* ------------------------------------------------------------------------ */

export function Stage({ children, caption, dim }: { children: ReactNode; caption?: string; dim?: boolean }) {
  const [w, setW] = useState(0);
  const [h, setH] = useState(0);
  return (
    <View
      style={styles.stage}
      onLayout={(e) => {
        setW(e.nativeEvent.layout.width);
        setH(e.nativeEvent.layout.height);
      }}
    >
      {w > 0 && !dim ? (
        <View style={{ position: 'absolute', top: 0, left: w * 0.05, width: w * 0.9, height: h * 0.85 }}>
          <Spot width={w * 0.9} height={h * 0.85} />
        </View>
      ) : null}
      <View style={{ alignItems: 'center', opacity: dim ? 0.6 : 1 }}>{children}</View>
      {w > 0 ? (
        <View style={{ marginTop: space.md }}>
          <FloorGlow width={Math.min(w * 0.7, 300)} />
        </View>
      ) : null}
      {caption ? <Text style={styles.stageCaption}>{caption}</Text> : null}
    </View>
  );
}

/* ------------------------------------------------------------------------ */
/* Gallery wall: curved, spotlit, swipeable card carousel                    */
/* ------------------------------------------------------------------------ */

const GAP = 8;
const MAX_CARD = 340;
type Item = { kind: 'card'; card: Card } | { kind: 'add' };

export function GalleryWall({
  cards,
  onOpen,
  onAdd,
  onIndexChange,
}: {
  cards: Card[];
  onOpen: (card: Card) => void;
  onAdd: () => void;
  onIndexChange?: (index: number) => void;
}) {
  const [W, setW] = useState(0);
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<Item>>(null);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [scrollX] = useState(() => new Animated.Value(0));
  const [onScrollEvent] = useState(() =>
    Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
      useNativeDriver: Platform.OS !== 'web',
    }),
  );

  const cardW = Math.max(200, Math.min(W - 112, MAX_CARD));
  const cardH = cardW / CARD_RATIO;
  const placardW = Math.min(cardW * 0.62, 210);
  const glowTop = 28;
  const poolH = 18;
  const itemH = glowTop + cardH + 14 + poolH + 8 + 58;
  const sceneH = itemH + 16;
  const side = Math.max(16, (W - cardW) / 2);
  const interval = cardW + GAP;

  // Gentle hover: the cards drift up and down, as if floating. Off when Reduce Motion is on.
  const [floatY] = useState(() => new Animated.Value(0));
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    let cancelled = false;
    const native = Platform.OS !== 'web';
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled || reduce) return;
        const ease = Easing.inOut(Easing.sin);
        loop = Animated.loop(
          Animated.sequence([
            Animated.timing(floatY, { toValue: -7, duration: 2400, easing: ease, useNativeDriver: native }),
            Animated.timing(floatY, { toValue: 0, duration: 2400, easing: ease, useNativeDriver: native }),
          ]),
        );
        loop.start();
      });
    return () => {
      cancelled = true;
      loop?.stop();
    };
  }, [floatY]);
  // The light pool fades a little as the card rises.
  const poolOpacity = floatY.interpolate({ inputRange: [-7, 0], outputRange: [0.55, 1] });

  const items: Item[] = [...cards.map((card) => ({ kind: 'card' as const, card })), { kind: 'add' }];

  const count = items.length;

  // Track the centred card from the animated scroll value (works with the native driver).
  useEffect(() => {
    const id = scrollX.addListener(({ value: x }) => {
      const i = Math.max(0, Math.min(count - 1, Math.round(x / interval)));
      setIndex(i);
      // Native snaps via snapToInterval; on web, settle onto the nearest card once idle.
      if (Platform.OS === 'web') {
        if (settle.current) clearTimeout(settle.current);
        settle.current = setTimeout(() => {
          if (Math.abs(x - i * interval) > 1) listRef.current?.scrollToOffset({ offset: i * interval, animated: true });
        }, 160);
      }
    });
    return () => scrollX.removeListener(id);
  }, [scrollX, interval, count]);

  useEffect(() => {
    onIndexChange?.(index);
  }, [index, onIndexChange]);

  function goTo(i: number) {
    const n = Math.max(0, Math.min(count - 1, i));
    listRef.current?.scrollToOffset({ offset: n * interval, animated: true });
    setIndex(n);
  }

  return (
    <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}>
      {W > 0 ? (
        <View style={{ height: sceneH }}>
          <Animated.FlatList
            ref={listRef}
            data={items}
            horizontal
            keyExtractor={(it: Item) => (it.kind === 'card' ? it.card.id : 'add')}
            showsHorizontalScrollIndicator={false}
            snapToInterval={interval}
            snapToAlignment="start"
            decelerationRate="fast"
            disableIntervalMomentum
            scrollEventThrottle={16}
            onScroll={onScrollEvent}
            contentContainerStyle={{ paddingHorizontal: side, paddingTop: 8 }}
            ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
            getItemLayout={(_: unknown, i: number) => ({ length: interval, offset: interval * i, index: i })}
            accessibilityLabel="Your cards. Swipe left or right to browse."
            renderItem={({ item, index: i }: { item: Item; index: number }) => {
              const inputRange = [(i - 1) * interval, i * interval, (i + 1) * interval];
              const rotateY = scrollX.interpolate({
                inputRange,
                outputRange: ['-22deg', '0deg', '22deg'],
                extrapolate: 'clamp',
              });
              const scale = scrollX.interpolate({ inputRange, outputRange: [0.86, 1, 0.86], extrapolate: 'clamp' });
              const opacity = scrollX.interpolate({ inputRange, outputRange: [0.8, 1, 0.8], extrapolate: 'clamp' });
              // Pull neighbours inward so they peek around the centred card.
              const translateX = scrollX.interpolate({
                inputRange,
                outputRange: [-cardW * 0.12, 0, cardW * 0.12],
                extrapolate: 'clamp',
              });
              return (
                <Animated.View
                  style={{
                    width: cardW,
                    height: itemH,
                    alignItems: 'center',
                    opacity,
                    transform: [{ perspective: 900 }, { translateX }, { rotateY }, { scale }],
                  }}
                >
                  <View style={{ position: 'absolute', top: 0, left: -cardW * 0.15, width: cardW * 1.3, height: cardH * 1.35 }}>
                    <Spot width={cardW * 1.3} height={cardH * 1.35} />
                  </View>
                  <Animated.View
                    style={[
                      { marginTop: glowTop, transform: [{ translateY: floatY }] },
                      item.kind === 'card' && cardGlow(item.card.color, cardW),
                    ]}
                  >
                    {item.kind === 'card' ? (
                      <CardTile card={item.card} width={cardW} onPress={() => onOpen(item.card)} />
                    ) : (
                      <AddTile width={cardW} height={cardH} onPress={onAdd} />
                    )}
                  </Animated.View>
                  <Animated.View style={{ marginTop: 14, opacity: poolOpacity }}>
                    <FloorGlow
                      width={cardW * 0.8}
                      color={item.kind === 'card' ? shade(item.card.color, 0.5) : '#FFFFFF'}
                    />
                  </Animated.View>
                  <View style={{ marginTop: 8 }}>
                    {item.kind === 'card' ? (
                      <Placard card={item.card} width={placardW} />
                    ) : (
                      <View style={[styles.placard, { width: placardW }]}>
                        <Text style={styles.placardTitle}>Empty frame</Text>
                        <Text style={styles.placardMeta}>Add a card</Text>
                      </View>
                    )}
                  </View>
                </Animated.View>
              );
            }}
          />
        </View>
      ) : (
        <View style={{ height: 320 }} />
      )}

      {/* Controls: ← dots → */}
      <View style={styles.controls}>
        <IconButton icon="arrowLeft" label="Previous card" onPress={() => goTo(index - 1)} disabled={index === 0} />
        <View style={styles.dots}>
          {items.map((it, i) => (
            <Pressable
              key={it.kind === 'card' ? it.card.id : 'add'}
              onPress={() => goTo(i)}
              accessibilityRole="button"
              accessibilityState={{ selected: i === index }}
              accessibilityLabel={`Show ${it.kind === 'card' ? it.card.nickname : 'add card'}, ${i + 1} of ${items.length}`}
              hitSlop={6}
              style={{ padding: 4 }}
            >
              <View style={[styles.dot, i === index && styles.dotActive]} />
            </Pressable>
          ))}
        </View>
        <IconButton
          icon="arrowRight"
          label="Next card"
          onPress={() => goTo(index + 1)}
          disabled={index === items.length - 1}
        />
      </View>
    </View>
  );
}

function AddTile({ width, height, onPress }: { width: number; height: number; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Add a card"
      style={(state) => [
        styles.add,
        { width, height, borderRadius: Math.round(width * 0.052) },
        state.pressed && { backgroundColor: 'rgba(255,255,255,0.08)' },
        isFocused(state) && focusRing,
      ]}
    >
      <View style={styles.addIcon}>
        <Icon name="plus" color={colors.ink} size={24} strokeWidth={2} />
      </View>
      <Text style={styles.addTitle}>Add a card</Text>
      <Text style={styles.addSub}>Nickname + last 4 digits only</Text>
    </Pressable>
  );
}

/* ------------------------------------------------------------------------ */
/* List view                                                                 */
/* ------------------------------------------------------------------------ */

export function CardList({
  cards,
  onOpen,
  onAdd,
}: {
  cards: Card[];
  onOpen: (card: Card) => void;
  onAdd: () => void;
}) {
  return (
    <View style={styles.list}>
      {cards.map((c, i) => (
        <Pressable
          key={c.id}
          onPress={() => onOpen(c)}
          accessibilityRole="button"
          accessibilityLabel={`${c.isSample ? 'Sample card ' : ''}${c.nickname}, ${c.network} ending ${c.last4}. Best: ${bestFor(c)}`}
          accessibilityHint="Opens card details"
          style={({ pressed }) => [styles.listRow, i > 0 && styles.listDivider, pressed && { backgroundColor: colors.surfaceAlt }]}
        >
          <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            <CardTile card={c} width={92} elevated={false} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={type.mono} numberOfLines={1}>
              {c.issuer}
            </Text>
            <Text style={[type.h2, { marginTop: 2 }]} numberOfLines={1}>
              {c.nickname}
            </Text>
            <Text style={[type.caption, { color: colors.success, marginTop: 2 }]} numberOfLines={1}>
              Best: {bestFor(c)}
            </Text>
          </View>
          <Icon name="chevronRight" color={colors.textSubtle} size={20} />
        </Pressable>
      ))}
      <Pressable
        onPress={onAdd}
        accessibilityRole="button"
        accessibilityLabel="Add a card"
        style={({ pressed }) => [styles.listRow, cards.length > 0 && styles.listDivider, pressed && { backgroundColor: colors.surfaceAlt }]}
      >
        <View style={styles.listAdd}>
          <Icon name="plus" color={colors.ink} size={22} />
        </View>
        <Text style={[type.label, { flex: 1 }]}>Add a card</Text>
        <Icon name="chevronRight" color={colors.textSubtle} size={20} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  placard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 1,
  },
  placardTitle: { fontSize: 13, fontWeight: '700', color: colors.ink },
  placardMeta: {
    fontFamily: fonts.body,
    fontWeight: '500',
    fontSize: 11,
    color: colors.textSubtle,
    letterSpacing: 0.2,
    textTransform: 'capitalize',
  },
  stage: {
    paddingVertical: space.lg,
    paddingHorizontal: space.lg,
    alignItems: 'center',
  },
  stageCaption: {
    fontFamily: fonts.body,
    fontWeight: '500',
    fontSize: 12,
    letterSpacing: 0.3,
    textTransform: 'capitalize',
    color: colors.textSubtle,
    marginTop: space.sm,
    textAlign: 'center',
  },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.lg, marginTop: space.md },
  dots: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.borderStrong },
  dotActive: { width: 20, backgroundColor: colors.primary },
  add: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
  },
  addIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xs,
  },
  addTitle: { fontSize: 16, fontWeight: '700', color: colors.ink },
  addSub: { fontSize: 13, color: colors.textMuted },
  list: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, minHeight: 72 },
  listDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  listAdd: {
    width: 92,
    height: 58,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
