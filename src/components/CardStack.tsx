import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';

import { formatRupees } from '../lib/format';
import { earnedThisMonth, monthSummary } from '../lib/rewards';
import { CATEGORY_LABELS, type Card, type Category, type Transaction } from '../lib/types';
import { colors, radius, space, type } from '../theme';
import { CardTile, useCardWidth } from './CardTile';
import { Text } from './Text';
import { Button } from './ui';

/** This month's numbers for one card: spend, rewards earned (caps applied) and what's left on its main capped rule. */
export function cardMonthStats(card: Card, txns: Transaction[], now = new Date()) {
  const summary = monthSummary(card, txns, now);
  const capped = card.rules.filter((r) => r.monthlyCapRupees !== undefined).sort((a, b) => b.ratePercent - a.ratePercent)[0];
  const top = [...card.rules].sort((a, b) => b.ratePercent - a.ratePercent)[0];
  const capLeft =
    capped && capped.monthlyCapRupees !== undefined
      ? Math.max(0, Math.round((capped.monthlyCapRupees - earnedThisMonth(card, capped.category, txns, now)) * 100) / 100)
      : undefined;
  return {
    spend: summary.totalSpend,
    reward: summary.totalReward,
    capCategory: capped?.category,
    capLeft,
    bestCategory: top && top.ratePercent > card.baseRatePercent ? top.category : undefined,
  };
}

/**
 * Cards stacked vertically, each with a panel showing this month's spend, rewards and cap left,
 * plus "View card" and "Best for …" actions. Items rise into place one after another.
 */
export function CardStack({ cards, txns }: { cards: Card[]; txns: Transaction[] }) {
  const width = useCardWidth(420);
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduce)
      .catch(() => {});
  }, []);

  return (
    <View style={styles.list}>
      {cards.map((card, i) => (
        <StackItem key={card.id} card={card} txns={txns} width={width} index={i} animate={!reduce} />
      ))}
    </View>
  );
}

function StackItem({
  card,
  txns,
  width,
  index,
  animate,
}: {
  card: Card;
  txns: Transaction[];
  width: number;
  index: number;
  animate: boolean;
}) {
  const [rise] = useState(() => new Animated.Value(animate ? 0 : 1));
  useEffect(() => {
    if (!animate) {
      rise.setValue(1);
      return;
    }
    const a = Animated.timing(rise, {
      toValue: 1,
      duration: 650,
      delay: 90 * index,
      easing: Easing.bezier(0.2, 0.8, 0.2, 1),
      useNativeDriver: true,
    });
    a.start();
    return () => a.stop();
  }, [animate, index, rise]);

  const s = cardMonthStats(card, txns);
  const best: Category | undefined = s.bestCategory;
  const translateY = rise.interpolate({ inputRange: [0, 1], outputRange: [36, 0] });
  const rotateX = rise.interpolate({ inputRange: [0, 1], outputRange: ['16deg', '0deg'] });
  const scale = rise.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] });

  return (
    <Animated.View style={[styles.item, { width, transform: [{ perspective: 900 }, { translateY }, { rotateX }, { scale }] }]}>
      <CardTile card={card} width={width} onPress={() => router.push(`/card/${card.id}`)} />
      <View style={styles.panel}>
        <View style={styles.stats}>
          <Stat label="Spent this month" value={formatRupees(s.spend)} />
          <Stat label="Rewards earned" value={`+${formatRupees(s.reward, { decimals: true })}`} color={colors.success} />
          <Stat
            label={s.capCategory ? `${CATEGORY_LABELS[s.capCategory]} cap left` : 'Monthly cap'}
            value={s.capLeft !== undefined ? formatRupees(s.capLeft) : 'None'}
            color={colors.warningText}
          />
        </View>
        <View style={styles.actions}>
          <Button
            label="View card"
            variant="secondary"
            size="sm"
            onPress={() => router.push(`/card/${card.id}`)}
            style={{ flex: 1 }}
          />
          <Button
            label={best ? `Best for ${CATEGORY_LABELS[best].split(' ')[0]}` : 'Compare cards'}
            size="sm"
            onPress={() =>
              router.push(best ? { pathname: '/recommend', params: { category: best, amount: '1000' } } : '/recommend')
            }
            accessibilityHint={best ? `Compares your cards for a ${CATEGORY_LABELS[best]} purchase` : 'Opens the card recommendation tool'}
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </Animated.View>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.statLabel} numberOfLines={2}>
        {label}
      </Text>
      <Text style={[styles.statValue, color ? { color } : null]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { alignItems: 'center', gap: space.xl, marginTop: space.lg },
  item: { gap: space.md },
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    gap: space.md,
  },
  stats: { flexDirection: 'row', gap: space.sm },
  stat: { flex: 1, minWidth: 0, gap: 2 },
  statLabel: { ...type.caption, fontWeight: '500' },
  statValue: { fontSize: 17, fontWeight: '900', color: colors.ink, fontVariant: ['tabular-nums'] },
  actions: { flexDirection: 'row', gap: space.sm },
});
