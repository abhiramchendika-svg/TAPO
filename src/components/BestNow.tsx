import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { formatRupees } from '../lib/format';
import { quickReason, rankByRate, rateNow } from '../lib/rewards';
import { CATEGORIES, CATEGORY_LABELS, type Card, type Category, type Transaction } from '../lib/types';
import { colors, radius, space, type } from '../theme';
import { CATEGORY_ICON, Icon } from './Icon';
import { Text } from './Text';
import { Chip } from './ui';

/**
 * The quickest answer in the app: on the Wallet screen, tap what you're buying and the card to use
 * appears straight away, with no amount to type. Our interviews found habit wins at the counter, so
 * this has to be faster than reaching for the usual card.
 */
export function BestNow({ cards, txns }: { cards: Card[]; txns: Transaction[] }) {
  const [category, setCategory] = useState<Category | null>(null);
  const pick = useMemo(() => (category ? rankByRate(cards, category, txns) : null), [category, cards, txns]);
  const best = pick?.ranked[0];
  const nothingEarns = best ? rateNow(best) === 0 : false;

  return (
    <View style={styles.wrap}>
      <Text style={type.h2}>Paying now?</Text>
      <Text style={[type.small, { marginTop: 2 }]}>Tap what you’re buying to see which card to use.</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.bleed}
        contentContainerStyle={styles.chips}
        accessibilityRole="radiogroup"
        accessibilityLabel="What are you buying?"
      >
        {CATEGORIES.map((c) => (
          <Chip
            key={c}
            label={CATEGORY_LABELS[c]}
            icon={CATEGORY_ICON[c]}
            selected={category === c}
            onPress={() => setCategory(c)}
          />
        ))}
      </ScrollView>

      <View accessibilityLiveRegion="polite">
        {category && best ? (
          <Pressable
            onPress={() => router.push({ pathname: '/recommend', params: { category } })}
            accessibilityRole="button"
            accessibilityLabel={
              nothingEarns
                ? `None of your cards earns anything more on ${CATEGORY_LABELS[category]} this month. Opens the full comparison.`
                : `Use ${best.card.nickname}. ${quickReason(best, category)} Opens the full comparison.`
            }
            style={({ pressed }) => [styles.answer, pressed && { opacity: 0.85 }]}
          >
            <View style={[styles.swatch, { backgroundColor: best.card.color }]} />
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              {nothingEarns ? (
                <>
                  <Text style={[type.mono, { color: colors.warningText }]}>No card earns here right now</Text>
                  <Text style={type.small}>
                    None of your cards earns anything more on {CATEGORY_LABELS[category]} this month.
                  </Text>
                </>
              ) : (
                <>
                  <Text style={[type.mono, { color: colors.success }]}>Use this card</Text>
                  <Text style={type.h2} numberOfLines={2}>
                    {best.card.nickname}
                  </Text>
                  <Text style={type.small}>{quickReason(best, category)}</Text>
                  {pick?.switchAt ? (
                    <Text style={[type.small, { color: colors.warningText }]}>
                      For {formatRupees(pick.switchAt.amount)} or more, {pick.switchAt.card.nickname} earns more.
                    </Text>
                  ) : null}
                </>
              )}
              <Text style={[type.caption, { marginTop: space.xs }]}>Compare every card</Text>
            </View>
            <Icon name="arrowRight" color={colors.ink} size={20} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: space.lg },
  bleed: { marginHorizontal: -(space.lg + 4), marginTop: space.md },
  chips: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg + 4 },
  answer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginTop: space.md,
    padding: space.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  swatch: { width: 10, alignSelf: 'stretch', borderRadius: 4 },
});
