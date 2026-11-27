import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '../../components/Text';
import { CardTile, useCardWidth } from '../../components/CardTile';
import { Stage } from '../../components/Gallery';
import { CATEGORY_ICON } from '../../components/Icon';
import { Amount, DetailList, DetailRow, StatusBadge } from '../../components/payments';
import { NumberedHeading } from '../../components/Steps';
import { Button, Chip, ChipGroup, EmptyState, Field, Notice, Panel, Screen, SectionHeader, Title } from '../../components/ui';
import { formatPercent, formatRupees } from '../../lib/format';
import { explainWinner, quickReason, rankByRate, rankCards, rateNow } from '../../lib/rewards';
import { CATEGORIES, CATEGORY_LABELS, type Category } from '../../lib/types';
import { parseNumber, validateAmount } from '../../lib/validation';
import { useWallet } from '../../lib/wallet';
import { colors, fonts, radius, space, type } from '../../theme';

export default function RecommendScreen() {
  const { data } = useWallet();
  const [category, setCategory] = useState<Category | null>(null);
  const [amountText, setAmountText] = useState('');
  const [amountTouched, setAmountTouched] = useState(false);

  // Prefill from links: a category tapped on Wallet, or "Compare cards for this" on a purchase (with its amount).
  const params = useLocalSearchParams<{ category?: string; amount?: string }>();
  const paramKey = `${params.category ?? ''}|${params.amount ?? ''}`;
  const [seenParams, setSeenParams] = useState<string | null>(null);
  if (paramKey !== seenParams) {
    setSeenParams(paramKey);
    const pc = CATEGORIES.find((c) => c === params.category);
    if (pc) {
      setCategory(pc);
      setAmountText(params.amount && !validateAmount(params.amount) ? params.amount : '');
      setAmountTouched(false);
    }
  }

  const cardW = useCardWidth(300, 80);

  // The answer comes from the category alone; the amount is optional and only makes it exact.
  const amountEmpty = amountText.trim() === '';
  const amountProblem = amountEmpty ? null : validateAmount(amountText);
  const amount = !amountEmpty && !amountProblem ? parseNumber(amountText) : null;

  const quick = useMemo(
    () => (category ? rankByRate(data.cards, category, data.transactions) : null),
    [category, data.cards, data.transactions],
  );
  const exact = useMemo(
    () => (category && amount !== null ? rankCards(data.cards, category, amount, data.transactions) : null),
    [category, amount, data.cards, data.transactions],
  );

  if (data.cards.length === 0) {
    return (
      <Screen>
        <Title>Choose a card</Title>
        <EmptyState
          title="Add a card first"
          message="Recommendations compare the reward rules of cards in your wallet."
          action={<Button label="Add a card" onPress={() => router.push('/card/add')} />}
        />
      </Screen>
    );
  }

  const ranked = exact ?? quick?.ranked ?? [];
  const best = ranked[0];
  const next = ranked[1];
  const label = category ? CATEGORY_LABELS[category] : '';
  const nothingEarns = !exact && best ? rateNow(best) === 0 : false;
  const switchAt = !exact ? quick?.switchAt : undefined;

  let answer = '';
  if (best && category) {
    if (exact && amount !== null) answer = explainWinner(exact, amount);
    else if (nothingEarns) answer = `None of your cards earns anything more on ${label} this month.`;
    else {
      answer = quickReason(best, category);
      if (next && rateNow(next) === rateNow(best) && rateNow(next) > 0) {
        answer += ` ${next.card.nickname} pays the same rate, so either works.`;
      }
    }
  }

  return (
    <Screen>
      <Title kicker="Rewards guide" subtitle="Tap what you’re buying to see which card to use. Nothing is charged.">
        Choose a card
      </Title>

      <View style={{ height: space.md }} />
      <NumberedHeading n={1} title="What are you buying?" state={category ? 'done' : 'active'} />
      <ChipGroup label="Choose one">
        {CATEGORIES.map((c) => (
          <Chip
            key={c}
            label={CATEGORY_LABELS[c]}
            icon={CATEGORY_ICON[c]}
            selected={category === c}
            onPress={() => setCategory(c)}
          />
        ))}
      </ChipGroup>

      {category && best ? (
        <View accessibilityLiveRegion="polite">
          <Panel style={{ gap: space.md }}>
            <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
              <StatusBadge status="best" />
              <StatusBadge status="estimate" />
            </View>
            <View>
              <Text style={type.mono}>{nothingEarns ? 'No card earns here right now' : 'Use this card'}</Text>
              <Text style={type.title} accessibilityRole="header">
                {best.card.nickname}
              </Text>
              <Text style={type.small}>
                {best.card.issuer} · {best.card.network} •• {best.card.last4}
              </Text>
            </View>
            <Text style={type.body}>{answer}</Text>
            {switchAt ? (
              <View style={styles.switchNote}>
                <Text style={[type.small, { color: colors.warningText }]}>
                  For {formatRupees(switchAt.amount)} or more, {switchAt.card.nickname} earns more, because this card’s
                  monthly cap runs out. Add the amount below to check.
                </Text>
              </View>
            ) : null}
            <Stage caption={`${best.card.issuer}${best.card.isSample ? ' · sample' : ''} · •• ${best.card.last4}`}>
              <CardTile card={best.card} width={cardW} onPress={() => router.push(`/card/${best.card.id}`)} />
            </Stage>
          </Panel>
        </View>
      ) : null}

      <View style={{ height: space.xl }} />
      <NumberedHeading n={2} title="Amount (optional)" state={amount !== null ? 'done' : category ? 'active' : 'todo'} />
      <Field
        label="Amount in rupees"
        prefix="₹"
        placeholder="e.g. 2500"
        keyboardType="decimal-pad"
        inputMode="decimal"
        value={amountText}
        onChangeText={(t) => setAmountText(t.replace(/[^\d.,]/g, ''))}
        onBlur={() => setAmountTouched(true)}
        error={amountTouched ? amountProblem : null}
        hint="Add it for the exact reward, counting monthly caps. Up to ₹10,00,000."
        returnKeyType="done"
      />

      {category && best ? (
        <>
          {exact && amount !== null ? (
            <>
              <Text style={[type.mono, { marginBottom: space.sm }]}>Review</Text>
              <DetailList>
                <DetailRow label="Purchase" value={label} />
                <DetailRow label="Amount">
                  <Amount value={amount} size="md" />
                </DetailRow>
                <DetailRow label="Rate applied" value={formatPercent(best.ratePercent)} hint={best.reasons[0]} />
                {best.capRupees !== undefined && best.capRemaining !== undefined ? (
                  <DetailRow
                    label="Monthly cap left"
                    value={formatRupees(best.capRemaining, { decimals: true })}
                    hint={
                      best.capLimited
                        ? 'Reward limited by the cap this month'
                        : `of ${formatRupees(best.capRupees)} · based on this month’s spending`
                    }
                  />
                ) : null}
                <DetailRow label="Estimated reward" emphasis last>
                  <Amount value={best.rewardRupees} size="lg" kind="reward" decimals />
                </DetailRow>
              </DetailList>
            </>
          ) : null}
          <Text style={[type.caption, { fontWeight: '500', marginTop: space.sm }]}>
            An estimate from the reward rules in your wallet, not an issuer quote. TAPO doesn’t make the payment — pay
            with your card as usual.
          </Text>
          <Button
            label="View this card"
            variant="outline"
            iconRight="arrowRight"
            onPress={() => router.push(`/card/${best.card.id}`)}
            style={{ marginTop: space.md }}
          />

          {ranked.length > 1 ? (
            <>
              <SectionHeader title="How every card compares" />
              <Panel style={{ paddingVertical: space.xs }}>
                {ranked.map((e, i) => {
                  const detail = exact ? e.reasons.join(' ') : quickReason(e, category);
                  return (
                    <View
                      key={e.card.id}
                      style={[styles.rankRow, i === ranked.length - 1 && { borderBottomWidth: 0 }]}
                      accessible
                      accessibilityLabel={
                        exact
                          ? `Rank ${i + 1}: ${e.card.nickname}, ${formatPercent(e.ratePercent)}, estimated ${formatRupees(
                              e.rewardRupees,
                              { decimals: true },
                            )}. ${detail}`
                          : `Rank ${i + 1}: ${e.card.nickname}, pays ${formatPercent(rateNow(e))} now. ${detail}`
                      }
                    >
                      <View style={[styles.rankBadge, i === 0 && { backgroundColor: colors.successBg }]}>
                        <Text style={[styles.rankNum, { color: i === 0 ? colors.success : colors.textMuted }]}>
                          {String(i + 1).padStart(2, '0')}
                        </Text>
                      </View>
                      <View style={[styles.swatch, { backgroundColor: e.card.color }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[type.body, { fontWeight: '600' }]}>{e.card.nickname}</Text>
                        <Text style={type.small}>{detail}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', minWidth: 72 }}>
                        {exact ? (
                          <>
                            <Amount value={e.rewardRupees} size="sm" kind={i === 0 ? 'reward' : 'plain'} decimals />
                            <Text style={type.caption}>{formatPercent(e.ratePercent)}</Text>
                          </>
                        ) : (
                          <>
                            <Text style={[styles.rateNow, { color: i === 0 ? colors.success : colors.text }]}>
                              {formatPercent(rateNow(e))}
                            </Text>
                            <Text style={type.caption}>now</Text>
                          </>
                        )}
                      </View>
                    </View>
                  );
                })}
              </Panel>
            </>
          ) : null}

          <View style={{ marginTop: space.lg }}>
            <Notice title="How this is calculated">
              Without an amount, cards are ranked by the rate they pay on this category right now; a card whose
              monthly cap is used up pays nothing more until next month. With an amount, reward = amount × the
              card’s rate for this category (or its base rate if there’s no category rule), limited by what’s left of
              any monthly cap after this month’s purchases. Ties go to the higher headline rate, then alphabetical
              order. The rules are the ones saved in your wallet: sample rules unless you entered your own.
            </Notice>
            <Button
              label="How TAPO works"
              variant="ghost"
              size="sm"
              iconRight="arrowRight"
              onPress={() => router.push('/how-it-works')}
              style={{ marginTop: space.sm, alignSelf: 'center' }}
            />
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  rankNum: { fontFamily: fonts.body, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  rateNow: { fontFamily: fonts.body, fontSize: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
  rankBadge: {
    width: 34,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: { width: 8, height: 32, borderRadius: 3 },
  rankRow: {
    flexDirection: 'row',
    gap: space.md,
    alignItems: 'center',
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  switchNote: {
    backgroundColor: colors.warningBg,
    borderColor: colors.warningBorder,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
  },
});
